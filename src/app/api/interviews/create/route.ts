import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { StartInterviewSchema } from "@/lib/validations";
import { generateInterviewQuestions } from "@/services/ai/interview-engine";

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();

    const parsed = StartInterviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { jobDescriptionId, resumeVersionId, targetRole, targetCompany, interviewType, difficulty, mode, questionCount } = parsed.data;

    // Fetch candidate skills
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      include: { skills: true, projects: true },
    });

    // ownership: linked records must belong to the caller
    let jdSkills: string[] = [];
    if (jobDescriptionId) {
      const jd = await prisma.jobDescription.findFirst({ where: { id: jobDescriptionId, userId: user.id } });
      if (!jd) return NextResponse.json({ error: "Job description not found" }, { status: 404 });
      try { const ex = JSON.parse(jd.extractedData || "{}"); jdSkills = [...(ex.requiredTechnicalSkills || []), ...(ex.preferredTechnicalSkills || [])]; } catch { /* ignore */ }
    }
    if (resumeVersionId) {
      const rv = await prisma.resumeVersion.findFirst({ where: { id: resumeVersionId, userId: user.id } });
      if (!rv) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const candidateSkillNames = (profile?.skills || []).filter((s) => !["Not familiar", "Just started"].includes(s.proficiencyLevel)).map((s) => s.name);
    const projectCtx = (profile?.projects || []).map((p) => {
      let techs: string[] = [];
      try { techs = JSON.parse(p.technologies); } catch { /* ignore */ }
      return { title: p.title, technologies: techs };
    });

    // Generate questions
    const generatedQuestions = generateInterviewQuestions(
      targetRole,
      targetCompany || "Technology Company",
      interviewType,
      difficulty as any,
      candidateSkillNames,
      { jdSkills, projects: projectCtx, count: questionCount }
    );

    // Create session and questions
    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        jobDescriptionId: jobDescriptionId || null,
        resumeVersionId: resumeVersionId || null,
        targetRole,
        targetCompany: targetCompany || "Tech Company",
        interviewType,
        difficulty,
        mode,
        status: "IN_PROGRESS",
        questions: {
          create: generatedQuestions.map((q) => ({
            questionIndex: q.questionIndex,
            questionText: q.questionText,
            category: q.category,
            difficulty: q.difficulty,
            expectedKeyPoints: JSON.stringify(q.expectedKeyPoints),
          })),
        },
      },
      include: {
        questions: {
          orderBy: { questionIndex: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      session,
    });
  } catch (error: any) {
    console.error("Interview creation error:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to initialize interview studio" }, { status: 500 });
  }
}
