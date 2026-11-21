import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuthUser();

    const sessions = await prisma.interviewSession.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return handleError(error, "Failed to fetch interview history");
  }
}
