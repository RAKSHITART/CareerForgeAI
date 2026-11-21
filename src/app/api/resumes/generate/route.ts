import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GenerateResumeSchema } from "@/lib/validations";
import { handleError, parseBody, safeJson, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { deterministicExtract } from "@/services/ai/jd-extractor";
import { matchCandidateToJD } from "@/services/ai/skill-matcher";
import { tailorResumeContent } from "@/services/ai/resume-tailor";
import { loadProfile, toMatchingCandidate } from "@/lib/profile-utils";
import { getTemplate } from "@/lib/templates";
import { ExtractedJDData } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const rl = rateLimit(`resume:${user.id}`, 40, 60 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const body = await parseBody(req, GenerateResumeSchema);
    if ("response" in body) return body.response;
    const { jobDescriptionId, targetRole, targetCompany, templateId, versionName } = body.data;

    let extracted: ExtractedJDData = deterministicExtract("", targetRole);
    if (jobDescriptionId) {
      const jd = await prisma.jobDescription.findFirst({ where: { id: jobDescriptionId, userId: user.id } });
      if (!jd) return NextResponse.json({ error: "That job description was not found" }, { status: 404 });
      extracted = safeJson<ExtractedJDData>(jd.extractedData, extracted);
    }

    const profile = await loadProfile(user);
    const tpl = getTemplate(templateId);
    const candidate = { ...toMatchingCandidate(profile), preferredTemplate: templateId };
    const match = matchCandidateToJD(candidate, extracted, targetCompany, targetRole);
    const tailored = tailorResumeContent(candidate as any, extracted, match, targetCompany, targetRole);
    tailored.style = { fontFamily: tpl.font, accent: `#${tpl.accent}`, fontSize: 10.5, includePhoto: !!(profile.includePhoto && profile.photoUrl) };

    // snapshot: protects the resume from later profile edits, and is what the audit checks against
    const snapshot = {
      ...candidate,
      education: profile.education,
      certifications: profile.certifications.map((c: any) => ({ name: c.name, issuingOrganization: c.issuingOrganization, issueDate: c.issueDate })),
      photoUrl: profile.photoUrl || null,
    };

    const resume = await prisma.resumeVersion.create({
      data: {
        userId: user.id, jobDescriptionId: jobDescriptionId || null,
        versionName: versionName || `${targetCompany} — ${targetRole}`, targetRole, targetCompany, templateId,
        snapshotProfileData: JSON.stringify(snapshot),
        tailoredContent: JSON.stringify(tailored),
        diffNotes: JSON.stringify({ audit: tailored.antiFabricationAudit, improvementsApplied: match.suggestedResumeImprovements.length }),
      },
    });

    return NextResponse.json({ success: true, resume: { id: resume.id, versionName: resume.versionName, targetRole, targetCompany, templateId, createdAt: resume.createdAt } });
  } catch (error) {
    return handleError(error, "Failed to generate the resume");
  }
}
