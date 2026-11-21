import prisma from "./prisma";
import { safeJson } from "./api";
import type { CandidateProfileForMatching } from "@/services/ai/skill-matcher";
import { levelRank } from "./types";
import { canonicalKey } from "./skills-catalog";

/** Parse the JSON-string columns so callers always get real arrays. */
export function normalizeProfile<T extends Record<string, any>>(p: T) {
  return {
    ...p,
    projects: (p.projects || []).map((x: any) => ({
      ...x,
      technologies: safeJson<string[]>(x.technologies, []),
      keyFeatures: safeJson<string[]>(x.keyFeatures, []),
      measurableResults: safeJson<string[]>(x.measurableResults, []),
    })),
    workExperience: (p.workExperience || []).map((x: any) => ({
      ...x,
      responsibilities: safeJson<string[]>(x.responsibilities, []),
      achievements: safeJson<string[]>(x.achievements, []),
      technologies: safeJson<string[]>(x.technologies, []),
    })),
  } as any;
}

const FULL_INCLUDE = {
  skills: { include: { evidence: true }, orderBy: { createdAt: "desc" as const } },
  projects: { orderBy: { createdAt: "desc" as const } },
  education: { orderBy: { graduationYear: "desc" as const } },
  workExperience: { orderBy: { startDate: "desc" as const } },
  certifications: { orderBy: { issueDate: "desc" as const } },
};

/** Load (creating if needed) the caller's profile, parsed and ready for the AI services. */
export async function loadProfile(user: { id: string; name: string; email: string }) {
  let profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id }, include: FULL_INCLUDE });
  if (!profile) {
    profile = await prisma.candidateProfile.create({
      data: { userId: user.id, fullName: user.name, email: user.email },
      include: FULL_INCLUDE,
    });
  }
  return normalizeProfile(profile);
}

/** The shape skill-matcher / resume-tailor expect. */
export function toMatchingCandidate(p: any): CandidateProfileForMatching & Record<string, any> {
  return {
    fullName: p.fullName, email: p.email, phone: p.phone, location: p.location,
    linkedInUrl: p.linkedInUrl, gitHubUrl: p.gitHubUrl, portfolioUrl: p.portfolioUrl,
    professionalSummary: p.professionalSummary, preferredTemplate: p.preferredTemplate,
    education: p.education,
    skills: p.skills.map((s: any) => ({
      name: s.name, category: s.category, proficiencyLevel: s.proficiencyLevel,
      usedInProject: s.usedInProject, usedAcademically: s.usedAcademically, usedProfessionally: s.usedProfessionally,
      evidenceNotes: [s.practicalExperienceNotes, ...(s.evidence || []).map((e: any) => e.title)].filter(Boolean).join("; ") || null,
    })),
    projects: p.projects,
    workExperience: p.workExperience,
  } as any;
}

export interface NextStep { id: string; label: string; done: boolean; href: string }

/** What is still missing from the profile, for the dashboard checklist. */
export function profileChecklist(p: any): { percent: number; steps: NextStep[] } {
  const skills: any[] = p.skills || [];
  const projectTechs = new Set<string>((p.projects || []).flatMap((x: any) => x.technologies || []).map(canonicalKey));
  const unbacked = skills.filter(
    (s) => levelRank(s.proficiencyLevel) >= levelRank("Intermediate") &&
      !(s.usedInProject || s.usedAcademically || s.usedProfessionally || s.practicalExperienceNotes || projectTechs.has(canonicalKey(s.name)))
  );
  const steps: NextStep[] = [
    { id: "contact", label: "Add your phone or location", done: !!(p.phone || p.location), href: "/dashboard/profile" },
    { id: "education", label: "Add your education", done: (p.education || []).length > 0, href: "/dashboard/profile" },
    { id: "skills", label: "Pick at least 5 skills", done: skills.length >= 5, href: "/dashboard/skills" },
    { id: "projects", label: "Add a project you built", done: (p.projects || []).length > 0, href: "/dashboard/profile" },
    { id: "evidence", label: unbacked.length ? `Back up ${unbacked.length} skill(s) with evidence` : "Skills are backed by evidence", done: unbacked.length === 0 && skills.length > 0, href: "/dashboard/skills" },
    { id: "summary", label: "Write a short professional summary", done: !!p.professionalSummary?.trim(), href: "/dashboard/profile" },
  ];
  return { percent: Math.round((steps.filter((s) => s.done).length / steps.length) * 100), steps };
}
