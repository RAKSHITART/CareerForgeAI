import { canonicalKey, canonicalName, detectSkills } from "@/lib/skills-catalog";

export interface ResumeComparisonReport {
  /** canonical names of catalog skills found in the text */
  extractedSkills: string[];
  /** found in the text but not in the profile (offered to the user as one-click additions) */
  missingFromProfile: { name: string; category: string }[];
  /** in the profile but not mentioned in the uploaded text */
  notInResume: string[];
  inconsistencies: string[];
  suggestions: string[];
}

type ProfileSkill = string | { name: string; proficiencyLevel?: string };

/** Compare an existing resume's text against the verified profile. Pure and safe on any input. */
export function parseAndCompareResume(rawResumeText: string, profileSkills: ProfileSkill[]): ResumeComparisonReport {
  const text = (rawResumeText || "").slice(0, 100_000);
  const profile = new Map<string, { name: string; level?: string }>();
  for (const s of profileSkills) {
    const o = typeof s === "string" ? { name: s } : { name: s.name, level: s.proficiencyLevel };
    profile.set(canonicalKey(o.name), { name: o.name, level: (o as any).level });
  }

  const found = new Map<string, { name: string; category: string }>();
  for (const h of detectSkills(text)) {
    if (h.skill.category === "Soft skills") continue; // too noisy to flag from free text
    found.set(h.skill.key, { name: h.skill.name, category: h.skill.category });
  }

  const missingFromProfile = [...found.entries()].filter(([k]) => !profile.has(k)).map(([, v]) => v);
  const notInResume = [...profile.entries()].filter(([k, v]) => !found.has(k) && v.level !== "Not familiar").map(([, v]) => canonicalName(v.name));

  const inconsistencies: string[] = [];
  for (const [k, f] of found) {
    const p = profile.get(k);
    if (!p) continue;
    if (p.level === "Not familiar") inconsistencies.push(`Your resume mentions ${f.name}, but your profile says "Not familiar". Remove it from the resume or update your profile honestly.`);
    else if (p.level === "Just started") inconsistencies.push(`Your resume lists ${f.name} like a skill, but your profile says "Just started". Describe it as "currently learning".`);
  }
  for (const m of missingFromProfile) {
    inconsistencies.push(`${m.name} appears in your resume but not in your verified profile.`);
  }

  const suggestions: string[] = [];
  if (!text.trim()) suggestions.push("No readable text was found. If this is a scanned PDF, paste the text instead.");
  if (missingFromProfile.length) suggestions.push("Add the skills you genuinely have using the skill picker so they can be evidence-checked. Do not add ones you cannot defend in an interview.");
  if (notInResume.length) suggestions.push(`Verified skills missing from this resume: ${notInResume.slice(0, 8).join(", ")}.`);
  if (!inconsistencies.length && text.trim()) suggestions.push("No inconsistencies found between this resume and your profile.");

  return { extractedSkills: [...found.values()].map((v) => v.name), missingFromProfile, notInResume, inconsistencies, suggestions };
}
