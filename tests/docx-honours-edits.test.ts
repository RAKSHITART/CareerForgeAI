import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import { generateResumeDocx } from "@/services/documents/docx-generator";
import { TailoredResumeContent } from "@/lib/types";

const xmlOf = async (t: TailoredResumeContent, opts = {}) => {
  const buf = await generateResumeDocx({ fullName: "A B", email: "a@b.c", portfolioUrl: "https://me.dev", education: [] }, t, opts);
  fs.writeFileSync("/tmp/t.docx", buf);
  return execSync("unzip -p /tmp/t.docx word/document.xml").toString();
};
const base = (): TailoredResumeContent => ({
  targetRole: "Dev", targetCompany: "Co",
  professionalSummary: { text: "", highlightedSkills: [], honestBasis: "" },
  prioritizedSkills: [{ category: "Frameworks", skills: [{ name: "React", level: "Advanced", status: "verified" }] }],
  learningSkills: ["Docker"],
  tailoredProjects: [{ id: "p", title: "Blog", relevanceRank: 1, description: "d", bulletPoints: [
    { original: "Original wording.", tailored: "Edited wording.", reason: "", evidenceBacked: true, status: "rejected" },
    { original: "Keep A.", tailored: "Keep B.", reason: "", evidenceBacked: true, status: "accepted" },
  ], technologies: ["React"], measurableResults: [] }],
  tailoredExperience: [], sectionOrdering: [],
  antiFabricationAudit: { checkedAt: "", unverifiedSkillsRemoved: [], exaggerationsRejected: [], verdict: "STRICTLY_VERIFIED" },
});

describe("DOCX export", () => {
  it("uses the ORIGINAL text for rejected bullets and the edited text for accepted ones", async () => {
    const x = await xmlOf(base());
    expect(x).toContain("Original wording.");
    expect(x).not.toContain("Edited wording.");
    expect(x).toContain("Keep B.");
  });
  it("labels in-progress skills and includes the portfolio link; no empty summary heading", async () => {
    const x = await xmlOf(base());
    expect(x).toContain("Currently learning");
    expect(x).toContain("me.dev");
    expect(x).not.toContain("PROFESSIONAL SUMMARY");
  });
  it("templates really differ (font + section order)", async () => {
    const a = await xmlOf(base(), { templateId: "classic-professional" });
    const b = await xmlOf(base(), { templateId: "google-style" });
    expect(a).toContain("Times New Roman");
    expect(b).toContain("Arial");
    expect(a).not.toEqual(b);
  });
});

describe("DOCX photo", () => {
  it("embeds a profile photo without throwing", async () => {
    // 1x1 transparent PNG
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    const buf = await generateResumeDocx({ fullName: "A B", email: "a@b.c", education: [] }, base(), { photo: { data: png, type: "png" } });
    expect(buf.length).toBeGreaterThan(1000);
    fs.writeFileSync("/tmp/p.docx", buf);
    expect(execSync("unzip -l /tmp/p.docx").toString()).toMatch(/media\//);
  });
});
