import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { VerifySkillSchema } from "@/lib/validations";
import { handleError, parseBody } from "@/lib/api";
import { canonicalKey, canonicalName, categoryFor } from "@/lib/skills-catalog";
import { levelRank } from "@/lib/types";

/**
 * Adds a skill learned through a roadmap to the profile, but only as much as the work done supports:
 *   < 30% complete  -> refused
 *   30-59%          -> "Just started" at most
 *   60-99%          -> "Beginner" at most
 *   100%            -> "Basic working knowledge", or "Intermediate" when you describe what you built
 * Evidence is only recorded when you write it. "Used in project" is never assumed.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, VerifySkillSchema);
    if ("response" in body) return body.response;
    const { skillName, confirmedProficiency, usedInProject, evidenceNote } = body.data;
    const name = canonicalName(skillName);

    const plans = await prisma.learningPlan.findMany({ where: { userId: user.id } });
    const plan = plans.find((p) => canonicalKey(p.skillName) === canonicalKey(name));
    if (!plan) return NextResponse.json({ error: `Start a roadmap for ${name} first. Skills are confirmed from the work you complete.` }, { status: 400 });

    const progress = plan.progressPercent;
    if (progress < 30) {
      return NextResponse.json({ error: `Complete at least 30% of the ${name} roadmap before adding it to your profile (you are at ${progress}%).` }, { status: 400 });
    }
    const note = evidenceNote?.trim() || "";
    if (usedInProject && note.length < 20) {
      return NextResponse.json({ error: "To mark this as used in a project, describe the project in at least 20 characters.", fieldErrors: { evidenceNote: "Describe what you built" } }, { status: 400 });
    }

    const cap = progress < 60 ? "Just started" : progress < 100 ? "Beginner" : note.length >= 20 ? "Intermediate" : "Basic working knowledge";
    const applied = levelRank(confirmedProficiency) > levelRank(cap) ? cap : confirmedProficiency;

    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const mine = await prisma.candidateSkill.findMany({ where: { profileId: profile.id } });
    const existing = mine.find((s) => canonicalKey(s.name) === canonicalKey(name));

    let skillId: string;
    let finalLevel = applied;
    if (existing) {
      finalLevel = levelRank(existing.proficiencyLevel) >= levelRank(applied) ? existing.proficiencyLevel : applied; // never lower
      await prisma.candidateSkill.update({
        where: { id: existing.id },
        data: { proficiencyLevel: finalLevel, ...(usedInProject ? { usedInProject: true } : {}), lastUsedDate: new Date().toISOString().slice(0, 10) },
      });
      skillId = existing.id;
    } else {
      const created = await prisma.candidateSkill.create({
        data: {
          profileId: profile.id, name, category: categoryFor(name, "Other"), proficiencyLevel: applied,
          usedInProject: !!usedInProject, usedAcademically: false, usedProfessionally: false,
          lastUsedDate: new Date().toISOString().slice(0, 10),
          practicalExperienceNotes: note || null,
        },
      });
      skillId = created.id;
    }

    if (note) {
      await prisma.skillEvidence.create({
        data: { skillId, evidenceType: usedInProject ? "PROJECT" : "EDUCATION", title: `Skill Growth roadmap (${progress}% complete)`, description: note },
      });
    }

    await prisma.notification.create({
      data: {
        userId: user.id, type: "LEARNING", title: `${name} added to your profile`,
        message: `Recorded as "${finalLevel}" based on ${progress}% of the roadmap${note ? " and your note" : ""}.`,
      },
    });

    const capped = applied !== confirmedProficiency;
    return NextResponse.json({
      success: true, appliedLevel: finalLevel, capped,
      message: capped ? `Added as "${finalLevel}". That is the highest level your roadmap progress supports. Finish more of it, or build and describe a project, to go higher.` : `Added as "${finalLevel}".`,
    });
  } catch (error) {
    return handleError(error, "Could not add the skill to your profile");
  }
}
