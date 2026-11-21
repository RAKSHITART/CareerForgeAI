"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Copy, Download, Plus, Printer, RotateCcw, Save, Sparkles, Star, X } from "lucide-react";
import { TailoredBulletPoint, TailoredResumeContent } from "@/lib/types";
import { bulletText } from "@/lib/resume-utils";
import { SAFE_FONTS, TEMPLATES, getTemplate, shortUrl } from "@/lib/templates";
import { PROFICIENCY_LEVELS } from "@/lib/types";
import { Badge, Button, Spinner, api, cx, inputCls, useUI } from "@/components/ui";

const fmtDate = (s?: string | null) => {
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{1,2})/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : s;
};

/* One bullet: shows the text that will really be exported; hover to edit or restore your original wording */
function Bullet({ b, onChange, accent }: { b: TailoredBulletPoint; onChange: (b: TailoredBulletPoint) => void; accent: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const text = bulletText(b);
  const usingOriginal = b.status === "rejected";
  const changed = b.tailored.trim() !== b.original.trim();
  const start = () => { setDraft(text); setEditing(true); };
  const commit = () => {
    const v = draft.trim();
    if (v) onChange({ ...b, tailored: v, status: v === b.original.trim() ? "accepted" : "modified" });
    setEditing(false);
  };
  return (
    <li className="group relative pl-4 text-[1em] leading-snug">
      <span className="absolute left-0 top-[0.55em] h-1 w-1 rounded-full" style={{ background: accent }} aria-hidden />
      {editing ? (
        <span className="no-print block">
          <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} aria-label="Edit bullet text" className={cx(inputCls, "text-sm")}
            onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit(); }} />
          <span className="mt-1 flex gap-2"><button onClick={commit} className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white">Apply</button><button onClick={() => setEditing(false)} className="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button></span>
        </span>
      ) : (
        <>
          <span>{text}</span>
          <span className="no-print ml-2 inline-flex gap-1 align-middle opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            <button onClick={start} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">Edit</button>
            {changed && <button onClick={() => onChange({ ...b, status: usingOriginal ? "accepted" : "rejected" })} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">{usingOriginal ? "Use tidied version" : "Use my original"}</button>}
          </span>
        </>
      )}
    </li>
  );
};


interface Suggestion { name: string; category: string; importance: "required" | "preferred"; reason: string; hint: string }

/** Skills the job asks for that are not on the resume. The user decides; nothing is added automatically. */
function JdSkillsPanel({ items, onAdd, onSkip }: { items: Suggestion[]; onAdd: (name: string, level: string, note: string) => Promise<boolean>; onSkip: (name: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [level, setLevel] = useState("Beginner");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const levels = PROFICIENCY_LEVELS.filter((l) => l !== "Not familiar");
  if (items.length === 0) return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Job skills covered</h2>
      <p className="mt-1 text-sm text-slate-700">Every skill the job lists is on this resume or has been reviewed.</p></section>
  );
  return (
    <section aria-labelledby="jdsk" className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
      <h2 id="jdsk" className="flex items-center gap-2 text-sm font-bold text-slate-900"><Sparkles className="h-5 w-5 text-blue-700" />Skills this job asks for</h2>
      <p className="mt-1 text-sm text-slate-700">Your resume is already built. Review these and add <strong>only the ones you really have</strong>. You choose the level, and they are saved to your profile.</p>
      <ul className="mt-3 space-y-2">
        {items.map((s) => (
          <li key={s.name} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">{s.name} <Badge tone={s.importance === "required" ? "rose" : "slate"}>{s.importance === "required" ? "Required" : "Preferred"}</Badge></span>
              {open !== s.name && <span className="flex gap-1.5">
                <button onClick={() => { setOpen(s.name); setLevel("Beginner"); setNote(""); }} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />I have this</button>
                <button onClick={() => onSkip(s.name)} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">Skip</button></span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">{s.hint}</p>
            {open === s.name && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-xs font-medium text-slate-700" htmlFor={`lv-${s.name}`}>Your honest level</label>
                <select id={`lv-${s.name}`} value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>{levels.map((l) => <option key={l}>{l}</option>)}</select>
                <label className="block text-xs font-medium text-slate-700" htmlFor={`nt-${s.name}`}>What have you done with it? <span className="font-normal text-slate-500">(optional, kept as evidence)</span></label>
                <textarea id={`nt-${s.name}`} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="e.g. Built a REST API with it in my final-year project" />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setOpen(null)}>Cancel</Button>
                  <Button size="sm" loading={busy} onClick={async () => { setBusy(true); const ok = await onAdd(s.name, level, note); setBusy(false); if (ok) setOpen(null); }}>Add to resume</Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ResumeEditorPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ versionName: string; targetRole: string; targetCompany: string; templateId: string; isPrimary: boolean } | null>(null);
  const [snap, setSnap] = useState<any>({});
  const [content, setContent] = useState<TailoredResumeContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = useRef<string>("");
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);

  const load = useCallback(async () => {
    const r = await api(`/api/resumes/${params.id}`);
    if (!r.ok) { toast(r.error || "Could not load this resume.", "error"); setLoading(false); return; }
    const x = r.data.resume;
    setSugs(r.data.suggestions || []);
    const tid = getTemplate(x.templateId).id; // maps ids from older versions to a current template
    setMeta({ versionName: x.versionName, targetRole: x.targetRole, targetCompany: x.targetCompany, templateId: tid, isPrimary: x.isPrimary });
    setSnap(x.snapshotProfileData || {}); setContent(x.tailoredContent); saved.current = JSON.stringify([x.tailoredContent, tid, x.versionName]);
    setLoading(false);
  }, [params.id, toast]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => { if (content && meta) setDirty(JSON.stringify([content, meta.templateId, meta.versionName]) !== saved.current); }, [content, meta]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const tpl = getTemplate(meta?.templateId);
  const style = { fontFamily: content?.style?.fontFamily || tpl.font, accent: content?.style?.accent || `#${tpl.accent}`, fontSize: content?.style?.fontSize || 10.5, includePhoto: !!content?.style?.includePhoto };
  const patch = (fn: (c: TailoredResumeContent) => void) => setContent((c) => { if (!c) return c; const n = JSON.parse(JSON.stringify(c)); fn(n); return n; });
  const setStyle = (s: Partial<typeof style>) => patch((c) => { c.style = { ...style, ...s }; });

  const save = async (quiet = false): Promise<boolean> => {
    if (!content || !meta) return false;
    setSaving(true);
    const r = await api(`/api/resumes/${params.id}`, { method: "PUT", json: { tailoredContent: content, templateId: meta.templateId, versionName: meta.versionName } });
    setSaving(false);
    if (!r.ok) { toast(r.error || "Could not save. Your edits are still here.", "error"); return false; }
    const fixed: TailoredResumeContent = r.data.tailoredContent;
    setContent(fixed); saved.current = JSON.stringify([fixed, meta.templateId, meta.versionName]); setDirty(false);
    const removed = fixed.antiFabricationAudit.exaggerationsRejected || [];
    if (removed.length) toast(`Saved. ${removed.length} item(s) were corrected to match your verified profile. See the audit panel.`, "info");
    else if (!quiet) toast("Resume saved.", "success");
    return true;
  };

  const exportWord = async () => { if (dirty && !(await save(true))) return; window.location.href = `/api/resumes/${params.id}/export-docx`; };
  const duplicate = async () => { if (dirty && !(await save(true))) return; const r = await api(`/api/resumes/${params.id}/duplicate`, { method: "POST" }); if (r.ok) window.location.href = `/dashboard/resumes/${r.data.resume.id}`; else toast(r.error || "Could not duplicate.", "error"); };
  const makePrimary = async () => { const r = await api(`/api/resumes/${params.id}`, { method: "PUT", json: { isPrimary: true } }); if (r.ok && meta) { setMeta({ ...meta, isPrimary: true }); toast("Set as your primary resume.", "success"); } else toast(r.error || "Could not update.", "error"); };
  const pickTemplate = (id: string) => { const t = getTemplate(id); setMeta((m) => (m ? { ...m, templateId: id } : m)); patch((c) => { c.style = { ...(c.style || {}), fontFamily: t.font, accent: `#${t.accent}`, fontSize: 10.5, includePhoto: !!c.style?.includePhoto }; }); };


  const addJdSkill = async (name: string, level: string, note: string): Promise<boolean> => {
    if (dirty && !(await save(true))) return false; // keep unsaved edits: the server copy is the base for the new skill
    const r = await api(`/api/resumes/${params.id}/skills`, { method: "POST", json: { name, level, note } });
    if (!r.ok) { toast(r.error || "Could not add that skill.", "error"); return false; }
    setContent(r.data.tailoredContent); setSugs(r.data.suggestions || []);
    saved.current = JSON.stringify([r.data.tailoredContent, meta?.templateId, meta?.versionName]); setDirty(false);
    toast(`${name} added as ${level}. It is also saved to your profile.`, "success");
    return true;
  };

  const onPhoto = (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) { toast("Use a JPG or PNG image.", "error"); return; }
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = async () => {
      const size = 240, c = document.createElement("canvas"); c.width = size; c.height = size;
      const ctx = c.getContext("2d")!; const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const photoUrl = c.toDataURL("image/jpeg", 0.85);
      const next = content ? { ...content, style: { ...(content.style || {}), includePhoto: true } } : content;
      const r = await api(`/api/resumes/${params.id}`, { method: "PUT", json: { photoUrl, tailoredContent: next } });
      if (!r.ok) { toast(r.error || "Could not save the photo.", "error"); return; }
      setSnap((x: any) => ({ ...x, photoUrl })); setContent(r.data.tailoredContent);
      saved.current = JSON.stringify([r.data.tailoredContent, meta?.templateId, meta?.versionName]); setDirty(false);
      toast("Photo added to this resume.", "success");
    };
    img.onerror = () => toast("That image could not be read.", "error");
    img.src = url;
  };

  const order = useMemo(() => tpl.sectionOrder, [tpl]);
  if (loading) return <Spinner label="Loading resume" />;
  if (!content || !meta) return <div className="p-8 text-center text-slate-600">This resume could not be loaded. <Link href="/dashboard/resumes" className="font-semibold text-blue-700 underline">Back to resumes</Link></div>;

  const audit = content.antiFabricationAudit;
  const px = style.fontSize * tpl.scale;
  const gap = tpl.gap;
  const headColor = tpl.headingColor === "accent" ? style.accent : "#111827";
  const heading = (text: string) => (
    <h2 className="font-bold uppercase" style={{ color: headColor, borderBottom: tpl.headingStyle === "rule" ? `1px solid ${headColor}` : undefined, letterSpacing: "0.06em", fontSize: "1em", margin: `${1.1 * gap}em 0 ${0.35 * gap}em`, paddingBottom: "1px" }}>{text}</h2>
  );
  const link = (label: string, href: string) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{label}</a>;
  const contact: React.ReactNode[] = [];
  for (const t of [snap.email, snap.phone, snap.location].filter(Boolean) as string[]) contact.push(<span key={t}>{t}</span>);
  for (const u of [snap.linkedInUrl, snap.gitHubUrl, snap.portfolioUrl].filter(Boolean) as string[]) contact.push(<span key={u}>{link(shortUrl(u), u)}</span>);
  const canPhoto = typeof snap.photoUrl === "string" && snap.photoUrl.startsWith("data:image");
  const showPhoto = style.includePhoto && canPhoto;
  const visibleSugs = sugs.filter((x) => !skipped.includes(x.name));
  const center = tpl.headerAlign === "center";

  const sections: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section key="summary">
        {heading("Summary")}
        {content.professionalSummary.text ? (
          <>
            <textarea aria-label="Professional summary" value={content.professionalSummary.text} onChange={(e) => patch((c) => { c.professionalSummary.text = e.target.value; c.professionalSummary.honestBasis = "Edited by you."; })} rows={3}
              className="no-print w-full resize-y rounded border border-transparent bg-transparent p-0 leading-snug hover:border-slate-200 focus:border-blue-600 focus:bg-white focus:p-1.5" style={{ fontFamily: "inherit", fontSize: "inherit" }} />
            <p className="print-only hidden leading-snug">{content.professionalSummary.text}</p>
          </>
        ) : (
          <p className="no-print rounded bg-amber-50 p-2 text-xs text-amber-900">No summary yet. <button className="font-semibold underline" onClick={() => patch((c) => { c.professionalSummary.text = "Write your summary here."; })}>Write one</button></p>
        )}
      </section>
    ),
    education: () => snap.education?.length ? (
      <section key="education">{heading("Education")}
        {snap.education.map((e: any, i: number) => (
          <div key={i} style={{ marginTop: `${0.45 * gap}em` }}>
            <div className="flex justify-between gap-3"><strong>{e.institution}</strong><span className="shrink-0">{e.startYear} – {e.graduationYear}</span></div>
            <div className="italic">{e.degree}{e.specialization ? `, ${e.specialization}` : ""}{e.cgpaOrPercentage ? `  |  ${e.cgpaOrPercentage}` : ""}</div>
          </div>))}
      </section>) : null,
    experience: () => content.tailoredExperience.length ? (
      <section key="experience">{heading("Experience")}
        {content.tailoredExperience.map((e, ei) => (
          <div key={e.id} style={{ marginTop: `${0.45 * gap}em` }}>
            <div className="flex justify-between gap-3"><strong>{e.company}</strong><span className="shrink-0">{fmtDate(e.startDate)} – {e.isCurrent ? "Present" : fmtDate(e.endDate)}</span></div>
            <div className="italic">{e.position}{e.employmentType && e.employmentType !== "Full-time" ? `  |  ${e.employmentType}` : ""}</div>
            <ul className="mt-0.5 space-y-0.5">{e.bulletPoints.map((b, bi) => <Bullet key={bi} b={b} accent={headColor} onChange={(nb) => patch((c) => { c.tailoredExperience[ei].bulletPoints[bi] = nb; })} />)}</ul>
            {!!e.technologies?.length && <p className="mt-0.5 pl-4"><strong>Technologies: </strong>{e.technologies.join(", ")}</p>}
          </div>))}
      </section>) : null,
    projects: () => content.tailoredProjects.length ? (
      <section key="projects">{heading("Projects")}
        {content.tailoredProjects.map((p, pi) => (
          <div key={p.id} style={{ marginTop: `${0.45 * gap}em` }}>
            <div className="flex justify-between gap-3">
              <span><strong>{p.title}</strong>{!!p.technologies?.length && <em>  |  {p.technologies.join(", ")}</em>}</span>
              <span className="shrink-0">{p.githubUrl && link("GitHub", p.githubUrl)}{p.githubUrl && p.liveDemoUrl && "  |  "}{p.liveDemoUrl && link("Live demo", p.liveDemoUrl)}</span>
            </div>
            <ul className="mt-0.5 space-y-0.5">{p.bulletPoints.map((b, bi) => <Bullet key={bi} b={b} accent={headColor} onChange={(nb) => patch((c) => { c.tailoredProjects[pi].bulletPoints[bi] = nb; })} />)}</ul>
          </div>))}
      </section>) : null,
    skills: () => (content.prioritizedSkills.length || content.learningSkills?.length) ? (
      <section key="skills">{heading("Technical skills")}
        {content.prioritizedSkills.map((cat, ci) => (
          <p key={cat.category} className="leading-snug" style={{ marginTop: `${0.2 * gap}em` }}><strong>{cat.category}: </strong>
            {cat.skills.map((sk, si) => (
              <span key={sk.name} className="group">{sk.name}
                <button aria-label={`Remove ${sk.name} from this resume`} className="no-print ml-0.5 hidden align-middle text-slate-400 hover:text-rose-600 group-hover:inline" onClick={() => patch((c) => { c.prioritizedSkills[ci].skills.splice(si, 1); c.prioritizedSkills = c.prioritizedSkills.filter((x) => x.skills.length); })}><X className="inline h-3 w-3" /></button>
                {si < cat.skills.length - 1 ? ", " : ""}</span>
            ))}</p>
        ))}
        {!!content.learningSkills?.length && <p className="leading-snug" style={{ marginTop: `${0.2 * gap}em` }}><strong>Currently learning: </strong><em>{content.learningSkills.join(", ")}</em></p>}
      </section>
    ) : null,
    certifications: () => snap.certifications?.length ? (
      <section key="certifications">{heading("Certifications")}
        <ul className="space-y-0.5">{snap.certifications.map((c: any, i: number) => <li key={i} className="relative pl-4"><span className="absolute left-0 top-[0.55em] h-1 w-1 rounded-full" style={{ background: headColor }} />{c.name}, {c.issuingOrganization}{c.issueDate ? ` (${c.issueDate})` : ""}</li>)}</ul>
      </section>) : null,
  };

  return (
    <div className="mx-auto max-w-[1400px] p-3 sm:p-5">
      {/* toolbar */}
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href="/dashboard/resumes" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"><ArrowLeft className="h-4 w-4" />Resumes</Link>
        <label className="sr-only" htmlFor="rname">Resume name</label>
        <input id="rname" value={meta.versionName} onChange={(e) => setMeta({ ...meta, versionName: e.target.value })} maxLength={120} className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-lg font-bold text-slate-900 hover:border-slate-300 focus:border-blue-600 focus:bg-white" />
        <span aria-live="polite" className={cx("text-xs font-medium", dirty ? "text-amber-700" : "text-emerald-700")}>{saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}</span>
        <Button size="sm" onClick={() => save()} loading={saving} disabled={!dirty}><Save className="h-4 w-4" />Save</Button>
        <Button size="sm" variant="secondary" onClick={exportWord}><Download className="h-4 w-4" />Word</Button>
        <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF</Button>
        <Button size="sm" variant="ghost" onClick={duplicate}><Copy className="h-4 w-4" />Duplicate</Button>
        <Button size="sm" variant="ghost" onClick={makePrimary} disabled={meta.isPrimary}><Star className={cx("h-4 w-4", meta.isPrimary && "fill-amber-400 text-amber-500")} />{meta.isPrimary ? "Primary" : "Make primary"}</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* paper */}
        <div className="overflow-x-auto">
          <article className="resume-paper mx-auto min-h-[1000px] w-full max-w-[816px] bg-white px-9 py-8 shadow-md ring-1 ring-slate-200 sm:px-12 sm:py-10" style={{ fontFamily: `"${style.fontFamily}", Arial, sans-serif`, fontSize: `${px * 1.333}px`, lineHeight: 1.3, color: "#111827" }}>
            <header className={cx(center ? "text-center" : "text-left")}>
              {showPhoto && center && /* eslint-disable-next-line @next/next/no-img-element */ <img src={snap.photoUrl} alt="" className="mx-auto mb-2 h-20 w-20 rounded object-cover" />}
              <div className={cx("flex items-center gap-4", center ? "justify-center" : "justify-between")}>
                <div>
                  <h1 className="font-bold" style={{ fontSize: `${tpl.nameScale}em`, lineHeight: 1.15, color: "#111827" }}>{tpl.nameCase === "upper" ? (snap.fullName || "").toUpperCase() : snap.fullName}</h1>
                  <p className="mt-1 text-[0.92em]" style={{ color: "#555" }}>{contact.map((c, i) => <span key={i}>{i > 0 && tpl.contactSep}{c}</span>)}</p>
                </div>
                {showPhoto && !center && /* eslint-disable-next-line @next/next/no-img-element */ <img src={snap.photoUrl} alt="" className="h-[84px] w-[84px] shrink-0 rounded object-cover" />}
              </div>
            </header>
            {order.map((id) => sections[id]?.())}
          </article>
        </div>

        {/* side panels */}
        <aside className="no-print space-y-4">
          <JdSkillsPanel items={visibleSugs} onAdd={addJdSkill} onSkip={(n) => setSkipped((x) => [...x, n])} />

          <section aria-labelledby="aud" className={cx("rounded-xl border p-4", audit.verdict === "STRICTLY_VERIFIED" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
            <h2 id="aud" className="flex items-center gap-2 text-sm font-bold text-slate-900">{audit.verdict === "STRICTLY_VERIFIED" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}Truthfulness check</h2>
            <p className="mt-1 text-sm text-slate-700">{audit.verdict === "STRICTLY_VERIFIED" ? "Every skill here is in your profile at the level you set." : "Review these before you send this resume:"}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
              {audit.exaggerationsRejected?.map((t, i) => <li key={`x${i}`} className="flex gap-2"><span aria-hidden>•</span>{t}</li>)}
              {audit.warnings?.map((t, i) => <li key={`w${i}`} className="flex gap-2"><span aria-hidden>•</span>{t}</li>)}
              {audit.unverifiedSkillsRemoved?.length > 0 && <li className="flex gap-2"><span aria-hidden>•</span>Left off because you marked them “Not familiar”: {audit.unverifiedSkillsRemoved.join(", ")}.</li>}
            </ul>
            {(audit.warnings?.length ?? 0) > 0 && <Link href="/dashboard/skills" className="mt-2 inline-block text-sm font-semibold text-blue-700 underline">Review on the Skills page</Link>}
            <p className="mt-2 text-xs text-slate-500">Text you edit yourself is your own wording. Skills are checked against your profile each time you save.</p>
          </section>

          <section aria-labelledby="tpl" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 id="tpl" className="text-sm font-bold text-slate-900">Template</h2>
            <div className="mt-2 space-y-1.5">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => pickTemplate(t.id)} aria-pressed={meta.templateId === t.id} className={cx("w-full rounded-lg border px-3 py-2 text-left", meta.templateId === t.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50")}>
                  <span className="text-sm font-semibold text-slate-900">{t.name}</span><span className="block text-xs text-slate-500">{t.description}</span></button>))}
            </div>
          </section>

          <section aria-labelledby="pho" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 id="pho" className="text-sm font-bold text-slate-900">Photo</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">{canPhoto ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={snap.photoUrl} alt="Your photo" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6 text-slate-400" aria-hidden />}</div>
              <div className="space-y-1.5">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{canPhoto ? "Change photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
                {canPhoto && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" checked={style.includePhoto} onChange={(e) => setStyle({ includePhoto: e.target.checked })} />Show on resume</label>}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Optional. Many employers (especially in the US and UK) prefer resumes without a photo.</p>
          </section>

          <section aria-labelledby="sty" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 id="sty" className="text-sm font-bold text-slate-900">Style</h2>
            <div className="mt-3 space-y-3">
              <div><label htmlFor="font" className="mb-1 block text-xs font-medium text-slate-600">Font</label><select id="font" className={inputCls} value={style.fontFamily} onChange={(e) => setStyle({ fontFamily: e.target.value })}>{SAFE_FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
              <div><label htmlFor="fs" className="mb-1 block text-xs font-medium text-slate-600">Text size: {style.fontSize} pt</label><input id="fs" type="range" min={9} max={12} step={0.5} value={style.fontSize} onChange={(e) => setStyle({ fontSize: Number(e.target.value) })} className="w-full accent-blue-600" /></div>
              <div className="flex items-center justify-between"><label htmlFor="ac" className="text-xs font-medium text-slate-600">Accent colour</label><input id="ac" type="color" value={style.accent} onChange={(e) => setStyle({ accent: e.target.value })} className="h-8 w-12 cursor-pointer rounded border border-slate-300" /></div>
              <button onClick={() => pickTemplate(meta.templateId)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"><RotateCcw className="h-3.5 w-3.5" />Reset style to template</button>
            </div>
          </section>

          <p className="px-1 text-xs text-slate-500">Hover a bullet to edit it, or switch back to your original wording. Use <Badge tone="slate">Ctrl/⌘ + Enter</Badge> to apply an edit.</p>
        </aside>
      </div>
    </div>
  );
}
