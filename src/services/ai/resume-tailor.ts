import {
  ExtractedJDData, JDAnalysisResult, ProficiencyLevel, TailoredBulletPoint, TailoredResumeContent, levelRank,
} from "@/lib/types";
import { canonicalKey, canonicalName } from "@/lib/skills-catalog";
import { DEFAULT_SECTION_ORDER, getTemplate } from "@/lib/templates";
import { CandidateProfileForMatching } from "./skill-matcher";

const WEAK_START = /^(worked on|responsible for|helped|helped with|involved in|assisted|participated in|duties included)\b/i;

/** Light-touch tidy: whitespace, leading "I", capital letter, full stop. Never changes what was claimed. */
export function cleanBullet(text: string): string {
  let t = (text || "").replace(/\s+/g, " ").trim();
  t = t.replace(/^[•\-*·]\s*/, "").replace(/^I\s+(?=[a-z])/, "");
  if (!t) return t;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?)]$/.test(t)) t += ".";
  return t;
}

function mkBullet(original: string, reason: string): TailoredBulletPoint {
  const tailored = cleanBullet(original);
  const weak = WEAK_START.test(tailored);
  return {
    original,
    tailored,
    reason: weak
      ? "Tidied only. This opens with a weak phrase: consider a verb that accurately describes what you personally did."
      : reason,
    evidenceBacked: true,
    status: "accepted",
  };
}

export function tailorResumeContent(
  candidate: CandidateProfileForMatching & {
    fullName: string; email: string; phone?: string | null; location?: string | null;
    linkedInUrl?: string | null; gitHubUrl?: string | null; portfolioUrl?: string | null;
    professionalSummary?: string | null; preferredTemplate?: string;
  },
  jd: ExtractedJDData,
  matchResult: JDAnalysisResult,
  targetCompany: string,
  targetRole: string
): TailoredResumeContent {
  const template = getTemplate(candidate.preferredTemplate);
  const jdKeys = new Set(
    [...(jd.requiredTechnicalSkills || []), ...(jd.preferredTechnicalSkills || []), ...(jd.atsKeywords || [])].map(canonicalKey)
  );

  const unverifiedRemoved: string[] = [];
  const warnings: string[] = [];
  const notFamiliar = new Set<string>();

  type SkillRow = { name: string; level: ProficiencyLevel; status: "verified" | "learning"; hasEvidence: boolean };
  const byCategory: Record<string, SkillRow[]> = {};
  const learning: string[] = [];
  const seen = new Set<string>();

  for (const s of candidate.skills) {
    const key = canonicalKey(s.name);
    if (seen.has(key)) continue;
    seen.add(key);
    if (s.proficiencyLevel === "Not familiar") {
      notFamiliar.add(key);
      unverifiedRemoved.push(canonicalName(s.name));
      continue;
    }
    if (s.proficiencyLevel === "Just started") { learning.push(canonicalName(s.name)); continue; }
    const inProj = candidate.projects.some((p) => p.technologies.some((t) => canonicalKey(t) === key));
    const inRole = candidate.workExperience.some((w) => w.technologies.some((t) => canonicalKey(t) === key));
    const hasEvidence = s.usedInProject || s.usedAcademically || s.usedProfessionally || inProj || inRole || !!s.evidenceNotes?.trim();
    if (levelRank(s.proficiencyLevel) >= levelRank("Intermediate") && !hasEvidence) {
      warnings.push(`${canonicalName(s.name)} is rated ${s.proficiencyLevel} but has no project, job, coursework or note backing it.`);
    }
    const cat = s.category || "Other";
    (byCategory[cat] ||= []).push({ name: canonicalName(s.name), level: s.proficiencyLevel as ProficiencyLevel, status: "verified", hasEvidence });
  }

  const prioritizedSkills = Object.entries(byCategory).map(([category, list]) => ({
    category,
    skills: [...list]
      .sort((a, b) => {
        const ja = jdKeys.has(canonicalKey(a.name)) ? 1 : 0, jb = jdKeys.has(canonicalKey(b.name)) ? 1 : 0;
        return jb - ja || levelRank(b.level) - levelRank(a.level);
      })
      .map(({ name, level, status }) => ({ name, level, status })),
  }));

  // technologies named in projects/roles that are not in the skills list: tell the user, do not hide the fact
  const declared = new Set(candidate.skills.map((s) => canonicalKey(s.name)));
  const unlisted = new Set<string>();
  const keepTech = (techs: string[]) =>
    techs.filter((t) => {
      const k = canonicalKey(t);
      if (notFamiliar.has(k)) return false;
      if (!declared.has(k)) unlisted.add(canonicalName(t));
      return true;
    }).map(canonicalName);

  const relevantIds = new Set(matchResult.relevantProjects.map((p) => p.projectId));
  const tailoredProjects = candidate.projects
    .map((proj) => {
      const bullets: TailoredBulletPoint[] = [mkBullet(proj.description, "Wording tidied. Content unchanged.")];
      if (proj.candidateContribution?.trim()) bullets.push(mkBullet(proj.candidateContribution, "Your own description of your contribution, unchanged."));
      (proj.measurableResults || []).filter((r) => r.trim()).forEach((r) => bullets.push(mkBullet(r, "Your measured result, unchanged.")));
      const techs = keepTech(proj.technologies);
      const matches = techs.filter((t) => jdKeys.has(canonicalKey(t))).length;
      return {
        id: proj.id, title: proj.title, relevanceRank: relevantIds.has(proj.id) ? 1 : 2, _m: matches,
        description: proj.description, problemStatement: proj.problemStatement || undefined,
        bulletPoints: bullets, technologies: techs,
        measurableResults: proj.measurableResults || [], githubUrl: proj.githubUrl || undefined, liveDemoUrl: proj.liveDemoUrl || undefined,
      };
    })
    .sort((a, b) => a.relevanceRank - b.relevanceRank || b._m - a._m)
    .map(({ _m, ...rest }) => rest);

  const tailoredExperience = candidate.workExperience.map((exp) => ({
    id: exp.id, company: exp.company, position: exp.position, employmentType: exp.employmentType || "Full-time",
    startDate: exp.startDate, endDate: exp.endDate || undefined, isCurrent: exp.isCurrent,
    bulletPoints: [
      ...exp.responsibilities.filter((r) => r.trim()).map((r) => mkBullet(r, "Wording tidied. Content unchanged.")),
      ...(exp.achievements || []).filter((r) => r.trim()).map((r) => mkBullet(r, "Your stated achievement, unchanged.")),
    ],
    technologies: keepTech(exp.technologies),
  }));

  if (unlisted.size) {
    warnings.push(`Technologies used in projects/roles but missing from your skills list: ${[...unlisted].join(", ")}. Add them on the Skills page so they can be verified.`);
  }

  // Summary: the user's own words, or a purely factual line built from evidence-backed skills. No boilerplate.
  const topSkills = prioritizedSkills
    .flatMap((c) => c.skills)
    .filter((s) => levelRank(s.level) >= levelRank("Intermediate"))
    .filter((s) => {
      const k = canonicalKey(s.name);
      return candidate.skills.some((x) => canonicalKey(x.name) === k && (x.usedInProject || x.usedAcademically || x.usedProfessionally))
        || candidate.projects.some((p) => p.technologies.some((t) => canonicalKey(t) === k));
    })
    .sort((a, b) => (jdKeys.has(canonicalKey(b.name)) ? 1 : 0) - (jdKeys.has(canonicalKey(a.name)) ? 1 : 0) || levelRank(b.level) - levelRank(a.level))
    .slice(0, 4)
    .map((s) => s.name);

  const own = candidate.professionalSummary?.trim();
  const list = topSkills.length > 1 ? `${topSkills.slice(0, -1).join(", ")} and ${topSkills[topSkills.length - 1]}` : topSkills[0];
  const summaryText = own || (topSkills.length ? `Candidate with hands-on experience in ${list}, applying for the ${targetRole} role at ${targetCompany}.` : "");
  if (!own && !summaryText) warnings.push("No summary was generated because no evidence-backed Intermediate+ skills were found. Write your own summary in your profile.");

  return {
    targetRole, targetCompany,
    professionalSummary: {
      text: summaryText,
      highlightedSkills: own ? [] : topSkills,
      honestBasis: own ? "Your own professional summary, unchanged." : "Built only from your evidence-backed skills. No claims were added.",
    },
    prioritizedSkills,
    learningSkills: learning,
    tailoredProjects,
    tailoredExperience,
    sectionOrdering: template.sectionOrder || DEFAULT_SECTION_ORDER,
    antiFabricationAudit: {
      checkedAt: new Date().toISOString(),
      unverifiedSkillsRemoved: unverifiedRemoved,
      exaggerationsRejected: [],
      warnings,
      verdict: warnings.length ? "WARNINGS_REVIEWED" : "STRICTLY_VERIFIED",
    },
  };
}

/**
 * Re-audit resume content that came back from the editor. Skills can only appear if they exist in the
 * profile snapshot, never above the recorded level, and "Just started" skills stay in the learning list.
 * Free-text bullet edits are the user's own words and are allowed.
 */
export function auditTailoredContent(
  content: TailoredResumeContent,
  profileSkills: { name: string; proficiencyLevel: string }[]
): TailoredResumeContent {
  const profile = new Map(profileSkills.map((s) => [canonicalKey(s.name), s]));
  const rejected: string[] = [];
  const out: TailoredResumeContent = JSON.parse(JSON.stringify(content));

  const learningSet = new Set<string>();
  out.prioritizedSkills = (out.prioritizedSkills || [])
    .map((cat) => ({
      ...cat,
      skills: (cat.skills || []).flatMap((sk) => {
        const p = profile.get(canonicalKey(sk.name));
        if (!p || p.proficiencyLevel === "Not familiar") { rejected.push(`Removed "${sk.name}": not a verified skill in your profile.`); return []; }
        if (p.proficiencyLevel === "Just started") { learningSet.add(canonicalName(sk.name)); return []; }
        if (levelRank(sk.level) > levelRank(p.proficiencyLevel)) {
          rejected.push(`Lowered "${sk.name}" from ${sk.level} to ${p.proficiencyLevel} (your recorded level).`);
          return [{ ...sk, level: p.proficiencyLevel as ProficiencyLevel }];
        }
        return [sk];
      }),
    }))
    .filter((c) => c.skills.length > 0);

  for (const l of out.learningSkills || []) {
    const p = profile.get(canonicalKey(l));
    if (p && p.proficiencyLevel === "Just started") learningSet.add(canonicalName(l));
    else rejected.push(`Removed "${l}" from "currently learning": not recorded as in-progress in your profile.`);
  }
  out.learningSkills = [...learningSet];

  const dropNF = (techs: string[]) => (techs || []).filter((t) => profile.get(canonicalKey(t))?.proficiencyLevel !== "Not familiar");
  out.tailoredProjects = (out.tailoredProjects || []).map((p) => ({ ...p, technologies: dropNF(p.technologies) }));
  out.tailoredExperience = (out.tailoredExperience || []).map((e) => ({ ...e, technologies: dropNF(e.technologies) }));

  const prev = out.antiFabricationAudit || ({} as TailoredResumeContent["antiFabricationAudit"]);
  const warnings = prev.warnings || [];
  out.antiFabricationAudit = {
    checkedAt: new Date().toISOString(),
    unverifiedSkillsRemoved: prev.unverifiedSkillsRemoved || [],
    exaggerationsRejected: rejected,
    warnings,
    verdict: rejected.length || warnings.length ? "WARNINGS_REVIEWED" : "STRICTLY_VERIFIED",
  };
  return out;
}
