import { NextResponse } from "next/server";
import { handleError, validationResponse } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ExperienceItemSchema } from "@/lib/validations";

export async function GET() {
  try {
    const user = await requireAuthUser();
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ workExperience: [] });

    const experiences = await prisma.workExperience.findMany({
      where: { profileId: profile.id },
      orderBy: { startDate: "desc" },
    });

    const parsed = experiences.map((exp) => ({
      ...exp,
      responsibilities: JSON.parse(exp.responsibilities || "[]"),
      achievements: JSON.parse(exp.achievements || "[]"),
      technologies: JSON.parse(exp.technologies || "[]"),
    }));

    return NextResponse.json({ workExperience: parsed });
  } catch (error) {
    return handleError(error, "Failed to fetch work experience");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await req.json();
    const parsed = ExperienceItemSchema.safeParse(body);
    if (!parsed.success) return validationResponse(parsed.error);

    const {
      company,
      position,
      employmentType,
      startDate,
      endDate,
      isCurrent,
      responsibilities,
      achievements,
      technologies,
    } = parsed.data;

    const exp = await prisma.workExperience.create({
      data: {
        profileId: profile.id,
        company,
        position,
        employmentType,
        startDate,
        endDate: isCurrent ? null : endDate,
        isCurrent,
        responsibilities: JSON.stringify(responsibilities),
        achievements: JSON.stringify(achievements),
        technologies: JSON.stringify(technologies),
      },
    });

    return NextResponse.json({
      workExperience: {
        ...exp,
        responsibilities,
        achievements,
        technologies,
      },
    });
  } catch (error) {
    return handleError(error, "Failed to add work experience");
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.workExperience.deleteMany({
      where: { id, profile: { userId: user.id } },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to delete experience");
  }
}
