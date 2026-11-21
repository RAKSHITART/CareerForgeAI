import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError, parseBody, safeJson } from "@/lib/api";
import { canonicalKey, canonicalName, categoryFor } from "@/lib/skills-catalog";
import { PROFICIENCY_LEVELS, TailoredResumeContent, levelRank } from "@/lib/types";
import { computeJdSuggestions } from "@/services/ai/jd-gaps";

const AddSkillSchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: z.enum(PROFICIENCY_LEVELS.filter((l) => l !== "Not familiar") as [string, ...string[]]),
  note: z.string().trim().max(500).optional().nullable(),
});

/**
 * "I have this skill": the user confirms a skill the job asks for. It is saved to their profile at the
 * level THEY choose (so it stays verified and reusable) and added to this resume. Nothing here is automatic.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, AddSkillSchema);
    if ("response" in body) return body.response;
    const { level, note } = body.data;
    const name = canonicalName(body.data.name);
    const category = categoryFor(name, "Other");

    const resume = await prisma.resumeVersion.findFirst({ where: { id: params.id, userId: user.id } });
    if (!resume) return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // 1. profile
    const mine = await prisma.candidateSkill.findMany({ where: { profileId: profile.id } });
    const existing = mine.find((s) => canonicalKey(s.name) === canonicalKey(name));
    if (existing) {
      await prisma.candidateSkill.update({ where: { id: existing.id }, data: { proficiencyLevel: level, ...(note ? { practicalExperienceNotes: note } : {}) } });
    } else {
      await prisma.candidateSkill.create({ data: { profileId: profile.id, name, category, proficiencyLevel: level, usedInProject: false, usedAcademically: false, usedProfessionally: false, practicalExperienceNotes: note || null } });
    }

    // 2. this resume's snapshot (what the server audit checks against) and content
    const snap = safeJson<any>(resume.snapshotProfileData, {});
    snap.skills = (snap.skills || []).filter((s: any) => canonicalKey(s.name) !== canonicalKey(name));
    snap.skills.push({ name, category, proficiencyLevel: level, usedInProject: false, usedAcademically: false, usedProfessionally: false, evidenceNotes: note || null });

    const content = safeJson<TailoredResumeContent>(resume.tailoredContent, {} as TailoredResumeContent);
    content.prioritizedSkills = (content.prioritizedSkills || []).map((c) => ({ ...c, skills: c.skills.filter((s) => canonicalKey(s.name) !== canonicalKey(name)) })).filter((c) => c.skills.length);
    content.learningSkills = (content.learningSkills || []).filter((x) => canonicalKey(x) !== canonicalKey(name));
    if (level === "Just started") {
      content.learningSkills.push(name);
    } else {
      const cat = content.prioritizedSkills.find((c) => c.category === category);
      const row = { name, level: level as any, status: "verified" as const };
      if (cat) cat.skills.push(row); else content.prioritizedSkills.push({ category, skills: [row] });
    }
    const audit = content.antiFabricationAudit || ({} as TailoredResumeContent["antiFabricationAudit"]);
    const warnings = (audit.warnings || []).filter((w) => !w.startsWith(`You added ${name}`));
    if (levelRank(level) >= levelRank("Intermediate") && !note) warnings.push(`You added ${name} yourself as ${level} with no supporting note. Be ready to discuss it in an interview.`);
    else if (!note) warnings.push(`You added ${name} yourself. Be ready to discuss it in an interview.`);
    content.antiFabricationAudit = { ...audit, checkedAt: new Date().toISOString(), unverifiedSkillsRemoved: audit.unverifiedSkillsRemoved || [], exaggerationsRejected: audit.exaggerationsRejected || [], warnings, verdict: warnings.length || (audit.exaggerationsRejected || []).length ? "WARNINGS_REVIEWED" : "STRICTLY_VERIFIED" };

    await prisma.resumeVersion.update({ where: { id: resume.id }, data: { snapshotProfileData: JSON.stringify(snap), tailoredContent: JSON.stringify(content) } });

    let suggestions: unknown[] = [];
    if (resume.jobDescriptionId) {
      const jd = await prisma.jobDescription.findFirst({ where: { id: resume.jobDescriptionId, userId: user.id } });
      if (jd) suggestions = computeJdSuggestions(safeJson(jd.extractedData, {}), content, snap);
    }
    return NextResponse.json({ success: true, tailoredContent: content, suggestions });
  } catch (error) {
    return handleError(error, "Could not add that skill");
  }
}
