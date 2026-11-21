import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { EvaluateAnswerSchema } from "@/lib/validations";
import { handleError, parseBody, safeJson, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { evaluateCandidateAnswer } from "@/services/ai/answer-evaluator";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const rl = rateLimit(`eval:${user.id}`, 80, 60 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const body = await parseBody(req, EvaluateAnswerSchema);
    if ("response" in body) return body.response;
    const { questionId, userResponseText, isVoiceResponse } = body.data;

    const session = await prisma.interviewSession.findFirst({ where: { id: params.id, userId: user.id } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "COMPLETED") return NextResponse.json({ error: "This interview is already finished. Start a new one to practise again." }, { status: 409 });

    const question = await prisma.interviewQuestion.findFirst({ where: { id: questionId, sessionId: session.id } });
    if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    const result = await evaluateCandidateAnswer(
      question.questionText, safeJson<string[]>(question.expectedKeyPoints, []), userResponseText, session.targetRole, session.difficulty, question.category
    );

    const updated = await prisma.interviewQuestion.update({
      where: { id: question.id },
      data: {
        userResponseText, isVoiceResponse, evaluatedAt: new Date(),
        score: result.score, technicalCorrectness: result.technicalCorrectness, clarity: result.clarity, completeness: result.completeness,
        feedbackWhatWasCorrect: result.feedbackWhatWasCorrect, feedbackWhatWasMissing: result.feedbackWhatWasMissing,
        feedbackWhatWasIncorrect: result.feedbackWhatWasIncorrect, betterAnswerStructure: result.betterAnswerStructure,
        suggestedAnswer: result.suggestedAnswer, topicsToRevise: JSON.stringify(result.topicsToRevise), followUpQuestion: result.followUpQuestion,
      },
    });
    return NextResponse.json({ success: true, evaluation: { ...result, questionId: updated.id } });
  } catch (error) {
    return handleError(error, "Evaluation failed");
  }
}
