import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();

    const session = await prisma.interviewSession.findFirst({
      where: {
        id: params.id,
        userId: user.id, // User data isolation
      },
      include: {
        questions: {
          orderBy: { questionIndex: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
    }

    const parsedQuestions = session.questions.map((q) => ({
      ...q,
      expectedKeyPoints: JSON.parse(q.expectedKeyPoints || "[]"),
      topicsToRevise: JSON.parse(q.topicsToRevise || "[]"),
    }));

    return NextResponse.json({
      session: {
        ...session,
        strongAreas: JSON.parse(session.strongAreas || "[]"),
        weakAreas: JSON.parse(session.weakAreas || "[]"),
        recommendedTopics: JSON.parse(session.recommendedTopics || "[]"),
        questions: parsedQuestions,
      },
    });
  } catch (error) {
    return handleError(error, "Failed to fetch interview details");
  }
}
