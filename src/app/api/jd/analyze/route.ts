import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AnalyzeJDSchema } from "@/lib/validations";
import { handleError, parseBody, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { extractJDData } from "@/services/ai/jd-extractor";
import { matchCandidateToJD } from "@/services/ai/skill-matcher";
import { loadProfile, toMatchingCandidate } from "@/lib/profile-utils";

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const rl = rateLimit(`jd:${user.id}`, 20, 60 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const body = await parseBody(req, AnalyzeJDSchema);
    if ("response" in body) return body.response;
    const { companyName, jobTitle, location, rawText } = body.data;

    const profile = await loadProfile(user);
    const extractedData = await extractJDData(rawText, companyName, jobTitle);
    const matchResult = matchCandidateToJD(toMatchingCandidate(profile), extractedData, companyName, jobTitle);

    const jdRecord = await prisma.jobDescription.create({
      data: {
        userId: user.id, companyName, jobTitle, location: location || null, rawText,
        extractedData: JSON.stringify(extractedData),
        matches: {
          create: {
            userId: user.id,
            overallScore: matchResult.overallMatchScore,
            requiredSkillsScore: matchResult.requiredSkillsMatchScore,
            preferredSkillsScore: matchResult.preferredSkillsMatchScore,
            matchedSkills: JSON.stringify(matchResult.matchedSkills),
            partiallyMatchedSkills: JSON.stringify(matchResult.partiallyMatchedSkills),
            learningSkills: JSON.stringify(matchResult.learningSkills),
            missingMandatorySkills: JSON.stringify(matchResult.missingMandatorySkills),
            missingPreferredSkills: JSON.stringify(matchResult.missingPreferredSkills),
            suggestedImprovements: JSON.stringify(matchResult.suggestedResumeImprovements),
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      jobDescriptionId: jdRecord.id,
      analysis: { ...matchResult, jobDescriptionId: jdRecord.id },
      extracted: extractedData,
    });
  } catch (error) {
    return handleError(error, "Failed to analyze the job description");
  }
}
