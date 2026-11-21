// CareerForge AI Domain Types & Contracts

export type ProficiencyLevel =
  | "Not familiar"
  | "Just started"
  | "Beginner"
  | "Basic working knowledge"
  | "Intermediate"
  | "Advanced"
  | "Expert";

export const PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  "Not familiar",
  "Just started",
  "Beginner",
  "Basic working knowledge",
  "Intermediate",
  "Advanced",
  "Expert",
];

export const SKILL_CATEGORIES = [
  "Programming languages",
  "Frameworks",
  "Databases",
  "AI/ML",
  "Generative AI",
  "Data analytics",
  "Software testing",
  "Developer tools",
  "Cloud and infrastructure",
  "Core computer science",
  "Soft skills",
  "Other",
] as const;

export type SkillCategory = typeof SKILL_CATEGORIES[number];

export const levelRank = (lvl: string): number => PROFICIENCY_LEVELS.indexOf(lvl as ProficiencyLevel);

export type EducationLevel = "any" | "bachelor" | "master" | "phd";

export interface ExtractedJDData {
  requiredTechnicalSkills: string[];
  preferredTechnicalSkills: string[];
  programmingLanguages: string[];
  frameworksAndTools: string[];
  databases: string[];
  coreCSConcepts: string[];
  educationRequirements: string;
  experienceRequirements: string;
  keyResponsibilities: string[];
  softSkills: string[];
  certifications: string[];
  atsKeywords: string[];
  /** structured hints (optional so older saved JDs still load) */
  educationLevel?: EducationLevel;
  minYearsExperience?: number | null;
  extractionSource?: "ai" | "heuristic";
  /** true when no recognisable technical skills were found */
  lowConfidence?: boolean;
}

export type MatchStatus =
  | "Matched"
  | "Partially matched"
  | "Learning"
  | "Missing"
  | "Needs confirmation";

export interface SkillMatchResult {
  skillName: string;
  category: string;
  isMandatory: boolean;
  status: MatchStatus;
  candidateProficiency?: string;
  evidence: string[];
  reasoning: string;
}

export interface JDAnalysisResult {
  jobDescriptionId?: string;
  companyName: string;
  jobTitle: string;
  location?: string;
  overallMatchScore: number; // 0 - 100
  requiredSkillsMatchScore: number;
  preferredSkillsMatchScore: number;
  matchedSkills: SkillMatchResult[];
  partiallyMatchedSkills: SkillMatchResult[];
  learningSkills: SkillMatchResult[];
  missingMandatorySkills: SkillMatchResult[];
  missingPreferredSkills: SkillMatchResult[];
  relevantProjects: {
    projectId: string;
    projectTitle: string;
    matchingTechnologies: string[];
    relevanceReason: string;
  }[];
  educationCompatibility: {
    isCompatible: boolean;
    explanation: string;
  };
  experienceCompatibility: {
    isCompatible: boolean;
    explanation: string;
  };
  suggestedResumeImprovements: {
    area: string;
    actionableAdvice: string;
    honestNote: string;
  }[];
  disclaimer: string;
  warnings?: string[];
  extractionSource?: "ai" | "heuristic";
}

export interface TailoredBulletPoint {
  original: string;
  tailored: string;
  reason: string;
  evidenceBacked: boolean;
  status: "accepted" | "rejected" | "modified";
}

export interface TailoredResumeContent {
  targetRole: string;
  targetCompany: string;
  professionalSummary: {
    text: string;
    highlightedSkills: string[];
    honestBasis: string;
  };
  prioritizedSkills: {
    category: string;
    skills: {
      name: string;
      level: ProficiencyLevel;
      status: "verified" | "learning";
    }[];
  }[];
  tailoredProjects: {
    id: string;
    title: string;
    relevanceRank: number;
    description: string;
    problemStatement?: string;
    bulletPoints: TailoredBulletPoint[];
    technologies: string[];
    measurableResults?: string[];
    githubUrl?: string;
    liveDemoUrl?: string;
  }[];
  tailoredExperience: {
    id: string;
    company: string;
    position: string;
    employmentType: string;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
    bulletPoints: TailoredBulletPoint[];
    technologies: string[];
  }[];
  /** skills the candidate marked "Just started": listed separately, never as proficiencies */
  learningSkills?: string[];
  sectionOrdering: string[];
  style?: { fontFamily?: string; accent?: string; fontSize?: number; includePhoto?: boolean };
  antiFabricationAudit: {
    checkedAt: string;
    unverifiedSkillsRemoved: string[];
    exaggerationsRejected: string[];
    warnings?: string[];
    verdict: "STRICTLY_VERIFIED" | "WARNINGS_REVIEWED";
  };
}

export interface InterviewEvaluationReport {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  knowledgeScore: number;
  summaryFeedback: string;
  strongAreas: string[];
  weakAreas: string[];
  repeatedMistakes: string[];
  recommendedTopics: string[];
  personalizedImprovementPlan: {
    step: number;
    title: string;
    description: string;
    resource: string;
  }[];
}

export interface StructuredRoadmapStage {
  stage: "Beginner" | "Intermediate" | "Advanced";
  estimatedWeeks: number;
  learningObjectives: string[];
  keyTopics: string[];
  practicalExercises: {
    id: string;
    title: string;
    description: string;
    estimatedMinutes: number;
    isCompleted?: boolean;
  }[];
  miniProject: {
    title: string;
    problemStatement: string;
    requirements: string[];
  };
  verifiedResources: {
    title: string;
    provider: string; // e.g. "MDN Web Docs", "freeCodeCamp", "Official Documentation"
    url: string;
    isFree: boolean;
  }[];
}
