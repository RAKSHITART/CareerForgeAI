import { NextResponse } from "next/server";
import { handleError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuthUser();

    const [
      totalResumes,
      totalJDs,
      totalApplications,
      interviewSessions,
      jdMatches,
      learningPlans,
      profile,
    ] = await Promise.all([
      prisma.resumeVersion.count({ where: { userId: user.id } }),
      prisma.jobDescription.count({ where: { userId: user.id } }),
      prisma.jobApplication.count({ where: { userId: user.id } }),
      prisma.interviewSession.findMany({
        where: { userId: user.id, status: "COMPLETED" },
        orderBy: { createdAt: "asc" },
      }),
      prisma.jDMatch.findMany({
        where: { userId: user.id },
        select: { overallScore: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.learningPlan.findMany({
        where: { userId: user.id },
      }),
      prisma.candidateProfile.findUnique({
        where: { userId: user.id },
        include: {
          skills: true,
          projects: true,
          education: true,
          workExperience: true,
        },
      }),
    ]);

    // Average JD compatibility
    const avgJDCompatibility =
      jdMatches.length > 0
        ? Math.round(jdMatches.reduce((acc, m) => acc + m.overallScore, 0) / jdMatches.length)
        : 0;

    // Interview metrics
    const completedInterviews = interviewSessions.filter((s) => s.overallScore !== null);
    const avgInterviewScore =
      completedInterviews.length > 0
        ? Math.round(
            completedInterviews.reduce((acc, s) => acc + (s.overallScore || 0), 0) / completedInterviews.length
          )
        : 0;

    const bestInterviewScore =
      completedInterviews.length > 0
        ? Math.max(...completedInterviews.map((s) => s.overallScore || 0))
        : 0;

    // Skill metrics
    const skillsLearning = learningPlans.filter((p) => p.status === "IN_PROGRESS").length;
    const skillsCompleted = learningPlans.filter((p) => p.status === "COMPLETED").length;

    // Chart: Interview Performance Over Time
    const interviewTrends = completedInterviews.map((s, idx) => ({
      attempt: `Session ${idx + 1}`,
      date: new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      overall: s.overallScore || 0,
      technical: s.technicalScore || 0,
      communication: s.communicationScore || 0,
      knowledge: s.knowledgeScore || 0,
    }));

    // Chart: JD Match Trends
    const jdMatchTrends = jdMatches.map((m, idx) => ({
      analysis: `JD ${idx + 1}`,
      date: new Date(m.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      matchScore: m.overallScore,
    }));

    // Skill Proficiency Breakdown
    const proficiencyDistribution: Record<string, number> = {
      Expert: 0,
      Advanced: 0,
      Intermediate: 0,
      "Basic working knowledge": 0,
      Beginner: 0,
      "Just started": 0,
    };

    profile?.skills.forEach((s) => {
      if (proficiencyDistribution[s.proficiencyLevel] !== undefined) {
        proficiencyDistribution[s.proficiencyLevel]++;
      }
    });

    const skillProgressionChart = Object.entries(proficiencyDistribution).map(([level, count]) => ({
      level,
      count,
    }));

    // Career Readiness Calculation (Heuristic estimate)
    const profileCompleteness =
      ((profile?.fullName ? 20 : 0) +
        (profile?.skills.length ? Math.min(25, profile.skills.length * 5) : 0) +
        (profile?.projects.length ? Math.min(25, profile.projects.length * 10) : 0) +
        (profile?.education.length ? 15 : 0) +
        (profile?.professionalSummary ? 15 : 0));

    const careerReadinessPercent = Math.min(
      100,
      Math.round(profileCompleteness * 0.4 + avgJDCompatibility * 0.3 + avgInterviewScore * 0.3)
    );

    return NextResponse.json({
      metrics: {
        totalResumes,
        totalJDs,
        totalApplications,
        avgJDCompatibility,
        interviewsAttempted: completedInterviews.length,
        avgInterviewScore,
        bestInterviewScore,
        skillsLearning,
        skillsCompleted,
        careerReadinessPercent,
        readinessDisclaimer:
          "Career readiness is an internal heuristic estimate based on profile completeness, interview performance, and JD alignment. It is not an employment guarantee.",
      },
      charts: {
        interviewTrends,
        jdMatchTrends,
        skillProgressionChart,
      },
    });
  } catch (error) {
    return handleError(error, "Failed to generate analytics");
  }
}
