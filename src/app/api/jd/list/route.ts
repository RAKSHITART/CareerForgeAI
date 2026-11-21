import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuthUser();

    const jds = await prisma.jobDescription.findMany({
      where: { userId: user.id },
      include: {
        matches: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const parsed = jds.map((jd) => {
      const match = jd.matches[0];
      return {
        id: jd.id,
        companyName: jd.companyName,
        jobTitle: jd.jobTitle,
        location: jd.location,
        createdAt: jd.createdAt,
        overallScore: match ? match.overallScore : 0,
        requiredScore: match ? match.requiredSkillsScore : 0,
        preferredScore: match ? match.preferredSkillsScore : 0,
        missingCount: match ? JSON.parse(match.missingMandatorySkills || "[]").length : 0,
      };
    });

    return NextResponse.json({ jobDescriptions: parsed });
  } catch (error) {
    return handleError(error, "Failed to fetch job descriptions");
  }
}
