import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SkillItemSchema, SkillUpdateSchema } from "@/lib/validations";
import { handleError, parseBody } from "@/lib/api";
import { canonicalKey } from "@/lib/skills-catalog";

async function ownProfileId(userId: string) {
  return (await prisma.candidateProfile.findUnique({ where: { userId }, select: { id: true } }))?.id || null;
}

export async function GET() {
  try {
    const user = await requireAuthUser();
    const profileId = await ownProfileId(user.id);
    if (!profileId) return NextResponse.json({ skills: [] });
    const skills = await prisma.candidateSkill.findMany({ where: { profileId }, include: { evidence: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ skills });
  } catch (error) {
    return handleError(error, "Failed to load skills");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const profileId = await ownProfileId(user.id);
    if (!profileId) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    const body = await parseBody(req, SkillItemSchema);
    if ("response" in body) return body.response;
    const d = body.data;

    const dup = (await prisma.candidateSkill.findMany({ where: { profileId }, select: { id: true, name: true } }))
      .find((s) => canonicalKey(s.name) === canonicalKey(d.name));
    if (dup) return NextResponse.json({ error: `${dup.name} is already in your skills. Edit it instead.`, fieldErrors: { name: "Already added" } }, { status: 409 });

    const skill = await prisma.candidateSkill.create({
      data: {
        profileId, name: d.name, category: d.category!, proficiencyLevel: d.proficiencyLevel,
        usedInProject: d.usedInProject, usedAcademically: d.usedAcademically, usedProfessionally: d.usedProfessionally,
        lastUsedDate: d.lastUsedDate || null, practicalExperienceNotes: d.practicalExperienceNotes || null,
      },
      include: { evidence: true },
    });
    return NextResponse.json({ skill });
  } catch (error) {
    return handleError(error, "Failed to add skill");
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuthUser();
    let raw: any;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
    const id = typeof raw?.id === "string" ? raw.id : "";
    if (!id) return NextResponse.json({ error: "Skill id is required" }, { status: 400 });

    const existing = await prisma.candidateSkill.findFirst({ where: { id, profile: { userId: user.id } } });
    if (!existing) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

    const { id: _ignore, ...rest } = raw;
    const parsed = SkillUpdateSchema.safeParse(rest);
    if (!parsed.success) {
      const m = parsed.error.issues[0];
      return NextResponse.json({ error: `${m.path.join(".") || "skill"}: ${m.message}` }, { status: 400 });
    }
    const d: any = parsed.data;

    if (d.name && canonicalKey(d.name) !== canonicalKey(existing.name)) {
      const others = await prisma.candidateSkill.findMany({ where: { profileId: existing.profileId, NOT: { id } }, select: { name: true } });
      if (others.some((s) => canonicalKey(s.name) === canonicalKey(d.name))) return NextResponse.json({ error: `${d.name} is already in your skills.` }, { status: 409 });
    }

    const data: Record<string, any> = {};
    for (const k of ["name", "category", "proficiencyLevel", "usedInProject", "usedAcademically", "usedProfessionally"]) if (d[k] !== undefined) data[k] = d[k];
    // empty string / null clears these fields instead of silently keeping the old value
    if ("lastUsedDate" in d) data.lastUsedDate = d.lastUsedDate || null;
    if ("practicalExperienceNotes" in d) data.practicalExperienceNotes = d.practicalExperienceNotes || null;

    const skill = await prisma.candidateSkill.update({ where: { id }, data, include: { evidence: true } });
    return NextResponse.json({ skill });
  } catch (error) {
    return handleError(error, "Failed to update skill");
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuthUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Skill id is required" }, { status: 400 });
    const r = await prisma.candidateSkill.deleteMany({ where: { id, profile: { userId: user.id } } });
    if (r.count === 0) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to delete skill");
  }
}
