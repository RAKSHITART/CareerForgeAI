import { describe, it, expect } from "vitest";
import { BulkProfileSchema, RegisterSchema, SkillItemSchema, SkillUpdateSchema, ApplicationSchema, AnalyzeJDSchema, VerifySkillSchema } from "@/lib/validations";

const good = () => ({
  profile: { fullName: "Asha Rao", email: "Asha@Example.com", phone: "", location: "", linkedInUrl: "", gitHubUrl: "", portfolioUrl: "", professionalSummary: "", preferredTemplate: "modern-minimal", includePhoto: false, photoUrl: "" },
  education: [{ institution: "State University", degree: "B.Tech", specialization: "CSE", startYear: 2021, graduationYear: 2025, cgpaOrPercentage: "", relevantCoursework: "" }],
  skills: [{ name: "reactjs", category: "Other", proficiencyLevel: "Beginner", usedInProject: false, usedAcademically: false, usedProfessionally: false, practicalExperienceNotes: "", lastUsedDate: null }],
  projects: [], workExperience: [], certifications: [],
});
const issues = (r: any) => (r.success ? {} : Object.fromEntries(r.error.issues.map((i: any) => [i.path.join("."), i.message])));

describe("validation (what the wizard and the API enforce)", () => {
  it("accepts a minimal valid profile and normalises it", () => {
    const r = BulkProfileSchema.safeParse(good());
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.skills[0].name).toBe("React"); expect(r.data.skills[0].category).toBe("Frameworks"); expect(r.data.profile.email).toBe("asha@example.com"); }
  });
  it("blank / NaN years give a clear message on the right field", () => {
    const p: any = good(); p.education[0].startYear = NaN;
    expect(issues(BulkProfileSchema.safeParse(p))["education.0.startYear"]).toMatch(/start year/i);
  });
  it("graduation before start is rejected", () => {
    const p: any = good(); p.education[0].graduationYear = 2019;
    expect(issues(BulkProfileSchema.safeParse(p))["education.0.graduationYear"]).toMatch(/before the start/i);
  });
  it("experience needs an end date unless current, and end >= start", () => {
    const p: any = good(); p.workExperience = [{ company: "Acme", position: "Intern", employmentType: "Internship", startDate: "2024-05", endDate: "", isCurrent: false, responsibilities: [], achievements: [], technologies: [] }];
    expect(issues(BulkProfileSchema.safeParse(p))["workExperience.0.endDate"]).toMatch(/end date/i);
    p.workExperience[0].endDate = "2024-01";
    expect(issues(BulkProfileSchema.safeParse(p))["workExperience.0.endDate"]).toMatch(/before/i);
    p.workExperience[0].isCurrent = true; p.workExperience[0].endDate = null;
    expect(BulkProfileSchema.safeParse(p).success).toBe(true);
  });
  it("projects need a technology and drop blank ones", () => {
    const p: any = good(); p.projects = [{ title: "Shop", description: "An online shop app", technologies: ["", "  "], candidateContribution: "I built the cart", measurableResults: [], keyFeatures: [], githubUrl: "", liveDemoUrl: "", category: "Full Stack", status: "Completed" }];
    expect(issues(BulkProfileSchema.safeParse(p))["projects.0.technologies"]).toMatch(/technology/i);
  });
  it("rejects a bad proficiency level (it used to be accepted and counted as a match)", () => {
    expect(SkillItemSchema.safeParse({ name: "Rust", proficiencyLevel: "banana" }).success).toBe(false);
    expect(SkillUpdateSchema.safeParse({ proficiencyLevel: "Senior" }).success).toBe(false);
  });
  it("rejects bad links, phone numbers and oversized photos", () => {
    const p: any = good(); p.profile.linkedInUrl = "linkedin.com/me"; p.profile.phone = "abc"; p.profile.photoUrl = "data:text/html;base64,AAAA";
    const i = issues(BulkProfileSchema.safeParse(p));
    expect(i["profile.linkedInUrl"]).toBeTruthy(); expect(i["profile.phone"]).toBeTruthy(); expect(i["profile.photoUrl"]).toBeTruthy();
  });
  it("password policy and email normalisation", () => {
    expect(RegisterSchema.safeParse({ name: "Al", email: "a@b.co", password: "abcdefgh" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ name: "Al", email: "a@b.co", password: "abc12345" }).success).toBe(true);
    const r = RegisterSchema.parse({ name: "Al", email: "  A@B.Co ", password: "abc12345" });
    expect(r.email).toBe("a@b.co");
  });
  it("applications only accept known statuses and real dates", () => {
    expect(ApplicationSchema.safeParse({ company: "X", role: "Y", status: "HIRED!!" }).success).toBe(false);
    expect(ApplicationSchema.safeParse({ company: "X", role: "Y", followUpDate: "tomorrow" }).success).toBe(false);
    expect(ApplicationSchema.safeParse({ company: "X", role: "Y", status: "APPLIED", followUpDate: "2026-12-01" }).success).toBe(true);
  });
  it("JD text has a minimum and a maximum", () => {
    expect(AnalyzeJDSchema.safeParse({ companyName: "A", jobTitle: "B", rawText: "short" }).success).toBe(false);
    expect(AnalyzeJDSchema.safeParse({ companyName: "A", jobTitle: "B", rawText: "x".repeat(40_000) }).success).toBe(false);
  });
  it("verify-skill needs a valid level", () => {
    expect(VerifySkillSchema.safeParse({ skillName: "Docker", confirmedProficiency: "Wizard" }).success).toBe(false);
  });
});
