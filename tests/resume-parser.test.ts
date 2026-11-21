import { describe, it, expect } from "vitest";
import fs from "fs";
import { parseAndCompareResume } from "@/services/documents/resume-parser";
import { extractTextFromFile } from "@/services/documents/file-text";
import { generateResumeDocx } from "@/services/documents/docx-generator";

describe("resume upload analysis", () => {
  it("no longer throws on C++ / C# and finds them", () => {
    const r = parseAndCompareResume("Skills: C++, C#, Python, React.js", ["Python"]);
    expect(r.missingFromProfile.map((m) => m.name)).toEqual(expect.arrayContaining(["C++", "C#", "React"]));
  });
  it("flags claims that contradict the profile", () => {
    const r = parseAndCompareResume("Expert in Kubernetes and Docker", [{ name: "Kubernetes", proficiencyLevel: "Not familiar" }, { name: "Docker", proficiencyLevel: "Just started" }]);
    expect(r.inconsistencies.join(" ")).toMatch(/Kubernetes.*Not familiar/);
    expect(r.inconsistencies.join(" ")).toMatch(/Docker.*Just started/);
  });
  it("survives empty and hostile input", () => {
    expect(() => parseAndCompareResume("", [])).not.toThrow();
    expect(() => parseAndCompareResume("(((*+?[ \\ ".repeat(1000), ["C++", "a(b"])).not.toThrow();
  });
  it("reads text back out of a real .docx", async () => {
    const buf = await generateResumeDocx({ fullName: "Test Person", email: "t@e.com", education: [] }, {
      targetRole: "x", targetCompany: "y", professionalSummary: { text: "Built Python services with Docker.", highlightedSkills: [], honestBasis: "" },
      prioritizedSkills: [], tailoredProjects: [], tailoredExperience: [], sectionOrdering: [],
      antiFabricationAudit: { checkedAt: "", unverifiedSkillsRemoved: [], exaggerationsRejected: [], verdict: "STRICTLY_VERIFIED" },
    });
    const text = await extractTextFromFile(buf, "r.docx");
    expect(text).toContain("Python services");
  });
  it("rejects unsupported file types", async () => {
    await expect(extractTextFromFile(Buffer.from("x"), "a.exe")).rejects.toThrow("UNSUPPORTED_FILE");
  });
  it("reads a real PDF when one is available", async () => {
    if (!fs.existsSync("/tmp/sample.pdf")) return;
    const text = await extractTextFromFile(fs.readFileSync("/tmp/sample.pdf"), "sample.pdf");
    expect(text).toContain("PDF_SAMPLE_TEXT");
  });
});
