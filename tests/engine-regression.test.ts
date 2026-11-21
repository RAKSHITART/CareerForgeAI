import { describe, it, expect } from "vitest";
import { deterministicExtract } from "@/services/ai/jd-extractor";
import { matchCandidateToJD, experienceMonths } from "@/services/ai/skill-matcher";
import { tailorResumeContent } from "@/services/ai/resume-tailor";

const sk = (name: string, level: string, flags: Partial<{ p: boolean; a: boolean; w: boolean }> = {}, cat = "Frameworks") =>
  ({ name, category: cat, proficiencyLevel: level, usedInProject: !!flags.p, usedAcademically: !!flags.a, usedProfessionally: !!flags.w });
const cand = (skills: any[], projects: any[] = [], exp: any[] = [], education: any[] = [{ institution: "U", degree: "B.Tech", specialization: "CS", graduationYear: 2024 }]) => ({ education, skills, projects, workExperience: exp }) as any;
const all = (r: any) => [...r.matchedSkills, ...r.partiallyMatchedSkills, ...r.learningSkills, ...r.missingMandatorySkills, ...r.missingPreferredSkills];
const find = (r: any, n: string) => all(r).find((s: any) => s.skillName === n);

describe("JD extraction (audit findings A-C)", () => {
  it("A: data-science JD yields all the named skills, not just Python", () => {
    const r = deterministicExtract("Requirements: Python, Pandas, NumPy, scikit-learn, TensorFlow, PyTorch, Power BI, Tableau, Spark. 3-5 years of experience.", "Data Scientist");
    for (const n of ["Python", "Pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "Power BI", "Tableau", "Apache Spark"]) expect(r.requiredTechnicalSkills).toContain(n);
    expect(r.minYearsExperience).toBe(3);
  });
  it("A: React Native is not read as React; Flutter and C are found", () => {
    const m = deterministicExtract("Flutter and React Native developer with Swift and Kotlin.", "x");
    expect(m.requiredTechnicalSkills).toEqual(expect.arrayContaining(["Flutter", "React Native", "Swift", "Kotlin"]));
    expect(m.requiredTechnicalSkills).not.toContain("React");
    expect(deterministicExtract("Strong C and C++ skills required.", "x").requiredTechnicalSkills).toEqual(expect.arrayContaining(["C", "C++"]));
  });
  it("B: plain English invents no skills, and 'Scrum Master' is not a Master's degree", () => {
    const r = deterministicExtract("We are a fast-moving R&D team. Ready to go the extra mile? Express interest. Swift decisions. Spring 2025 internship. Scrum Master experience helps. We trust our people.", "Engineer");
    expect(r.requiredTechnicalSkills).toEqual([]);
    expect(r.lowConfidence).toBe(true);
    expect(r.educationLevel).toBe("any");
    expect(r.atsKeywords).not.toContain("Agile");                 // no hard-coded filler
  });
  it("C: React and React.js are one requirement; a required Java is not downgraded by 'JavaScript' being preferred", () => {
    const r = deterministicExtract("Requirements:\n- Strong React.js and Node.js\n- Java backend\nPreferred qualifications:\n- JavaScript testing", "Eng");
    expect(r.requiredTechnicalSkills.filter((s) => s === "React")).toHaveLength(1);
    expect(r.requiredTechnicalSkills).toContain("Java");
    expect(r.preferredTechnicalSkills).not.toContain("Java");
    expect(r.preferredTechnicalSkills).toContain("JavaScript");
  });
  it("education and experience are read, not invented", () => {
    const r = deterministicExtract("Bachelor's degree in Computer Science. Minimum 2 years of experience with Java.", "x");
    expect(r.educationLevel).toBe("bachelor"); expect(r.minYearsExperience).toBe(2);
    expect(deterministicExtract("Java developer wanted.", "x").educationRequirements).toBe("");
  });
});

describe("matching (audit findings D-G)", () => {
  const jd = (req: string[], extra: any = {}) => ({ requiredTechnicalSkills: req, preferredTechnicalSkills: [], programmingLanguages: [], frameworksAndTools: [], databases: [], coreCSConcepts: [], ...extra }) as any;
  it("D: aliases match ('ReactJS' is React, 'Postgres' is PostgreSQL, MySQL covers SQL)", () => {
    const r = matchCandidateToJD(cand([sk("ReactJS", "Advanced", { p: true }), sk("Postgres", "Intermediate", { p: true }), sk("MySQL", "Intermediate", { p: true })]), jd(["React", "PostgreSQL", "SQL"]), "A", "B");
    expect(find(r, "React").status).toBe("Matched");
    expect(find(r, "PostgreSQL").status).toBe("Matched");
    expect(find(r, "SQL").status).toBe("Matched");
  });
  it("E: 'Expert' with zero evidence is NOT a verified match; an unknown level is not a match", () => {
    const r = matchCandidateToJD(cand([sk("Kubernetes", "Expert"), sk("Rust", "banana")]), jd(["Kubernetes", "Rust"]), "A", "B");
    expect(find(r, "Kubernetes").status).toBe("Needs confirmation");
    expect(find(r, "Rust").status).toBe("Needs confirmation");
  });
  it("F: a technology used in a project but never declared is 'Needs confirmation', not 'Missing'", () => {
    const r = matchCandidateToJD(cand([sk("Angular", "Advanced", { p: true })], [{ id: "p", title: "Shop", description: "d", technologies: ["React"], candidateContribution: "c" }]), jd(["React"]), "A", "B");
    expect(find(r, "React").status).toBe("Needs confirmation");
  });
  it("G: a fresher is not 'compatible' with 10+ years or a PhD requirement; a 1-month intern is not 5 years", () => {
    const r = matchCandidateToJD(cand([]), jd([], { minYearsExperience: 10, educationLevel: "phd" }), "A", "B");
    expect(r.experienceCompatibility.isCompatible).toBe(false);
    expect(r.educationCompatibility.isCompatible).toBe(false);
    const intern = [{ id: "w", company: "X", position: "Intern", employmentType: "Internship", responsibilities: [], technologies: [], startDate: "2024-01", endDate: "2024-02", isCurrent: false }];
    expect(matchCandidateToJD(cand([], [], intern), jd([], { minYearsExperience: 5 }), "A", "B").experienceCompatibility.isCompatible).toBe(false);
    expect(experienceMonths(intern as any)).toBeLessThanOrEqual(1);
  });
  it("a genuinely senior candidate passes; overlapping jobs are not double counted", () => {
    const jobs = [{ id: "1", company: "A", position: "Engineer", employmentType: "Full-time", responsibilities: [], technologies: [], startDate: "2018-01", endDate: "2023-01", isCurrent: false }, { id: "2", company: "B", position: "Engineer", employmentType: "Full-time", responsibilities: [], technologies: [], startDate: "2019-01", endDate: "2020-01", isCurrent: false }];
    expect(Math.round(experienceMonths(jobs as any) / 12)).toBe(5);
    expect(matchCandidateToJD(cand([], [], jobs), jd([], { minYearsExperience: 5 }), "A", "B").experienceCompatibility.isCompatible).toBe(true);
  });
  it("an empty requirement list does not produce a bogus score or fabricated requirements", () => {
    const r = matchCandidateToJD(cand([sk("Python", "Advanced", { p: true })]), jd([]), "A", "B");
    expect(r.missingMandatorySkills).toEqual([]);
    expect(r.warnings?.join(" ")).toMatch(/No recognisable technical skills/);
  });
});

describe("resume tailoring (audit findings H-I)", () => {
  const profile = () => ({
    ...cand(
      [sk("SQL", "Beginner", { p: true }, "Databases"), sk("AWS", "Just started", {}, "Cloud and infrastructure"), sk("HTML", "Advanced", { p: true }, "Programming languages"), sk("JavaScript", "Advanced", { p: true }, "Programming languages")],
      [{ id: "p1", title: "Blog", description: "built a blog site", technologies: ["React", "Node.js", "SQL"], candidateContribution: "Contributed UI components under a senior dev", measurableResults: [] }],
      [{ id: "w1", company: "Co", position: "Intern", responsibilities: ["Responsible for monitoring dashboards", "Worked on bug fixes"], achievements: ["Fixed 12 bugs"], technologies: ["React"], startDate: "2024-01", isCurrent: false }]
    ), fullName: "T", email: "t@e.com",
  });
  const run = (c: any) => { const jd = deterministicExtract("", "Dev"); return tailorResumeContent(c, jd, matchCandidateToJD(c, jd, "Co", "Dev"), "Co", "Dev"); };

  it("H: never adds 'Led', 'Engineered', 'Delivered' or boilerplate claims", () => {
    const t = run(profile());
    const text = JSON.stringify(t);
    for (const bad of ["Led implementation", "Engineered", "Delivered", "Achieved measurable", "clean architecture", "Engineering graduate", "Proven track record"]) expect(text).not.toContain(bad);
    expect(t.tailoredProjects[0].bulletPoints.map((b) => b.tailored)).toContain("Contributed UI components under a senior dev.");
    expect(t.tailoredExperience[0].bulletPoints.map((b) => b.tailored)).toContain("Fixed 12 bugs.");   // achievements are no longer dropped
  });
  it("H: keeps the project's real technologies, preserves acronym casing, lists learning skills separately", () => {
    const t = run(profile());
    expect(t.tailoredProjects[0].technologies).toEqual(expect.arrayContaining(["React", "Node.js", "SQL"]));
    expect(t.professionalSummary.text).not.toMatch(/\b(Sql|Aws|Html)\b/);
    expect(t.learningSkills).toEqual(["AWS"]);
    expect(t.prioritizedSkills.flatMap((c) => c.skills.map((s) => s.name))).not.toContain("AWS");
  });
  it("H: the audit is computed, and warns about unlisted technologies", () => {
    const t = run(profile());
    expect(t.antiFabricationAudit.verdict).toBe("WARNINGS_REVIEWED");
    expect(t.antiFabricationAudit.warnings?.join(" ")).toMatch(/React/);
  });
  it("I: an empty profile produces no broken sentence and says so", () => {
    const t = run({ ...cand([]), fullName: "N", email: "n@e.com" });
    expect(t.professionalSummary.text).toBe("");
    expect(t.antiFabricationAudit.warnings?.join(" ")).toMatch(/No summary/);
  });
});
