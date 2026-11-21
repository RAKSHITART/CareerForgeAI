import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, ImageRun, Packer, Paragraph, Tab, TabStopType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";
import { TailoredResumeContent } from "@/lib/types";
import { bulletText } from "@/lib/resume-utils";
import { getTemplate, shortUrl } from "@/lib/templates";

export interface ResumeProfileData {
  fullName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedInUrl?: string | null;
  gitHubUrl?: string | null;
  portfolioUrl?: string | null;
  education: {
    institution: string; degree: string; specialization: string;
    startYear: number; graduationYear: number; cgpaOrPercentage?: string | null;
  }[];
  certifications?: { name: string; issuingOrganization: string; issueDate: string }[];
}

export interface DocxOptions {
  templateId?: string;
  fontFamily?: string;
  accent?: string;      // hex, with or without #
  fontSize?: number;    // body size in points
  photo?: { data: Buffer; type: "jpg" | "png" } | null;
}

const PAGE_WIDTH = 12240;
const MARGIN = 720;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 10800 twips
const GREY = "555555";

function fmtDate(s?: string | null): string {
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return s;
}

export async function generateResumeDocx(
  profile: ResumeProfileData,
  tailored: TailoredResumeContent,
  opts: DocxOptions = {}
): Promise<Buffer> {
  const tpl = getTemplate(opts.templateId);
  const font = opts.fontFamily || tailored.style?.fontFamily || tpl.font;
  const accent = (opts.accent || tailored.style?.accent || `#${tpl.accent}`).replace("#", "");
  const headColor = tpl.headingColor === "accent" ? accent : "111827";
  const bodyPt = (opts.fontSize || tailored.style?.fontSize || 10.5) * tpl.scale;
  const body = Math.round(bodyPt * 2);                 // Word sizes are half-points
  const sp = (n: number) => Math.round(n * tpl.gap);   // twentieths of a point
  const center = tpl.headerAlign === "center";

  const run = (text: string, o: Record<string, unknown> = {}) => new TextRun({ text, font, size: body, ...o } as any);
  const link = (label: string, url: string, o: Record<string, unknown> = {}) =>
    new ExternalHyperlink({ link: url, children: [new TextRun({ text: label, font, size: body, color: "1D4ED8", underline: {}, ...o } as any)] });

  const heading = (title: string) =>
    new Paragraph({
      keepNext: true,
      spacing: { before: sp(200), after: sp(70) },
      border: tpl.headingStyle === "rule" ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: headColor, space: 1 } } : undefined,
      children: [run(title.toUpperCase(), { bold: true, size: body + 1, color: headColor, characterSpacing: 10 })],
    });

  const bullet = (text: string) =>
    new Paragraph({ bullet: { level: 0 }, indent: { left: 340, hanging: 200 }, spacing: { after: sp(30) }, children: [run(text)] });

  /** bold left text, plain right text on the same line, via a right-aligned tab stop */
  const twoCol = (left: (TextRun | ExternalHyperlink)[], right: (TextRun | ExternalHyperlink)[] | string, after = 0) =>
    new Paragraph({
      keepNext: true,
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
      spacing: { before: sp(90), after },
      children: [...left, ...(typeof right === "string" ? (right ? [new TextRun({ children: [new Tab(), right], font, size: body })] : []) : right.length ? [new TextRun({ children: [new Tab()], font, size: body }), ...right] : [])],
    });
  const subLine = (text: string) => new Paragraph({ keepNext: true, spacing: { after: sp(30) }, children: [run(text, { italics: true })] });

  // ---------------- header ----------------
  const nameRun = run(tpl.nameCase === "upper" ? (profile.fullName || "").toUpperCase() : profile.fullName || "", { bold: true, size: Math.round(body * tpl.nameScale), color: "111827" });
  const contactItems: (TextRun | ExternalHyperlink)[] = [];
  const addSep = () => { if (contactItems.length) contactItems.push(run(tpl.contactSep, { color: GREY })); };
  for (const t of [profile.email, profile.phone, profile.location].filter(Boolean) as string[]) { addSep(); contactItems.push(run(t, { color: GREY })); }
  for (const u of [profile.linkedInUrl, profile.gitHubUrl, profile.portfolioUrl].filter(Boolean) as string[]) { addSep(); contactItems.push(link(shortUrl(u), u)); }

  const align = center ? AlignmentType.CENTER : AlignmentType.LEFT;
  const nameP = new Paragraph({ alignment: align, spacing: { after: sp(50) }, children: [nameRun] });
  const contactP = new Paragraph({ alignment: align, spacing: { after: sp(40) }, children: contactItems });

  const header: (Paragraph | Table)[] = [];
  if (opts.photo && !center) {
    const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const noBorders = { top: none, bottom: none, left: none, right: none };
    header.push(new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: [CONTENT_WIDTH - 1700, 1700],
      borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
      rows: [new TableRow({ children: [
        new TableCell({ borders: noBorders, width: { size: CONTENT_WIDTH - 1700, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [nameP, contactP] }),
        new TableCell({ borders: noBorders, width: { size: 1700, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ data: opts.photo.data, transformation: { width: 84, height: 84 } } as any)] })] }),
      ] })],
    }));
  } else {
    if (opts.photo) header.push(new Paragraph({ alignment: align, spacing: { after: 60 }, children: [new ImageRun({ data: opts.photo.data, transformation: { width: 84, height: 84 } } as any)] }));
    header.push(nameP, contactP);
  }

  // ---------------- sections ----------------
  const sections: Record<string, () => Paragraph[]> = {
    summary: () =>
      tailored.professionalSummary?.text?.trim()
        ? [heading("Summary"), new Paragraph({ spacing: { before: sp(30), after: sp(40) }, children: [run(tailored.professionalSummary.text)] })]
        : [],
    education: () => {
      if (!profile.education?.length) return [];
      const out: Paragraph[] = [heading("Education")];
      for (const e of profile.education) {
        out.push(twoCol([run(e.institution, { bold: true })], `${e.startYear} – ${e.graduationYear}`));
        out.push(subLine(`${e.degree}${e.specialization ? `, ${e.specialization}` : ""}${e.cgpaOrPercentage ? `  |  ${e.cgpaOrPercentage}` : ""}`));
      }
      return out;
    },
    experience: () => {
      const list = tailored.tailoredExperience || [];
      if (!list.length) return [];
      const out: Paragraph[] = [heading("Experience")];
      for (const e of list) {
        out.push(twoCol([run(e.company, { bold: true })], `${fmtDate(e.startDate)} – ${e.isCurrent ? "Present" : fmtDate(e.endDate) || ""}`));
        out.push(subLine(`${e.position}${e.employmentType && e.employmentType !== "Full-time" ? `  |  ${e.employmentType}` : ""}`));
        e.bulletPoints.map(bulletText).filter(Boolean).forEach((t) => out.push(bullet(t)));
        if (e.technologies?.length) out.push(new Paragraph({ indent: { left: 340 }, spacing: { after: sp(40) }, children: [run("Technologies: ", { bold: true }), run(e.technologies.join(", "))] }));
      }
      return out;
    },
    projects: () => {
      const list = tailored.tailoredProjects || [];
      if (!list.length) return [];
      const out: Paragraph[] = [heading("Projects")];
      for (const p of list) {
        const left: (TextRun | ExternalHyperlink)[] = [run(p.title, { bold: true })];
        if (p.technologies?.length) left.push(run(`  |  ${p.technologies.join(", ")}`, { italics: true }));
        const right: (TextRun | ExternalHyperlink)[] = [];
        if (p.githubUrl) right.push(link("GitHub", p.githubUrl));
        if (p.githubUrl && p.liveDemoUrl) right.push(run("  |  ", { color: GREY }));
        if (p.liveDemoUrl) right.push(link("Live demo", p.liveDemoUrl));
        out.push(twoCol(left, right, sp(20)));
        p.bulletPoints.map(bulletText).filter(Boolean).forEach((t) => out.push(bullet(t)));
      }
      return out;
    },
    skills: () => {
      const out: Paragraph[] = [];
      const cats = (tailored.prioritizedSkills || []).filter((c) => c.skills.length);
      if (cats.length || tailored.learningSkills?.length) out.push(heading("Technical skills"));
      for (const c of cats) out.push(new Paragraph({ spacing: { before: sp(20), after: sp(30) }, children: [run(`${c.category}: `, { bold: true }), run(c.skills.map((s) => s.name).join(", "))] }));
      if (tailored.learningSkills?.length) out.push(new Paragraph({ spacing: { before: sp(20), after: sp(30) }, children: [run("Currently learning: ", { bold: true }), run(tailored.learningSkills.join(", "), { italics: true })] }));
      return out;
    },
    certifications: () => {
      if (!profile.certifications?.length) return [];
      return [heading("Certifications"), ...profile.certifications.map((c) => bullet(`${c.name}, ${c.issuingOrganization}${c.issueDate ? ` (${c.issueDate})` : ""}`))];
    },
  };

  const order = opts.templateId ? tpl.sectionOrder : tailored.sectionOrdering?.length ? tailored.sectionOrdering : tpl.sectionOrder;
  const children: (Paragraph | Table)[] = [...header];
  for (const id of order) children.push(...(sections[id]?.() || []));
  for (const id of Object.keys(sections)) if (!order.includes(id)) children.push(...sections[id]());

  const doc = new Document({
    creator: "CareerForge AI",
    title: `${profile.fullName} - Resume`,
    styles: { default: { document: { run: { font, size: body } } } },
    sections: [{ properties: { page: { size: { width: PAGE_WIDTH, height: 15840 }, margin: { top: 648, bottom: 648, left: MARGIN, right: MARGIN } } }, children }],
  });
  return Packer.toBuffer(doc);
}
