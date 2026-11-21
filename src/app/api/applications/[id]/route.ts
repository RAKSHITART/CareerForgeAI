import { NextResponse } from "next/server";
import { ApplicationUpdateSchema } from "@/lib/validations";
import { handleError, parseBody } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, ApplicationUpdateSchema);
    if ("response" in body) return body.response;
    const d = body.data;

    const existing = await prisma.jobApplication.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (d.resumeVersionId) {
      const own = await prisma.resumeVersion.findFirst({ where: { id: d.resumeVersionId, userId: user.id }, select: { id: true } });
      if (!own) return NextResponse.json({ error: "That resume version was not found" }, { status: 404 });
    }
    const clean = (v: string | null | undefined, old: string | null) => (v === undefined ? old : v || null);
    const updated = await prisma.jobApplication.update({
      where: { id: params.id },
      data: {
        status: d.status ?? existing.status, company: d.company ?? existing.company, role: d.role ?? existing.role,
        interviewDate: clean(d.interviewDate, existing.interviewDate), followUpDate: clean(d.followUpDate, existing.followUpDate),
        notes: clean(d.notes, existing.notes), resumeVersionId: d.resumeVersionId === undefined ? existing.resumeVersionId : d.resumeVersionId || null,
      },
      include: { resumeVersion: { select: { id: true, versionName: true, targetRole: true, targetCompany: true } } },
    });
    return NextResponse.json({ application: updated });
  } catch (error) {
    return handleError(error, "Failed to update application");
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();

    await prisma.jobApplication.deleteMany({
      where: { id: params.id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to delete application");
  }
}
