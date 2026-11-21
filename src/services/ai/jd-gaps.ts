import { ExtractedJDData, TailoredResumeContent } from "@/lib/types";
import { canonicalKey, canonicalName, categoryFor } from "@/lib/skills-catalog";

export interface JdSuggestion {
  name: string;
  category: string;
  importance: "required" | "preferred";
  /** why it is not on the resume yet */
  reason: "used-in-project" | "marked-not-familiar" | "not-in-profile";
  hint: string;
}

interface Snapshot {
  skills?: { name: string; proficiencyLevel: string }[];
  projects?: { title: string; technologies?: string[] }[];
  workExperience?: { position: string; company: string; technologies?: string[] }[];
}

/**
 * Skills the job asks for that are not on this resume yet. The resume is built regardless; these are
 * offered to the user to confirm one by one ("I have this"), never added automatically.
 */
export function computeJdSuggestions(jd: Partial<ExtractedJDData>, content: TailoredResumeContent, snap: Snapshot): JdSuggestion[] {
  const onResume = new Set<string>([
    ...(content.prioritizedSkills || []).flatMap((c) => c.skills.map((s) => canonicalKey(s.name))),
    ...(content.learningSkills || []).map(canonicalKey),
  ]);
  const profile = new Map((snap.skills || []).map((s) => [canonicalKey(s.name), s]));
  const seen = new Set<string>();
  const out: JdSuggestion[] = [];

  const consider = (raw: string, importance: JdSuggestion["importance"]) => {
    const key = canonicalKey(raw);
    if (!key || seen.has(key) || onResume.has(key)) return;
    seen.add(key);
    const name = canonicalName(raw);
    const proj = (snap.projects || []).find((p) => (p.technologies || []).some((t) => canonicalKey(t) === key));
    const role = (snap.workExperience || []).find((w) => (w.technologies || []).some((t) => canonicalKey(t) === key));
    const existing = profile.get(key);
    if (proj || role) {
      out.push({ name, category: categoryFor(name), importance, reason: "used-in-project", hint: `You list it in ${proj ? `your project “${proj.title}”` : `your role at ${role!.company}`}. Add it to confirm.` });
    } else if (existing?.proficiencyLevel === "Not familiar") {
      out.push({ name, category: categoryFor(name), importance, reason: "marked-not-familiar", hint: "You marked this as “Not familiar”. Add it only if that has changed." });
    } else {
      out.push({ name, category: categoryFor(name), importance, reason: "not-in-profile", hint: "Not in your profile. Add it only if you have genuinely used it." });
    }
  };

  (jd.requiredTechnicalSkills || []).forEach((s) => consider(s, "required"));
  (jd.preferredTechnicalSkills || []).forEach((s) => consider(s, "preferred"));

  const rank = (s: JdSuggestion) => (s.importance === "required" ? 0 : 2) + (s.reason === "used-in-project" ? 0 : 1);
  return out.sort((a, b) => rank(a) - rank(b));
}
