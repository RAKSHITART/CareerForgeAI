import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ApplicationSchema } from "@/lib/validations";
import { handleError, parseBody } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireAuthUser();
    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      include: { resumeVersion: { select: { id: true, versionName: true, targetRole: true, targetCompany: true } } },
      orderBy: { appliedDate: "desc" },
    });
    return NextResponse.json({ applications });
  } catch (error) {
    return handleError(error, "Failed to load applications");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, ApplicationSchema);
    if ("response" in body) return body.response;
    const d = body.data;

    if (d.resumeVersionId) {
      const own = await prisma.resumeVersion.findFirst({ where: { id: d.resumeVersionId, userId: user.id }, select: { id: true } });
      if (!own) return NextResponse.json({ error: "That resume version was not found" }, { status: 404 });
    }
    const application = await prisma.jobApplication.create({
      data: {
        userId: user.id, company: d.company, role: d.role, status: d.status,
        appliedDate: d.appliedDate || new Date().toISOString().slice(0, 10),
        resumeVersionId: d.resumeVersionId || null, interviewDate: d.interviewDate || null, followUpDate: d.followUpDate || null, notes: d.notes || null,
      },
      include: { resumeVersion: { select: { id: true, versionName: true, targetRole: true, targetCompany: true } } },
    });
    return NextResponse.json({ application });
  } catch (error) {
    return handleError(error, "Failed to save the application");
  }
}
