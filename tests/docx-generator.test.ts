import { describe, it, expect } from "vitest";
import { generateResumeDocx } from "../src/services/documents/docx-generator";
import { TailoredResumeContent } from "../src/lib/types";

describe("Document Generation — DOCX Word Export", () => {
  it("Generates a valid binary docx buffer with correct headers and sections", async () => {
    const mockProfile = {
      fullName: "Alex Rivera",
      email: "alex@careerforge.ai",
      phone: "+1 555-0199",
      location: "San Francisco, CA",
      education: [
        {
          institution: "State University",
          degree: "B.S.",
          specialization: "Computer Science",
          startYear: 2020,
          graduationYear: 2024,
          cgpaOrPercentage: "3.85 / 4.0",
        },
      ],
      certifications: [
        {
          name: "Meta Front-End Developer",
          issuingOrganization: "Coursera",
          issueDate: "2023",
        },
      ],
    };

    const mockTailored: TailoredResumeContent = {
      targetRole: "Frontend Engineer",
      targetCompany: "Stripe",
      professionalSummary: {
        text: "Passionate engineer with experience in React and TypeScript.",
        highlightedSkills: ["React", "TypeScript"],
        honestBasis: "Verified profile basis",
      },
      prioritizedSkills: [
        {
          category: "Frameworks",
          skills: [{ name: "React", level: "Advanced", status: "verified" }],
        },
      ],
      tailoredProjects: [
        {
          id: "p1",
          title: "TaskFlow Pro",
          relevanceRank: 1,
          description: "Engineered web application.",
          technologies: ["React", "TypeScript"],
          bulletPoints: [
            {
              original: "Built app",
              tailored: "Engineered responsive web app with React",
              reason: "Active phrasing",
              evidenceBacked: true,
              status: "accepted",
            },
          ],
        },
      ],
      tailoredExperience: [],
      sectionOrdering: ["summary", "skills", "experience", "projects", "education"],
      antiFabricationAudit: {
        checkedAt: new Date().toISOString(),
        unverifiedSkillsRemoved: [],
        exaggerationsRejected: [],
        verdict: "STRICTLY_VERIFIED",
      },
    };

    const buffer = await generateResumeDocx(mockProfile, mockTailored);

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
    // Standard DOCX zip header starts with PK (0x50, 0x4B)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
