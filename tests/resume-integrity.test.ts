import { describe, it, expect } from "vitest";
import { matchCandidateToJD } from "../src/services/ai/skill-matcher";
import { tailorResumeContent } from "../src/services/ai/resume-tailor";
import { ExtractedJDData } from "../src/lib/types";

describe("CareerForge AI — Anti-Fabrication & Resume Integrity Engine", () => {
  const mockCandidate = {
    fullName: "Alex Rivera",
    email: "alex@careerforge.ai",
    education: [
      {
        institution: "State University",
        degree: "B.S.",
        specialization: "Computer Science",
        startYear: 2020,
        graduationYear: 2024,
      },
    ],
    skills: [
      {
        name: "Java",
        category: "Programming languages",
        proficiencyLevel: "Intermediate",
        usedInProject: true,
        usedAcademically: true,
        usedProfessionally: false,
        evidenceNotes: "University project",
      },
      {
        name: "SQL",
        category: "Databases",
        proficiencyLevel: "Beginner",
        usedInProject: true,
        usedAcademically: true,
        usedProfessionally: false,
      },
      {
        name: "Selenium",
        category: "Software testing",
        proficiencyLevel: "Not familiar",
        usedInProject: false,
        usedAcademically: false,
        usedProfessionally: false,
      },
      {
        name: "API Testing",
        category: "Software testing",
        proficiencyLevel: "Just started",
        usedInProject: false,
        usedAcademically: false,
        usedProfessionally: false,
      },
      {
        name: "Communication",
        category: "Soft skills",
        proficiencyLevel: "Advanced",
        usedInProject: true,
        usedAcademically: true,
        usedProfessionally: true,
      },
      {
        name: "React",
        category: "Frameworks",
        proficiencyLevel: "Advanced",
        usedInProject: true,
        usedAcademically: false,
        usedProfessionally: true,
      },
    ],
    projects: [
      {
        id: "p1",
        title: "TaskFlow Pro",
        description: "Built task management board with React.",
        technologies: ["React", "TypeScript", "Node.js"],
        candidateContribution: "Implemented drag and drop UI.",
        measurableResults: ["Reduced payload by 35%"],
      },
    ],
    workExperience: [
      {
        id: "w1",
        company: "Tech Corp",
        position: "Software Intern",
        employmentType: "Internship",
        startDate: "2023-01",
        endDate: "2023-06",
        isCurrent: false,
        responsibilities: ["Responsible for writing unit tests"],
        technologies: ["React", "TypeScript"],
      },
    ],
  };

  const mockJD: ExtractedJDData = {
    requiredTechnicalSkills: ["Java", "SQL", "Selenium", "Angular", "API Testing"],
    preferredTechnicalSkills: ["Communication", "Docker"],
    programmingLanguages: ["Java"],
    frameworksAndTools: ["Selenium", "Angular"],
    databases: ["SQL"],
    coreCSConcepts: ["Data Structures"],
    educationRequirements: "Bachelor's degree in CS",
    experienceRequirements: "1+ years",
    keyResponsibilities: ["Build scalable software"],
    softSkills: ["Communication"],
    certifications: [],
    atsKeywords: ["Java", "SQL", "Selenium", "Angular", "API Testing"],
  };

  it("RULE 1: Intermediate skill (Java) must be included as Matched", () => {
    const match = matchCandidateToJD(mockCandidate, mockJD, "TestCorp", "Software Engineer");
    const javaMatch = match.matchedSkills.find((s) => s.skillName.toLowerCase() === "java");
    expect(javaMatch).toBeDefined();
    expect(javaMatch?.status).toBe("Matched");
    expect(javaMatch?.candidateProficiency).toBe("Intermediate");
  });

  it("RULE 2: Beginner skill (SQL) must be included with appropriate positioning (Partially matched / junior)", () => {
    const match = matchCandidateToJD(mockCandidate, mockJD, "TestCorp", "Software Engineer");
    const sqlMatch = match.partiallyMatchedSkills.find((s) => s.skillName.toLowerCase() === "sql");
    expect(sqlMatch).toBeDefined();
    expect(sqlMatch?.status).toBe("Partially matched");
    expect(sqlMatch?.candidateProficiency).toBe("Beginner");
  });

  it("RULE 3: Unlearned skill (Selenium marked 'Not familiar') must NEVER be included on resume", () => {
    const match = matchCandidateToJD(mockCandidate, mockJD, "TestCorp", "Software Engineer");
    const seleniumMatch = match.missingMandatorySkills.find((s) => s.skillName.toLowerCase() === "selenium");
    expect(seleniumMatch).toBeDefined();
    expect(seleniumMatch?.status).toBe("Missing");

    // Test tailoring
    const tailored = tailorResumeContent(mockCandidate, mockJD, match, "TestCorp", "Software Engineer");
    const allTailoredSkills = tailored.prioritizedSkills.flatMap((cat) => cat.skills.map((s) => s.name.toLowerCase()));
    expect(allTailoredSkills).not.toContain("selenium");
  });

  it("RULE 4: In-progress skill (API Testing marked 'Just started') must be labeled as Learning and never claimed as proficient", () => {
    const match = matchCandidateToJD(mockCandidate, mockJD, "TestCorp", "Software Engineer");
    const apiTestMatch = match.learningSkills.find((s) => s.skillName.toLowerCase() === "api testing");
    expect(apiTestMatch).toBeDefined();
    expect(apiTestMatch?.status).toBe("Learning");
  });

  it("RULE 5: Strict technology distinction — React knowledge must NEVER substitute for Angular", () => {
    const match = matchCandidateToJD(mockCandidate, mockJD, "TestCorp", "Software Engineer");
    const angularMatch = match.missingMandatorySkills.find((s) => s.skillName.toLowerCase() === "angular");
    expect(angularMatch).toBeDefined();
    expect(angularMatch?.status).toBe("Missing");
    expect(angularMatch?.reasoning).toContain("strictly separate");
  });

  it("RULE 6: Anti-fabrication in projects — verified metrics ('Reduced payload by 35%') remain untouched", () => {
    const match = matchCandidateToJD(mockCandidate, mockJD, "TestCorp", "Software Engineer");
    const tailored = tailorResumeContent(mockCandidate, mockJD, match, "TestCorp", "Software Engineer");
    const proj = tailored.tailoredProjects[0];
    expect(proj.measurableResults).toContain("Reduced payload by 35%");
  });

  it("RULE 7: Master profile must remain strictly immutable when tailoring resumes", () => {
    const candidateCopy = JSON.parse(JSON.stringify(mockCandidate));
    const match = matchCandidateToJD(mockCandidate, mockJD, "TestCorp", "Software Engineer");
    tailorResumeContent(mockCandidate, mockJD, match, "TestCorp", "Software Engineer");

    // Check candidateCopy deep equality
    expect(mockCandidate).toEqual(candidateCopy);
  });
});
