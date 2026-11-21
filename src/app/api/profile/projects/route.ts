import { NextResponse } from "next/server";
import { handleError, validationResponse } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ProjectItemSchema } from "@/lib/validations";

export async function GET() {
  try {
    const user = await requireAuthUser();
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) return NextResponse.json({ projects: [] });

    const projects = await prisma.project.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    const parsed = projects.map((p) => ({
      ...p,
      technologies: JSON.parse(p.technologies || "[]"),
      keyFeatures: JSON.parse(p.keyFeatures || "[]"),
      measurableResults: JSON.parse(p.measurableResults || "[]"),
    }));

    return NextResponse.json({ projects: parsed });
  } catch (error) {
    return handleError(error, "Failed to fetch projects");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = ProjectItemSchema.safeParse(body);

    if (!parsed.success) return validationResponse(parsed.error);

    const {
      title,
      description,
      problemStatement,
      technologies,
      candidateContribution,
      keyFeatures,
      measurableResults,
      githubUrl,
      liveDemoUrl,
      category,
      status,
    } = parsed.data;

    const project = await prisma.project.create({
      data: {
        profileId: profile.id,
        title,
        description,
        problemStatement,
        technologies: JSON.stringify(technologies),
        candidateContribution,
        keyFeatures: JSON.stringify(keyFeatures),
        measurableResults: JSON.stringify(measurableResults),
        githubUrl,
        liveDemoUrl,
        category,
        status,
      },
    });

    return NextResponse.json({
      project: {
        ...project,
        technologies,
        keyFeatures,
        measurableResults,
      },
    });
  } catch (error) {
    return handleError(error, "Failed to create project");
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const existing = await prisma.project.findFirst({
      where: { id, profile: { userId: user.id } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        problemStatement: data.problemStatement ?? existing.problemStatement,
        technologies: data.technologies ? JSON.stringify(data.technologies) : existing.technologies,
        candidateContribution: data.candidateContribution ?? existing.candidateContribution,
        keyFeatures: data.keyFeatures ? JSON.stringify(data.keyFeatures) : existing.keyFeatures,
        measurableResults: data.measurableResults ? JSON.stringify(data.measurableResults) : existing.measurableResults,
        githubUrl: data.githubUrl ?? existing.githubUrl,
        liveDemoUrl: data.liveDemoUrl ?? existing.liveDemoUrl,
        category: data.category ?? existing.category,
        status: data.status ?? existing.status,
      },
    });

    return NextResponse.json({
      project: {
        ...updated,
        technologies: JSON.parse(updated.technologies || "[]"),
        keyFeatures: JSON.parse(updated.keyFeatures || "[]"),
        measurableResults: JSON.parse(updated.measurableResults || "[]"),
      },
    });
  } catch (error) {
    return handleError(error, "Failed to update project");
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuthUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const existing = await prisma.project.findFirst({
      where: { id, profile: { userId: user.id } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to delete project");
  }
}
