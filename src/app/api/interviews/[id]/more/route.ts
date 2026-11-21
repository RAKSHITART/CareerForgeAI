import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError, parseBody, safeJson } from "@/lib/api";
import { generateInterviewQuestions } from "@/services/ai/interview-engine";

const MoreSchema = z.object({ count: z.number().int().min(1).max(5).default(3) });
const MAX_QUESTIONS = 20;

/** "Keep going": adds more questions to a running interview, never repeating one already asked. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const body = await parseBody(req, MoreSchema);
    if ("response" in body) return body.response;

    const session = await prisma.interviewSession.findFirst({ where: { id: params.id, userId: user.id }, include: { questions: { orderBy: { questionIndex: "asc" } } } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "COMPLETED") return NextResponse.json({ error: "This interview is finished. Start a new one." }, { status: 409 });
    if (session.questions.length >= MAX_QUESTIONS) return NextResponse.json({ error: `An interview can have at most ${MAX_QUESTIONS} questions.` }, { status: 400 });

    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id }, include: { skills: true, projects: true } });
    let jdSkills: string[] = [];
    if (session.jobDescriptionId) {
      const jd = await prisma.jobDescription.findFirst({ where: { id: session.jobDescriptionId, userId: user.id } });
      const ex = safeJson<any>(jd?.extractedData, {});
      jdSkills = [...(ex.requiredTechnicalSkills || []), ...(ex.preferredTechnicalSkills || [])];
    }

    const fresh = generateInterviewQuestions(
      session.targetRole, session.targetCompany || "", session.interviewType, session.difficulty as any,
      (profile?.skills || []).filter((s) => !["Not familiar", "Just started"].includes(s.proficiencyLevel)).map((s) => s.name),
      {
        jdSkills, count: Math.min(body.data.count, MAX_QUESTIONS - session.questions.length), startIndex: session.questions.length,
        excludeTexts: session.questions.map((q) => q.questionText),
        projects: (profile?.projects || []).map((p) => ({ title: p.title, technologies: safeJson<string[]>(p.technologies, []) })),
      }
    );
    const existing = new Set(session.questions.map((q) => q.questionText));
    const toAdd = fresh.filter((q) => !existing.has(q.questionText));
    if (toAdd.length === 0) return NextResponse.json({ error: "I have run out of new questions for this role. Finish the interview to see your report.", exhausted: true }, { status: 200 });

    const base = session.questions.length;
    for (let i = 0; i < toAdd.length; i++) {
      const q = toAdd[i];
      await prisma.interviewQuestion.create({ data: { sessionId: session.id, questionIndex: base + i + 1, questionText: q.questionText, category: q.category, difficulty: q.difficulty, expectedKeyPoints: JSON.stringify(q.expectedKeyPoints) } });
    }
    const questions = await prisma.interviewQuestion.findMany({ where: { sessionId: session.id }, orderBy: { questionIndex: "asc" } });
    return NextResponse.json({ success: true, added: toAdd.length, questions: questions.map((q) => ({ ...q, expectedKeyPoints: safeJson(q.expectedKeyPoints, []), topicsToRevise: safeJson(q.topicsToRevise, []) })) });
  } catch (error) {
    return handleError(error, "Could not add more questions");
  }
}
