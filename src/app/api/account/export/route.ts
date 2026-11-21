import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError, safeJson } from "@/lib/api";
import { loadProfile } from "@/lib/profile-utils";

/** Everything the app stores about the caller, as one downloadable JSON file. */
export async function GET() {
  try {
    const user = await requireAuthUser();
    const [profile, jds, resumes, apps, plans, interviews] = await Promise.all([
      loadProfile(user),
      prisma.jobDescription.findMany({ where: { userId: user.id }, select: { companyName: true, jobTitle: true, rawText: true, createdAt: true } }),
      prisma.resumeVersion.findMany({ where: { userId: user.id } }),
      prisma.jobApplication.findMany({ where: { userId: user.id }, select: { company: true, role: true, status: true, appliedDate: true, interviewDate: true, followUpDate: true, notes: true } }),
      prisma.learningPlan.findMany({ where: { userId: user.id }, select: { skillName: true, targetRole: true, progressPercent: true, status: true } }),
      prisma.interviewSession.findMany({ where: { userId: user.id }, include: { questions: { select: { questionText: true, userResponseText: true, score: true } } } }),
    ]);
    const { id: _a, userId: _b, ...p } = profile as any;
    const body = {
      exportedAt: new Date().toISOString(),
      account: { name: user.name, email: user.email },
      profile: p,
      jobDescriptions: jds,
      resumes: resumes.map((r) => ({ versionName: r.versionName, targetRole: r.targetRole, targetCompany: r.targetCompany, templateId: r.templateId, tailoredContent: safeJson(r.tailoredContent, {}), createdAt: r.createdAt })),
      applications: apps,
      learningPlans: plans,
      interviews: interviews.map((i) => ({ targetRole: i.targetRole, interviewType: i.interviewType, status: i.status, overallScore: i.overallScore, questions: i.questions })),
    };
    return new NextResponse(JSON.stringify(body, null, 2), {
      headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="careerforge-my-data.json"' },
    });
  } catch (error) {
    return handleError(error, "Could not export your data");
  }
}
