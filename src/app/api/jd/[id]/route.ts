import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError, safeJson } from "@/lib/api";
import { extractJDData } from "@/services/ai/jd-extractor";
import { matchCandidateToJD } from "@/services/ai/skill-matcher";
import { loadProfile, toMatchingCandidate } from "@/lib/profile-utils";
import { ExtractedJDData } from "@/lib/types";

/** Recompute the analysis against the CURRENT profile and keep the stored snapshot in sync. */
async function analyse(user: { id: string; name: string; email: string }, id: string, reextract: boolean) {
  const jd = await prisma.jobDescription.findFirst({ where: { id, userId: user.id } });
  if (!jd) return null;
  let extracted = safeJson<ExtractedJDData>(jd.extractedData, {} as ExtractedJDData);
  if (reextract) {
    extracted = await extractJDData(jd.rawText, jd.companyName, jd.jobTitle);
    await prisma.jobDescription.update({ where: { id }, data: { extractedData: JSON.stringify(extracted) } });
  }
  const profile = await loadProfile(user);
  const analysis = matchCandidateToJD(toMatchingCandidate(profile), extracted, jd.companyName, jd.jobTitle);
  await prisma.jDMatch.deleteMany({ where: { jobDescriptionId: id, userId: user.id } });
  await prisma.jDMatch.create({
    data: {
      jobDescriptionId: id, userId: user.id,
      overallScore: analysis.overallMatchScore, requiredSkillsScore: analysis.requiredSkillsMatchScore, preferredSkillsScore: analysis.preferredSkillsMatchScore,
      matchedSkills: JSON.stringify(analysis.matchedSkills), partiallyMatchedSkills: JSON.stringify(analysis.partiallyMatchedSkills),
      learningSkills: JSON.stringify(analysis.learningSkills), missingMandatorySkills: JSON.stringify(analysis.missingMandatorySkills),
      missingPreferredSkills: JSON.stringify(analysis.missingPreferredSkills), suggestedImprovements: JSON.stringify(analysis.suggestedResumeImprovements),
    },
  });
  return {
    jobDescription: { id: jd.id, companyName: jd.companyName, jobTitle: jd.jobTitle, location: jd.location, rawText: jd.rawText, extractedData: extracted, createdAt: jd.createdAt },
    analysis: { ...analysis, jobDescriptionId: jd.id },
  };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const out = await analyse(user, params.id, false);
    if (!out) return NextResponse.json({ error: "Job description not found" }, { status: 404 });
    return NextResponse.json(out);
  } catch (error) {
    return handleError(error, "Failed to load the job description");
  }
}

/** Re-analyze. Pass { "reextract": true } to also re-read the requirements from the original text. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const body = await req.json().catch(() => ({}));
    const out = await analyse(user, params.id, body?.reextract === true);
    if (!out) return NextResponse.json({ error: "Job description not found" }, { status: 404 });
    return NextResponse.json(out);
  } catch (error) {
    return handleError(error, "Failed to re-analyze the job description");
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthUser();
    const r = await prisma.jobDescription.deleteMany({ where: { id: params.id, userId: user.id } });
    if (r.count === 0) return NextResponse.json({ error: "Job description not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Failed to delete the job description");
  }
}
