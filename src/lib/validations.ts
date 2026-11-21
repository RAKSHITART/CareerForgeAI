import { z } from "zod";
import { PROFICIENCY_LEVELS, SKILL_CATEGORIES } from "./types";
import { canonicalName, categoryFor } from "./skills-catalog";
import { DEFAULT_TEMPLATE_ID, TEMPLATES, getTemplate } from "./templates";

// ---------- primitives ----------
const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
export const PasswordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

const optionalUrl = z
  .string().trim().max(300)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), "Enter a full link starting with http:// or https://")
  .optional().nullable();

const cleanList = (maxItems: number, maxLen: number) =>
  z.array(z.string()).max(maxItems, `At most ${maxItems} items`)
    .transform((a) => Array.from(new Set(a.map((s) => s.trim()).filter(Boolean))))
    .pipe(z.array(z.string().max(maxLen, `Each item must be under ${maxLen} characters`)));

const yearMonth = z.string().trim().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, "Use YYYY or YYYY-MM");
const templateIds = TEMPLATES.map((t) => t.id) as [string, ...string[]];
/** accepts any id the app ever used and maps it to a current template */
const templateField = z.string().max(60).transform((v) => getTemplate(v).id);

// ---------- auth ----------
export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email,
  password: PasswordField,
});
export const LoginSchema = z.object({ email, password: z.string().min(1, "Password is required").max(128) });
export const ForgotPasswordSchema = z.object({ email });
export const ResetPasswordSchema = z.object({
  token: z.string().min(20, "Reset link is invalid").max(200),
  newPassword: PasswordField,
});
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(128),
  newPassword: PasswordField,
});
export const DeleteAccountSchema = z.object({ password: z.string().min(1, "Enter your password to confirm").max(128) });

// ---------- profile ----------
export const CandidateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  email,
  phone: z.string().trim().max(25).refine((v) => v === "" || /^[+()\d\s\-.]{7,25}$/.test(v), "Enter a valid phone number").optional().nullable(),
  location: z.string().trim().max(100).optional().nullable(),
  linkedInUrl: optionalUrl,
  gitHubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  professionalSummary: z.string().trim().max(600, "Keep the summary under 600 characters").optional().nullable(),
  preferredResumeFormat: z.string().default(DEFAULT_TEMPLATE_ID),
  preferredPageCount: z.number().int().min(1).max(3).default(1),
  preferredTemplate: templateField.default(DEFAULT_TEMPLATE_ID),
  includePhoto: z.boolean().default(false),
  photoUrl: z
    .string().max(400_000)
    .refine((v) => v === "" || /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v), "Photo must be a JPG or PNG")
    .optional().nullable(),
  sectionOrder: z.string().max(300).default('["summary","skills","experience","projects","education","certifications"]'),
});

const thisYear = new Date().getFullYear();
export const EducationItemSchema = z
  .object({
    institution: z.string().trim().min(2, "Institution is required").max(150),
    degree: z.string().trim().min(2, "Degree is required").max(100),
    specialization: z.string().trim().min(1, "Specialization is required").max(100),
    startYear: z.number({ invalid_type_error: "Enter a start year" }).int().min(1950, "Start year looks wrong").max(thisYear + 1, "Start year cannot be in the future"),
    graduationYear: z.number({ invalid_type_error: "Enter a graduation year" }).int().min(1950).max(thisYear + 10, "Graduation year is too far ahead"),
    cgpaOrPercentage: z.string().trim().max(30).optional().nullable(),
    relevantCoursework: z.string().trim().max(400).optional().nullable(),
  })
  .refine((e) => e.graduationYear >= e.startYear, { path: ["graduationYear"], message: "Graduation year cannot be before the start year" });

const SkillBase = {
  name: z.string().trim().min(1, "Skill name is required").max(60),
  category: z.string().trim().max(60).optional(),
  proficiencyLevel: z.enum(PROFICIENCY_LEVELS as [string, ...string[]], { errorMap: () => ({ message: "Choose a proficiency level" }) }),
  usedInProject: z.boolean().default(false),
  usedAcademically: z.boolean().default(false),
  usedProfessionally: z.boolean().default(false),
  lastUsedDate: z.string().trim().max(10).optional().nullable(),
  practicalExperienceNotes: z.string().trim().max(500, "Keep notes under 500 characters").optional().nullable(),
};
/** names are stored in catalog spelling; category comes from the catalog unless the skill is custom */
const normaliseSkill = <T extends { name: string; category?: string }>(s: T) => {
  const name = canonicalName(s.name);
  const given = s.category && (SKILL_CATEGORIES as readonly string[]).includes(s.category) ? s.category : "Other";
  return { ...s, name, category: categoryFor(name, given) };
};
export const SkillItemSchema = z.object(SkillBase).transform(normaliseSkill);
export const SkillUpdateSchema = z.object(SkillBase).partial().transform((s) => (s.name ? normaliseSkill(s as any) : s));

export const ProjectItemSchema = z.object({
  title: z.string().trim().min(2, "Project title is required").max(100),
  description: z.string().trim().min(10, "Describe the project in at least 10 characters").max(600),
  problemStatement: z.string().trim().max(400).optional().nullable(),
  technologies: cleanList(20, 40).pipe(z.array(z.string()).min(1, "Add at least one technology")),
  candidateContribution: z.string().trim().min(5, "Describe your own contribution").max(500),
  keyFeatures: cleanList(10, 200).default([]),
  measurableResults: cleanList(10, 200).default([]),
  githubUrl: optionalUrl,
  liveDemoUrl: optionalUrl,
  category: z.string().trim().max(40).default("Full Stack"),
  status: z.string().trim().max(30).default("Completed"),
});

export const ExperienceItemSchema = z
  .object({
    company: z.string().trim().min(2, "Company name is required").max(120),
    position: z.string().trim().min(2, "Position is required").max(100),
    employmentType: z.string().trim().max(30).default("Full-time"),
    startDate: yearMonth,
    endDate: z.string().trim().optional().nullable(),
    isCurrent: z.boolean().default(false),
    responsibilities: cleanList(12, 300).default([]),
    achievements: cleanList(12, 300).default([]),
    technologies: cleanList(20, 40).default([]),
  })
  .superRefine((e, ctx) => {
    if (!e.isCurrent) {
      if (!e.endDate) return ctx.addIssue({ code: "custom", path: ["endDate"], message: "Add an end date or tick \"I currently work here\"" });
      if (!/^\d{4}(-(0[1-9]|1[0-2]))?$/.test(e.endDate)) return ctx.addIssue({ code: "custom", path: ["endDate"], message: "Use YYYY or YYYY-MM" });
      if (e.endDate < e.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date cannot be before the start date" });
    }
  });

export const CertificationItemSchema = z.object({
  name: z.string().trim().min(2, "Certification name is required").max(150),
  issuingOrganization: z.string().trim().min(2, "Issuing organization is required").max(120),
  issueDate: z.string().trim().min(4, "Issue date is required").max(20),
  credentialUrl: optionalUrl,
  credentialId: z.string().trim().max(80).optional().nullable(),
  type: z.string().trim().max(30).default("CERTIFICATION"),
});

/** whole-profile save used by onboarding: validated, then written in one transaction */
export const BulkProfileSchema = z.object({
  profile: CandidateProfileSchema.partial({ preferredTemplate: true, preferredResumeFormat: true, preferredPageCount: true, includePhoto: true, sectionOrder: true }),
  education: z.array(EducationItemSchema).max(10),
  skills: z.array(SkillItemSchema).max(120),
  projects: z.array(ProjectItemSchema).max(20),
  workExperience: z.array(ExperienceItemSchema).max(15),
  certifications: z.array(CertificationItemSchema).max(20),
});

// ---------- jobs, resumes, interviews ----------
export const AnalyzeJDSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(100),
  jobTitle: z.string().trim().min(1, "Job title is required").max(100),
  location: z.string().trim().max(100).optional().nullable(),
  rawText: z.string().trim().min(30, "Paste at least 30 characters of the job description").max(30_000, "Job description is too long (max 30,000 characters)"),
});

export const GenerateResumeSchema = z.object({
  jobDescriptionId: z.string().optional().nullable(),
  targetRole: z.string().trim().min(2, "Target role is required").max(100),
  targetCompany: z.string().trim().min(1, "Target company is required").max(100),
  templateId: templateField.default(DEFAULT_TEMPLATE_ID),
  versionName: z.string().trim().max(120).optional(),
});

export const UpdateResumeSchema = z.object({
  versionName: z.string().trim().min(1).max(120).optional(),
  templateId: templateField.optional(),
  photoUrl: z.string().max(400_000).refine((v) => v === "" || /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v), "Photo must be a JPG or PNG").optional(),
  isPrimary: z.boolean().optional(),
  tailoredContent: z.record(z.any()).optional(),
});

export const StartInterviewSchema = z.object({
  jobDescriptionId: z.string().optional().nullable(),
  resumeVersionId: z.string().optional().nullable(),
  targetRole: z.string().trim().min(2, "Target role is required").max(100),
  targetCompany: z.string().trim().max(100).optional().nullable(),
  interviewType: z.enum(["TECHNICAL", "HR", "BEHAVIORAL", "PROJECT_BASED", "ROLE_SPECIFIC", "MIXED"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("INTERMEDIATE"),
  mode: z.enum(["TEXT", "VOICE"]).default("TEXT"),
  questionCount: z.number().int().min(3).max(10).default(5),
});

export const EvaluateAnswerSchema = z.object({
  sessionId: z.string().optional(),
  questionId: z.string().min(1),
  userResponseText: z.string().trim().min(2, "Write an answer first").max(5000, "Answer is too long (max 5,000 characters)"),
  isVoiceResponse: z.boolean().default(false),
});

export const APPLICATION_STATUSES = ["INTERESTED", "APPLIED", "ASSESSMENT", "INTERVIEW", "SELECTED", "REJECTED"] as const;
const dateStr = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date").optional().nullable().or(z.literal(""));
export const ApplicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(120),
  role: z.string().trim().min(1, "Role is required").max(120),
  appliedDate: dateStr,
  status: z.enum(APPLICATION_STATUSES).default("APPLIED"),
  resumeVersionId: z.string().optional().nullable(),
  interviewDate: dateStr,
  followUpDate: dateStr,
  notes: z.string().trim().max(2000).optional().nullable(),
});
export const ApplicationUpdateSchema = ApplicationSchema.partial();

// ---------- learning ----------
export const CreatePlanSchema = z.object({
  skillName: z.string().trim().min(1, "Choose a skill").max(60),
  targetRole: z.string().trim().max(100).optional().default(""),
  currentProficiency: z.enum(PROFICIENCY_LEVELS as [string, ...string[]]).optional().default("Not familiar"),
  targetProficiency: z.enum(PROFICIENCY_LEVELS as [string, ...string[]]).optional().default("Intermediate"),
});
export const VerifySkillSchema = z.object({
  skillName: z.string().trim().min(1).max(60),
  confirmedProficiency: z.enum(PROFICIENCY_LEVELS as [string, ...string[]]),
  usedInProject: z.boolean().default(false),
  evidenceNote: z.string().trim().max(500).optional().nullable(),
});
