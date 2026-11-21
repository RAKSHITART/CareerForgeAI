import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError, safeJson } from "@/lib/api";

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const session = await prisma.interviewSession.findFirst({ where: { id: params.id, userId: user.id }, include: { questions: true } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const total = session.questions.length;
    const answered = session.questions.filter((q) => q.score !== null);

    // finishing twice returns the saved report instead of creating a duplicate
    if (session.status === "COMPLETED") {
      return NextResponse.json({
        success: true, alreadyCompleted: true,
        report: {
          sessionId: session.id, overallScore: session.overallScore ?? 0, technicalScore: session.technicalScore ?? 0,
          communicationScore: session.communicationScore ?? 0, knowledgeScore: session.knowledgeScore ?? 0,
          summaryFeedback: session.summaryFeedback ?? "", strongAreas: safeJson(session.strongAreas, []), weakAreas: safeJson(session.weakAreas, []),
          recommendedTopics: safeJson(session.recommendedTopics, []), answered: answered.length, total,
        },
      });
    }
    if (answered.length === 0) return NextResponse.json({ error: "Answer at least one question before finishing the interview." }, { status: 400 });

    // skipped questions count as 0: finishing after one great answer must not look like a great interview
    const all = session.questions;
    const overall = mean(all.map((q) => q.score ?? 0));
    const tech = mean(all.map((q) => q.technicalCorrectness ?? 0));
    const clarity = mean(all.map((q) => q.clarity ?? 0));
    const completeness = mean(all.map((q) => q.completeness ?? 0));

    const strong = new Set<string>(), weak = new Set<string>(), topics = new Set<string>();
    for (const q of all) {
      if (q.score === null) { weak.add(q.category); continue; }
      if (q.score >= 75) strong.add(q.category);
      else { weak.add(q.category); safeJson<string[]>(q.topicsToRevise, []).forEach((t) => topics.add(t)); }
    }

    const skipped = total - answered.length;
    const summary =
      (overall >= 80 ? "Strong performance: your answers covered the key points clearly."
        : overall >= 60 ? "Good start. Deepen answers with specifics, trade-offs and examples from your own work."
        : "There is room to grow. Review the topics below and practise answering in full sentences with an example.") +
      (skipped ? ` ${skipped} question(s) were skipped and counted as zero.` : "");

    await prisma.$transaction([
      prisma.interviewSession.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED", overallScore: overall, technicalScore: tech, communicationScore: clarity, knowledgeScore: completeness,
          summaryFeedback: summary, strongAreas: JSON.stringify([...strong]), weakAreas: JSON.stringify([...weak]), recommendedTopics: JSON.stringify([...topics].slice(0, 5)),
        },
      }),
      prisma.notification.create({
        data: { userId: user.id, title: "Mock interview completed", message: `You finished your ${session.targetRole} mock interview: ${overall}/100 (${answered.length} of ${total} answered).`, type: "PRACTICE_REMINDER", link: `/dashboard/interviews/${session.id}` },
      }),
    ]);

    return NextResponse.json({
      success: true,
      report: {
        sessionId: session.id, overallScore: overall, technicalScore: tech, communicationScore: clarity, knowledgeScore: completeness,
        summaryFeedback: summary, strongAreas: [...strong], weakAreas: [...weak], recommendedTopics: [...topics].slice(0, 5), answered: answered.length, total,
      },
    });
  } catch (error) {
    return handleError(error, "Failed to finish the interview");
  }
}
