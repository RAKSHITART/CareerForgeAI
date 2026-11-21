import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UpdateResumeSchema } from "@/lib/validations";
import { handleError, parseBody, safeJson } from "@/lib/api";
import { auditTailoredContent } from "@/services/ai/resume-tailor";
import { computeJdSuggestions } from "@/services/ai/jd-gaps";
import { TailoredResumeContent } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const resume = await prisma.resumeVersion.findFirst({ where: { id: params.id, userId: user.id } });
    if (!resume) return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    // skills the target job asks for that are not on the resume yet (offered to the user, never auto-added)
    let suggestions: unknown[] = [];
    if (resume.jobDescriptionId) {
      const jd = await prisma.jobDescription.findFirst({ where: { id: resume.jobDescriptionId, userId: user.id } });
      if (jd) suggestions = computeJdSuggestions(safeJson(jd.extractedData, {}), safeJson(resume.tailoredContent, {} as any), safeJson(resume.snapshotProfileData, {}));
    }
    return NextResponse.json({
      suggestions,
      resume: {
        id: resume.id, versionName: resume.versionName, targetRole: resume.targetRole, targetCompany: resume.targetCompany,
        templateId: resume.templateId, isPrimary: resume.isPrimary,
        snapshotProfileData: safeJson(resume.snapshotProfileData, {}),
        tailoredContent: safeJson(resume.tailoredContent, {}),
        diffNotes: safeJson(resume.diffNotes, {}),
        createdAt: resume.createdAt, updatedAt: resume.updatedAt,
      },
    });
  } catch (error) {
    return handleError(error, "Failed to load the resume");
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, UpdateResumeSchema);
    if ("response" in body) return body.response;
    const { versionName, templateId, isPrimary, tailoredContent, photoUrl } = body.data;

    const existing = await prisma.resumeVersion.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Resume version not found" }, { status: 404 });

    const data: Record<string, any> = {};
    if (versionName !== undefined) data.versionName = versionName;
    if (templateId !== undefined) data.templateId = templateId;

    if (photoUrl !== undefined) {
      const snap = safeJson<Record<string, unknown>>(existing.snapshotProfileData, {});
      snap.photoUrl = photoUrl || null;
      data.snapshotProfileData = JSON.stringify(snap);
    }

    let audited: TailoredResumeContent | null = null;
    if (tailoredContent !== undefined) {
      const t = tailoredContent as any;
      if (!Array.isArray(t.prioritizedSkills) || !Array.isArray(t.tailoredProjects) || !Array.isArray(t.tailoredExperience) || typeof t.professionalSummary !== "object") {
        return NextResponse.json({ error: "Resume content is malformed" }, { status: 400 });
      }
      if (JSON.stringify(t).length > 500_000) return NextResponse.json({ error: "Resume content is too large" }, { status: 413 });
      // the server re-checks every skill against the verified profile; the client cannot vouch for itself
      const snapshot = safeJson<{ skills?: { name: string; proficiencyLevel: string }[] }>(existing.snapshotProfileData, {});
      audited = auditTailoredContent(t as TailoredResumeContent, snapshot.skills || []);
      data.tailoredContent = JSON.stringify(audited);
    }

    const [resume] = await prisma.$transaction([
      prisma.resumeVersion.update({ where: { id: params.id }, data }),
      ...(isPrimary === true ? [prisma.resumeVersion.updateMany({ where: { userId: user.id, NOT: { id: params.id } }, data: { isPrimary: false } })] : []),
      ...(isPrimary !== undefined ? [prisma.resumeVersion.update({ where: { id: params.id }, data: { isPrimary } })] : []),
    ]);

    return NextResponse.json({ success: true, resume: { id: resume.id, versionName: resume.versionName }, audit: audited?.antiFabricationAudit ?? null, tailoredContent: audited });
  } catch (error) {
    return handleError(error, "Failed to save the resume");
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const r = await prisma.resumeVersion.deleteMany({ where: { id: params.id, userId: user.id } });
    if (r.count === 0) return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to delete the resume");
  }
}
