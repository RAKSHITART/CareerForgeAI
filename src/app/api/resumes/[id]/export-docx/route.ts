import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError, safeJson } from "@/lib/api";
import { generateResumeDocx } from "@/services/documents/docx-generator";
import { TailoredResumeContent } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const resume = await prisma.resumeVersion.findFirst({ where: { id: params.id, userId: user.id } });
    if (!resume) return NextResponse.json({ error: "Resume version not found" }, { status: 404 });

    const snapshot = safeJson<any>(resume.snapshotProfileData, {});
    const tailored = safeJson<TailoredResumeContent>(resume.tailoredContent, {} as TailoredResumeContent);
    if (!snapshot.fullName || !tailored.prioritizedSkills) return NextResponse.json({ error: "This resume is missing data and cannot be exported" }, { status: 422 });

    let photo: { data: Buffer; type: "jpg" | "png" } | null = null;
    const m = tailored.style?.includePhoto && typeof snapshot.photoUrl === "string" ? snapshot.photoUrl.match(/^data:image\/(jpeg|png);base64,(.+)$/) : null;
    if (m) photo = { data: Buffer.from(m[2], "base64"), type: m[1] === "png" ? "png" : "jpg" };

    const buf = await generateResumeDocx(snapshot, tailored, { templateId: resume.templateId, photo });
    const name = `${resume.targetCompany}_${resume.targetRole}_Resume.docx`.replace(/[^a-zA-Z0-9_\-.]/g, "_").replace(/_+/g, "_");
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Content-Length": buf.length.toString(),
      },
    });
  } catch (error) {
    return handleError(error, "Failed to export the Word document");
  }
}
