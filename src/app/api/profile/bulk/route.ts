import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { BulkProfileSchema } from "@/lib/validations";
import { handleError, parseBody } from "@/lib/api";
import { canonicalKey } from "@/lib/skills-catalog";

/**
 * Saves the whole onboarding wizard atomically. Validation runs first; nothing is written unless
 * everything is valid. Education, projects, experience and certificates are replaced, and skills are
 * matched by canonical name so edits keep their saved evidence and nothing is duplicated.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, BulkProfileSchema);
    if ("response" in body) return body.response;
    const { profile, education, skills, projects, workExperience, certifications } = body.data;

    // duplicate skills inside the submitted list
    const seen = new Set<string>();
    for (const s of skills) {
      const k = canonicalKey(s.name);
      if (seen.has(k)) return NextResponse.json({ error: `"${s.name}" is listed twice. Remove the duplicate.` }, { status: 400 });
      seen.add(k);
    }

    await prisma.$transaction(async (tx) => {
      const p = await tx.candidateProfile.upsert({
        where: { userId: user.id },
        update: profile,
        create: { ...profile, userId: user.id, fullName: profile.fullName, email: profile.email },
      });

      await tx.education.deleteMany({ where: { profileId: p.id } });
      for (const e of education) await tx.education.create({ data: { ...e, profileId: p.id } });

      await tx.certification.deleteMany({ where: { profileId: p.id } });
      for (const c of certifications) await tx.certification.create({ data: { ...c, profileId: p.id } });

      await tx.project.deleteMany({ where: { profileId: p.id } });
      for (const pr of projects) {
        await tx.project.create({
          data: {
            profileId: p.id, title: pr.title, description: pr.description, problemStatement: pr.problemStatement || null,
            technologies: JSON.stringify(pr.technologies), candidateContribution: pr.candidateContribution,
            keyFeatures: JSON.stringify(pr.keyFeatures), measurableResults: JSON.stringify(pr.measurableResults),
            githubUrl: pr.githubUrl || null, liveDemoUrl: pr.liveDemoUrl || null, category: pr.category, status: pr.status,
          },
        });
      }

      await tx.workExperience.deleteMany({ where: { profileId: p.id } });
      for (const w of workExperience) {
        await tx.workExperience.create({
          data: {
            profileId: p.id, company: w.company, position: w.position, employmentType: w.employmentType, startDate: w.startDate,
            endDate: w.isCurrent ? null : w.endDate || null, isCurrent: w.isCurrent,
            responsibilities: JSON.stringify(w.responsibilities), achievements: JSON.stringify(w.achievements), technologies: JSON.stringify(w.technologies),
          },
        });
      }

      // skills: update in place by canonical key, create new, remove the rest
      const existing = await tx.candidateSkill.findMany({ where: { profileId: p.id } });
      const byKey = new Map(existing.map((s) => [canonicalKey(s.name), s]));
      for (const s of skills) {
        const row = {
          name: s.name, category: s.category!, proficiencyLevel: s.proficiencyLevel,
          usedInProject: s.usedInProject, usedAcademically: s.usedAcademically, usedProfessionally: s.usedProfessionally,
          lastUsedDate: s.lastUsedDate || null, practicalExperienceNotes: s.practicalExperienceNotes || null,
        };
        const hit = byKey.get(canonicalKey(s.name));
        if (hit) { await tx.candidateSkill.update({ where: { id: hit.id }, data: row }); byKey.delete(canonicalKey(s.name)); }
        else await tx.candidateSkill.create({ data: { ...row, profileId: p.id } });
      }
      const stale = [...byKey.values()].map((s) => s.id);
      if (stale.length) await tx.candidateSkill.deleteMany({ where: { id: { in: stale } } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Could not save your profile. Nothing was changed.");
  }
}
