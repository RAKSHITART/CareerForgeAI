import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/api";

/** Copy a resume version (for trying a different template or wording without losing the original). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const r = await prisma.resumeVersion.findFirst({ where: { id: params.id, userId: user.id } });
    if (!r) return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    const copy = await prisma.resumeVersion.create({
      data: {
        userId: user.id, jobDescriptionId: r.jobDescriptionId, versionName: `${r.versionName} (copy)`.slice(0, 120),
        targetRole: r.targetRole, targetCompany: r.targetCompany, templateId: r.templateId,
        snapshotProfileData: r.snapshotProfileData, tailoredContent: r.tailoredContent, diffNotes: r.diffNotes, isPrimary: false,
      },
    });
    return NextResponse.json({ success: true, resume: { id: copy.id, versionName: copy.versionName } });
  } catch (error) {
    return handleError(error, "Failed to duplicate the resume");
  }
}
