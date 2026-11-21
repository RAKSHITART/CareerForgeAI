import { ExtractedJDData, JDAnalysisResult, SkillMatchResult, levelRank } from "@/lib/types";
import { IMPLIES, canonicalKey, canonicalName } from "@/lib/skills-catalog";

/** Technologies that are commonly confused. Used only to explain a "Missing" result. */
export const RELATED: Record<string, string[]> = {
  react: ["angular", "vuejs", "svelte"],
  angular: ["react", "vuejs", "svelte"],
  vuejs: ["react", "angular"],
  sql: ["mongodb", "cassandra", "redis", "dynamodb"],
  mongodb: ["mysql", "postgresql"],
  java: ["javascript", "c#", "python"],
  javascript: ["java"],
  aws: ["microsoftazure", "googlecloud"],
  microsoftazure: ["aws", "googlecloud"],
  googlecloud: ["aws", "microsoftazure"],
};

export interface CandidateProfileForMatching {
  education: { institution: string; degree: string; specialization: string; graduationYear: number }[];
  skills: {
    name: string; category: string; proficiencyLevel: string;
    usedInProject: boolean; usedAcademically: boolean; usedProfessionally: boolean;
    evidenceNotes?: string | null;
  }[];
  projects: {
    id: string; title: string; description: string; problemStatement?: string | null;
    technologies: string[]; candidateContribution: string; measurableResults?: string[];
    githubUrl?: string | null; liveDemoUrl?: string | null;
  }[];
  workExperience: {
    id: string; company: string; position: string; employmentType?: string;
    responsibilities: string[]; achievements?: string[]; technologies: string[];
    startDate: string; endDate?: string | null; isCurrent: boolean;
  }[];
}

interface IndexEntry { name: string; level: string; evidence: string[]; hasEvidence: boolean }

// ---------- dates / experience ----------
export function parseMonth(s?: string | null): Date | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, 1));
  m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[2], +m[1] - 1, 1));
  m = t.match(/^(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[1], 0, 1));
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}

/** Months of experience. Internships count at half weight; overlapping roles are not double counted. */
export function experienceMonths(roles: CandidateProfileForMatching["workExperience"], now = new Date()): number {
  const spans: { s: number; e: number; w: number }[] = [];
  for (const r of roles) {
    const s = parseMonth(r.startDate);
    if (!s) continue;
    const e = r.isCurrent || !r.endDate ? now : parseMonth(r.endDate) || now;
    if (e < s) continue;
    spans.push({ s: s.getTime(), e: e.getTime(), w: /intern/i.test(r.employmentType || "") || /intern/i.test(r.position) ? 0.5 : 1 });
  }
  spans.sort((a, b) => a.s - b.s);
  const MONTH = 30.44 * 24 * 3600 * 1000;
  let total = 0, cursor = -Infinity;
  for (const sp of spans) {
    const start = Math.max(sp.s, cursor);
    if (sp.e > start) total += ((sp.e - start) / MONTH) * sp.w;
    cursor = Math.max(cursor, sp.e);
  }
  return Math.round(total);
}

function degreeRank(deg: string): number {
  const d = deg.toLowerCase();
  if (/ph\.?\s?d|doctor/.test(d)) return 3;
  if (/master|m\.?\s?tech|m\.?\s?sc|m\.?\s?s\b|mba|m\.?\s?e\b|mca/.test(d)) return 2;
  if (/bachelor|b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|b\.?\s?s\b|bca|b\.?\s?com|b\.?\s?a\b/.test(d)) return 1;
  return 0.5;
}

export function matchCandidateToJD(
  candidate: CandidateProfileForMatching,
  jd: ExtractedJDData,
  companyName: string,
  jobTitle: string
): JDAnalysisResult {
  // ---- index candidate skills by canonical key ----
  const hasTech = (list: string[], key: string) => list.some((t) => canonicalKey(t) === key);
  const index = new Map<string, IndexEntry>();
  for (const s of candidate.skills) {
    const key = canonicalKey(s.name);
    const evidence: string[] = [];
    if (s.usedInProject) evidence.push("Used in project portfolio");
    if (s.usedProfessionally) evidence.push("Used in professional work experience");
    if (s.usedAcademically) evidence.push("Used in academic coursework");
    if (s.evidenceNotes?.trim()) evidence.push(s.evidenceNotes.trim());
    candidate.projects.filter((p) => hasTech(p.technologies, key)).forEach((p) => evidence.push(`Project: ${p.title}`));
    candidate.workExperience.filter((w) => hasTech(w.technologies, key)).forEach((w) => evidence.push(`Role: ${w.position} at ${w.company}`));
    const entry: IndexEntry = { name: s.name, level: s.proficiencyLevel, evidence, hasEvidence: evidence.length > 0 };
    const prev = index.get(key);
    // duplicates: keep the better-evidenced entry, then the more conservative level
    if (!prev || (entry.hasEvidence && !prev.hasEvidence) || (entry.hasEvidence === prev.hasEvidence && levelRank(entry.level) < levelRank(prev.level))) {
      index.set(key, entry);
    }
  }

  const fromEntry = (reqName: string, isMandatory: boolean, category: string, entry: IndexEntry, via?: string): SkillMatchResult => {
    const base = { skillName: reqName, category, isMandatory, candidateProficiency: entry.level };
    const note = via ? ` (covered through your ${via} skill)` : "";
    const rank = levelRank(entry.level);
    if (rank < 0) {
      return { ...base, status: "Needs confirmation", evidence: entry.evidence, reasoning: `The proficiency recorded for this skill ("${entry.level}") is not a recognised level. Re-select your level on the Skills page.` };
    }
    if (entry.level === "Not familiar") {
      return { ...base, status: "Missing", evidence: [], reasoning: `You recorded this skill as "Not familiar". It will not appear on your resume.` };
    }
    if (entry.level === "Just started") {
      return { ...base, status: "Learning", evidence: entry.evidence, reasoning: `You recently started learning ${reqName}${note}. It is shown as in-progress and never as a proficiency.` };
    }
    if (entry.level === "Beginner" || entry.level === "Basic working knowledge") {
      return { ...base, status: "Partially matched", evidence: entry.evidence, reasoning: `Foundational knowledge (${entry.level})${note}. Included with honest positioning.` };
    }
    if (!entry.hasEvidence) {
      return { ...base, status: "Needs confirmation", evidence: [], reasoning: `You rated yourself ${entry.level}${note}, but there is no project, job, coursework or note backing it. Add evidence on the Skills page so it can count as a verified match.` };
    }
    return { ...base, status: "Matched", evidence: entry.evidence, reasoning: `Verified match at ${entry.level} level${note} with ${entry.evidence.length} supporting evidence point(s).` };
  };

  const evaluateRequirement = (reqName: string, isMandatory: boolean, category = "Technical Skill"): SkillMatchResult => {
    const key = canonicalKey(reqName);
    const name = canonicalName(reqName);

    const direct = index.get(key);
    if (direct && direct.level !== "Not familiar") return fromEntry(name, isMandatory, category, direct);
    if (direct && direct.level === "Not familiar") return fromEntry(name, isMandatory, category, direct);

    for (const child of IMPLIES[key] || []) {
      const e = index.get(child);
      if (e && e.level !== "Not familiar") return fromEntry(name, isMandatory, category, e, e.name);
    }

    const inProjects = candidate.projects.filter((p) => hasTech(p.technologies, key));
    const inRoles = candidate.workExperience.filter((w) => hasTech(w.technologies, key));
    if (inProjects.length || inRoles.length) {
      return {
        skillName: name, category, isMandatory, status: "Needs confirmation",
        evidence: [...inProjects.map((p) => `Used in project: ${p.title}`), ...inRoles.map((w) => `Used in role: ${w.position}`)],
        reasoning: `You list ${name} in your ${inProjects[0] ? `project "${inProjects[0].title}"` : "work experience"}, but never declared a proficiency for it. Add it on the Skills page to confirm.`,
      };
    }

    const related = (RELATED[key] || []).map((k) => index.get(k)).filter((e): e is IndexEntry => !!e && e.level !== "Not familiar");
    if (related.length) {
      return {
        skillName: name, category, isMandatory, status: "Missing", evidence: [],
        reasoning: `You list ${related.map((r) => r.name).join(", ")}, but ${name} is required; these are strictly separate technologies and are not substituted for each other.`,
      };
    }
    return {
      skillName: name, category, isMandatory, status: "Missing", evidence: [],
      reasoning: `${name} is not in your profile, so it will not be added to your resume. Learn it in Skill Growth, then confirm it.`,
    };
  };

  const dedupe = (list: string[]) => {
    const seen = new Set<string>();
    return (list || []).filter((s) => { const k = canonicalKey(s); if (seen.has(k)) return false; seen.add(k); return true; });
  };
  const requiredList = dedupe(jd.requiredTechnicalSkills || []);
  const preferredList = dedupe(jd.preferredTechnicalSkills || []).filter((s) => !requiredList.some((r) => canonicalKey(r) === canonicalKey(s)));

  const allReq = requiredList.map((s) => evaluateRequirement(s, true));
  const allPref = preferredList.map((s) => evaluateRequirement(s, false));

  const matchedSkills: SkillMatchResult[] = [];
  const partiallyMatchedSkills: SkillMatchResult[] = [];
  const learningSkills: SkillMatchResult[] = [];
  const missingMandatorySkills: SkillMatchResult[] = [];
  const missingPreferredSkills: SkillMatchResult[] = [];
  [...allReq, ...allPref].forEach((r) => {
    if (r.status === "Matched") matchedSkills.push(r);
    else if (r.status === "Partially matched" || r.status === "Needs confirmation") partiallyMatchedSkills.push(r);
    else if (r.status === "Learning") learningSkills.push(r);
    else (r.isMandatory ? missingMandatorySkills : missingPreferredSkills).push(r);
  });

  const points = (r: SkillMatchResult) =>
    r.status === "Matched" ? 100 : r.status === "Partially matched" ? 60 : r.status === "Needs confirmation" ? 40 : r.status === "Learning" ? 30 : 0;
  const avg = (arr: SkillMatchResult[]) => (arr.length ? Math.round(arr.reduce((a, r) => a + points(r), 0) / arr.length) : null);
  const reqScoreRaw = avg(allReq);
  const prefScoreRaw = avg(allPref);
  const requiredScore = reqScoreRaw ?? 0;
  const preferredScore = prefScoreRaw ?? 100;
  const overallScore =
    reqScoreRaw === null && prefScoreRaw === null ? 0
    : reqScoreRaw === null ? Math.round(preferredScore * 0.6)
    : prefScoreRaw === null ? requiredScore
    : Math.round(requiredScore * 0.75 + preferredScore * 0.25);

  // ---- relevant projects ----
  const jdKeys = new Set([
    ...requiredList, ...preferredList, ...(jd.frameworksAndTools || []), ...(jd.databases || []), ...(jd.programmingLanguages || []),
  ].map(canonicalKey));
  const relevantProjects = candidate.projects
    .map((proj) => {
      const matchingTech = proj.technologies.filter((t) => jdKeys.has(canonicalKey(t)));
      return {
        projectId: proj.id, projectTitle: proj.title, matchingTechnologies: matchingTech,
        relevanceReason: `Directly demonstrates required technologies: ${matchingTech.join(", ")}.`,
      };
    })
    .filter((p) => p.matchingTechnologies.length > 0);

  // ---- education ----
  const need = jd.educationLevel || "any";
  const needRank = need === "phd" ? 3 : need === "master" ? 2 : need === "bachelor" ? 1 : 0;
  const thisYear = new Date().getFullYear();
  const bestEdu = candidate.education.reduce<{ rank: number; pursuing: boolean }>(
    (acc, e) => {
      const rank = degreeRank(e.degree);
      const pursuing = e.graduationYear > thisYear;
      return rank > acc.rank || (rank === acc.rank && !pursuing) ? { rank, pursuing } : acc;
    },
    { rank: 0, pursuing: false }
  );
  const levelWord = ["", "Bachelor's", "Master's", "PhD"][needRank];
  let eduCompatible = true, eduExplanation = "The job description does not state a minimum degree.";
  if (needRank > 0) {
    if (candidate.education.length === 0) { eduCompatible = false; eduExplanation = `A ${levelWord} degree is asked for, and no education is recorded in your profile.`; }
    else if (bestEdu.rank >= needRank && !bestEdu.pursuing) { eduExplanation = `Your highest recorded degree meets the ${levelWord} requirement.`; }
    else if (bestEdu.rank >= needRank && bestEdu.pursuing) { eduCompatible = false; eduExplanation = `A ${levelWord} degree is asked for. Yours is still in progress, so state your expected graduation year clearly.`; }
    else { eduCompatible = false; eduExplanation = `A ${levelWord} degree is asked for, which is above your highest recorded degree. Emphasise projects and experience, and apply only if the posting allows equivalent experience.`; }
  }

  // ---- experience ----
  const months = experienceMonths(candidate.workExperience);
  const years = Math.round((months / 12) * 10) / 10;
  const minYears = jd.minYearsExperience ?? null;
  let expCompatible = true, expExplanation: string;
  if (minYears === null) {
    expExplanation = months > 0 ? `About ${years} year(s) of counted experience (internships at half weight). The posting does not state a minimum.` : "The posting does not state a minimum. Lead with projects and coursework.";
  } else if (minYears === 0) {
    expExplanation = "Entry level: projects and coursework are appropriate evidence.";
  } else if (years >= minYears) {
    expExplanation = `About ${years} year(s) of counted experience meets the ${minYears}+ year requirement.`;
  } else {
    expCompatible = false;
    expExplanation = `About ${years} year(s) of counted experience (internships at half weight) versus ${minYears}+ asked for. Be upfront about this and lead with your strongest projects.`;
  }

  // ---- suggestions & warnings ----
  const suggestedImprovements: JDAnalysisResult["suggestedResumeImprovements"] = [];
  if (missingMandatorySkills.length) {
    suggestedImprovements.push({
      area: "Technical skill gaps",
      actionableAdvice: `Missing required skills: ${missingMandatorySkills.map((m) => m.skillName).join(", ")}. Build them in Skill Growth instead of claiming them.`,
      honestNote: "Missing skills stay off the resume until you have genuinely learned and confirmed them.",
    });
  }
  const needConfirm = partiallyMatchedSkills.filter((s) => s.status === "Needs confirmation");
  if (needConfirm.length) {
    suggestedImprovements.push({
      area: "Evidence to add",
      actionableAdvice: `Add proof for: ${needConfirm.map((m) => m.skillName).join(", ")} (a project, role or note) so they count as verified.`,
      honestNote: "Self-rated skills without evidence are not treated as verified matches.",
    });
  }
  if (relevantProjects.length) {
    suggestedImprovements.push({
      area: "Project prioritisation",
      actionableAdvice: `Put "${relevantProjects[0].projectTitle}" first. It shows ${relevantProjects[0].matchingTechnologies.join(", ")}.`,
      honestNote: "Highlighting genuinely relevant projects is legitimate tailoring.",
    });
  }
  suggestedImprovements.push({
    area: "Quantify your impact",
    actionableAdvice: "Add measurable results to projects where you actually have them (latency, users, test coverage, time saved).",
    honestNote: "Only use numbers you can defend in an interview.",
  });

  const warnings: string[] = [];
  if (jd.lowConfidence || requiredList.length + preferredList.length === 0) {
    warnings.push("No recognisable technical skills were found in this job description. Paste the full requirements section for a meaningful score.");
  }
  if (candidate.skills.length === 0) warnings.push("Your profile has no skills yet, so every requirement shows as missing. Add your skills first.");

  return {
    companyName, jobTitle,
    overallMatchScore: overallScore,
    requiredSkillsMatchScore: requiredScore,
    preferredSkillsMatchScore: preferredScore,
    matchedSkills, partiallyMatchedSkills, learningSkills, missingMandatorySkills, missingPreferredSkills,
    relevantProjects,
    educationCompatibility: { isCompatible: eduCompatible, explanation: eduExplanation },
    experienceCompatibility: { isCompatible: expCompatible, explanation: expExplanation },
    suggestedResumeImprovements: suggestedImprovements,
    disclaimer: "Scores are heuristic estimates from the requirements found in the text. They are not a prediction of any employer's or ATS's decision.",
    warnings,
    extractionSource: jd.extractionSource,
  };
}
