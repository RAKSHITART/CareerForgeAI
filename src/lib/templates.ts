/** Single source of truth for resume templates, used by the preview AND the Word export. */
export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  font: string;          // CSS + Word font name
  accent: string;        // hex without #
  headerAlign: "left" | "center";
  sectionOrder: string[];
  scale: number;         // font-size multiplier
  gap: number;           // spacing multiplier
  headingColor: "accent" | "ink";
  headingStyle: "rule" | "plain";
  nameCase: "upper" | "normal";
  nameScale: number;     // name size relative to body text
  contactSep: string;
}

export const DEFAULT_TEMPLATE_ID = "google-style";
export const DEFAULT_SECTION_ORDER = ["summary", "education", "experience", "projects", "skills", "certifications"];

export const TEMPLATES: ResumeTemplate[] = [
  {
    id: "google-style", name: "Google style",
    description: "Clean single column used by most big-tech applicants. Black and white, ATS-safe.",
    font: "Arial", accent: "111827", headerAlign: "left", sectionOrder: DEFAULT_SECTION_ORDER, scale: 0.95, gap: 1,
    headingColor: "ink", headingStyle: "rule", nameCase: "normal", nameScale: 2.1, contactSep: "  |  ",
  },
  {
    id: "classic-serif", name: "Classic serif",
    description: "Centered header and serif type. The traditional engineering resume.",
    font: "Times New Roman", accent: "111827", headerAlign: "center", sectionOrder: DEFAULT_SECTION_ORDER, scale: 1.05, gap: 1,
    headingColor: "ink", headingStyle: "rule", nameCase: "upper", nameScale: 2.2, contactSep: "  |  ",
  },
  {
    id: "modern-minimal", name: "Modern",
    description: "Teal accent headings and a left-aligned header.",
    font: "Calibri", accent: "0F7F78", headerAlign: "left", sectionOrder: DEFAULT_SECTION_ORDER, scale: 1.02, gap: 1,
    headingColor: "accent", headingStyle: "rule", nameCase: "normal", nameScale: 2.2, contactSep: "  •  ",
  },
  {
    id: "technical-fresher", name: "Technical fresher",
    description: "Skills and projects before education. Best for students with little experience.",
    font: "Calibri", accent: "0F7F78", headerAlign: "left", sectionOrder: ["summary", "skills", "projects", "education", "experience", "certifications"], scale: 1.02, gap: 1,
    headingColor: "accent", headingStyle: "rule", nameCase: "normal", nameScale: 2.1, contactSep: "  •  ",
  },
  {
    id: "experienced-pro", name: "Experienced professional",
    description: "Work experience leads. Education and projects follow.",
    font: "Calibri", accent: "1D4ED8", headerAlign: "left", sectionOrder: ["summary", "experience", "skills", "projects", "education", "certifications"], scale: 1.02, gap: 1,
    headingColor: "accent", headingStyle: "rule", nameCase: "normal", nameScale: 2.1, contactSep: "  |  ",
  },
  {
    id: "compact-one-page", name: "Compact one page",
    description: "Tighter type and spacing to fit everything on a single page.",
    font: "Arial", accent: "111827", headerAlign: "left", sectionOrder: DEFAULT_SECTION_ORDER, scale: 0.88, gap: 0.65,
    headingColor: "ink", headingStyle: "rule", nameCase: "normal", nameScale: 1.9, contactSep: "  |  ",
  },
];

/** ids used by earlier versions of the app */
const ALIASES: Record<string, string> = { "classic-professional": "classic-serif", "two-column": "google-style" };

export function getTemplate(id?: string | null): ResumeTemplate {
  const key = ALIASES[id || ""] || id;
  return TEMPLATES.find((t) => t.id === key) || TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!;
}

export const SAFE_FONTS = ["Arial", "Calibri", "Times New Roman", "Georgia", "Verdana", "Cambria"];

/** "https://www.linkedin.com/in/asha/" -> "linkedin.com/in/asha" */
export function shortUrl(u: string): string {
  return u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}
