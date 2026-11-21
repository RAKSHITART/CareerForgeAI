import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuthUser();

    const resumes = await prisma.resumeVersion.findMany({
      where: { userId: user.id },
      include: {
        jobDescription: {
          select: {
            companyName: true,
            jobTitle: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const parsed = resumes.map((r) => ({
      id: r.id,
      versionName: r.versionName,
      targetRole: r.targetRole,
      targetCompany: r.targetCompany,
      templateId: r.templateId,
      isPrimary: r.isPrimary,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      hasAudit: !!r.diffNotes,
    }));

    return NextResponse.json({ resumes: parsed });
  } catch (error) {
    return handleError(error, "Failed to fetch resumes");
  }
}
