"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, CheckCircle2, FilePlus2, HelpCircle, MessagesSquare, RefreshCw, Trash2, Upload, XCircle } from "lucide-react";
import { Badge, Button, EmptyState, Field, ProgressBar, Spinner, api, cx, inputCls, inputErrCls, useUI } from "@/components/ui";

interface Skill { skillName: string; status: string; reasoning: string; candidateProficiency?: string; evidence: string[]; isMandatory: boolean }
interface Analysis {
  jobDescriptionId: string; companyName: string; jobTitle: string; overallMatchScore: number; requiredSkillsMatchScore: number; preferredSkillsMatchScore: number;
  matchedSkills: Skill[]; partiallyMatchedSkills: Skill[]; learningSkills: Skill[]; missingMandatorySkills: Skill[]; missingPreferredSkills: Skill[];
  relevantProjects: { projectId: string; projectTitle: string; matchingTechnologies: string[]; relevanceReason: string }[];
  educationCompatibility: { isCompatible: boolean; explanation: string }; experienceCompatibility: { isCompatible: boolean; explanation: string };
  suggestedResumeImprovements: { area: string; actionableAdvice: string; honestNote: string }[]; disclaimer: string; warnings?: string[]; extractionSource?: "ai" | "heuristic";
}
interface Saved { id: string; companyName: string; jobTitle: string; overallScore: number; missingCount: number; createdAt: string }

const band = (n: number) => (n >= 75 ? { t: "Strong match", c: "text-emerald-700", bar: "green" as const } : n >= 50 ? { t: "Partial match", c: "text-amber-700", bar: "amber" as const } : { t: "Significant gaps", c: "text-rose-700", bar: "blue" as const });

export default function JDAnalyzerPage() {
  const { toast, confirm } = useUI();
  const [form, setForm] = useState({ companyName: "", jobTitle: "", location: "", rawText: "" });
  const [fe, setFe] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = useCallback(async () => {
    const r = await api("/api/jd/list");
    if (r.ok) setSaved(r.data.jobDescriptions || []);
    setLoadingSaved(false);
  }, []);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault(); setFe({});
    const local: Record<string, string> = {};
    if (!form.companyName.trim()) local.companyName = "Enter the company name";
    if (!form.jobTitle.trim()) local.jobTitle = "Enter the job title";
    if (form.rawText.trim().length < 30) local.rawText = `Paste at least 30 characters (you have ${form.rawText.trim().length})`;
    if (form.rawText.length > 30000) local.rawText = "That is too long. The limit is 30,000 characters.";
    if (Object.keys(local).length) { setFe(local); return; }
    setBusy(true);
    const r = await api("/api/jd/analyze", { method: "POST", json: form });
    setBusy(false);
    if (!r.ok) { setFe(r.fieldErrors || {}); toast(r.error || "Analysis failed.", "error"); return; }
    setResult(r.data.analysis); loadSaved();
    setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setReading(true);
    const fd = new FormData(); fd.append("file", file);
    const r = await api("/api/jd/extract-file", { method: "POST", body: fd });
    setReading(false);
    if (!r.ok) { toast(r.error || "Could not read the file.", "error"); return; }
    setForm((f) => ({ ...f, rawText: r.data.text.slice(0, 30000) })); toast("File text added. Check it, then analyze.", "success");
  };

  const open = async (id: string, reextract = false) => {
    setRefreshing(true);
    const r = reextract || result?.jobDescriptionId === id ? await api(`/api/jd/${id}`, { method: "POST", json: { reextract } }) : await api(`/api/jd/${id}`);
    setRefreshing(false);
    if (!r.ok) { toast(r.error || "Could not load that analysis.", "error"); return; }
    setResult(r.data.analysis); loadSaved();
    if (reextract || result?.jobDescriptionId === id) toast("Re-analyzed against your current profile.", "success");
    setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const remove = async (s: Saved) => {
    if (!(await confirm({ title: "Delete this analysis?", body: `${s.jobTitle} at ${s.companyName} will be removed.`, confirmLabel: "Delete", danger: true }))) return;
    const r = await api(`/api/jd/${s.id}`, { method: "DELETE" });
    if (r.ok) { setSaved((x) => x.filter((y) => y.id !== s.id)); if (result?.jobDescriptionId === s.id) setResult(null); toast("Deleted.", "success"); } else toast(r.error || "Could not delete.", "error");
  };

  const SkillList = ({ title, icon, tone, items, help, learn }: { title: string; icon: React.ReactNode; tone: "green" | "amber" | "blue" | "rose" | "slate"; items: Skill[]; help?: string; learn?: boolean }) =>
    items.length === 0 ? null : (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">{icon}{title} <Badge tone={tone}>{items.length}</Badge></h3>
        {help && <p className="mt-1 text-xs text-slate-500">{help}</p>}
        <ul className="mt-3 space-y-2.5">
          {items.map((s) => (
            <li key={s.skillName} className="rounded-lg bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-slate-900">{s.skillName}{s.candidateProficiency && <span className="ml-2 text-xs font-normal text-slate-500">your level: {s.candidateProficiency}</span>}</span>
                {learn && <Link href={`/dashboard/skill-growth?skill=${encodeURIComponent(s.skillName)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"><BookOpen className="h-3.5 w-3.5" />Build this skill</Link>}
                {s.status === "Needs confirmation" && <Link href="/dashboard/skills" className="text-xs font-semibold text-blue-700 hover:underline">Add evidence</Link>}</div>
              <p className="mt-0.5 text-sm text-slate-600">{s.reasoning}</p>
              {s.evidence.length > 0 && <p className="mt-1 text-xs text-slate-500">Evidence: {s.evidence.slice(0, 3).join(" · ")}</p>}
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <header><h1 className="text-2xl font-bold text-slate-900">Job description analyzer</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Paste a job posting (or upload it). We list what it asks for and compare it to your verified profile. Missing skills are never added for you.</p></header>

      <form onSubmit={analyze} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Company" required error={fe.companyName}>{(p) => <input {...p} className={cx(inputCls, fe.companyName && inputErrCls)} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />}</Field>
          <Field label="Job title" required error={fe.jobTitle}>{(p) => <input {...p} className={cx(inputCls, fe.jobTitle && inputErrCls)} value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />}</Field>
          <Field label="Location" hint="Optional">{(p) => <input {...p} className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />}</Field>
        </div>
        <Field label="Job description" required error={fe.rawText} hint={`${form.rawText.length.toLocaleString()} / 30,000 characters. Include the requirements section for the best result.`}>
          {(p) => <textarea {...p} rows={10} className={cx(inputCls, fe.rawText && inputErrCls)} value={form.rawText} onChange={(e) => setForm({ ...form, rawText: e.target.value })} placeholder="Paste the full job posting here…" />}
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className={cx("inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50", reading && "opacity-60")}>
            <Upload className="h-4 w-4" />{reading ? "Reading file…" : "Upload PDF, DOCX or TXT"}<input type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" disabled={reading} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <Button type="submit" loading={busy}>Analyze match</Button>
        </div>
      </form>

      {/* saved */}
      <section aria-labelledby="recent">
        <h2 id="recent" className="mb-3 text-lg font-semibold text-slate-900">Your analyzed jobs</h2>
        {loadingSaved ? <Spinner /> : saved.length === 0 ? <p className="text-sm text-slate-500">Nothing yet. Your analyses are saved here so you can reopen them, re-run them after improving your profile, and build resumes from them.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((s) => { const b = band(s.overallScore); return (
              <li key={s.id} className={cx("flex items-start gap-2 rounded-xl border bg-white p-3", result?.jobDescriptionId === s.id ? "border-blue-600 ring-2 ring-blue-600/20" : "border-slate-200")}>
                <button onClick={() => open(s.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold text-slate-900">{s.jobTitle}</p><p className="truncate text-sm text-slate-600">{s.companyName}</p>
                  <p className={cx("mt-1 text-sm font-semibold", b.c)}>{s.overallScore}% <span className="font-normal text-slate-500">· {s.missingCount} required missing</span></p>
                </button>
                <button onClick={() => remove(s)} aria-label={`Delete ${s.jobTitle} at ${s.companyName}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </li>); })}
          </ul>
        )}
      </section>

      {/* results */}
      <div id="results" className="scroll-mt-4">
        {refreshing && <Spinner label="Analyzing" />}
        {!refreshing && result && (() => { const b = band(result.overallMatchScore); return (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-xl font-bold text-slate-900">{result.jobTitle} at {result.companyName}</h2>
                  <p className={cx("mt-1 text-3xl font-bold", b.c)}>{result.overallMatchScore}% <span className="text-base font-semibold">{b.t}</span></p>
                  <p className="mt-1 text-xs text-slate-500">Requirements read by {result.extractionSource === "ai" ? "AI" : "the built-in engine"}. {result.disclaimer}</p></div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/resumes?fromJD=${result.jobDescriptionId}&role=${encodeURIComponent(result.jobTitle)}&company=${encodeURIComponent(result.companyName)}`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><FilePlus2 className="h-4 w-4" />Tailored resume</Link>
                  <Link href={`/dashboard/interviews?jd=${result.jobDescriptionId}&role=${encodeURIComponent(result.jobTitle)}&company=${encodeURIComponent(result.companyName)}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MessagesSquare className="h-4 w-4" />Practice interview</Link>
                  <Button variant="secondary" onClick={() => open(result.jobDescriptionId, false)}><RefreshCw className="h-4 w-4" />Re-analyze</Button>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {([["Required skills", result.requiredSkillsMatchScore], ["Preferred skills", result.preferredSkillsMatchScore]] as const).map(([l, v]) => (
                  <div key={l}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{l}</span><span className="font-semibold text-slate-900">{v}%</span></div><ProgressBar value={v} tone={band(v).bar} /></div>))}
              </div>
              {result.warnings?.map((w, i) => <p key={i} role="alert" className="mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{w}</p>)}
              <button onClick={() => open(result.jobDescriptionId, true)} className="mt-3 text-xs font-medium text-slate-500 underline hover:text-slate-800">Requirements look wrong? Re-read them from the original text</button>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <SkillList title="Verified matches" icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} tone="green" items={result.matchedSkills} />
              <SkillList title="Needs attention" icon={<HelpCircle className="h-5 w-5 text-amber-600" />} tone="amber" items={result.partiallyMatchedSkills} help="Beginner-level skills, or skills you rated highly without evidence." />
              <SkillList title="You are learning" icon={<BookOpen className="h-5 w-5 text-blue-600" />} tone="blue" items={result.learningSkills} help="Shown as in-progress on your resume, never as a skill." />
              <SkillList title="Required skills you lack" icon={<XCircle className="h-5 w-5 text-rose-600" />} tone="rose" items={result.missingMandatorySkills} learn />
              <SkillList title="Preferred skills you lack" icon={<XCircle className="h-5 w-5 text-slate-400" />} tone="slate" items={result.missingPreferredSkills} learn />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {([["Education", result.educationCompatibility], ["Experience", result.experienceCompatibility]] as const).map(([l, c]) => (
                <section key={l} className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="flex items-center gap-2 font-semibold text-slate-900">{l} {c.isCompatible ? <Badge tone="green">Compatible</Badge> : <Badge tone="amber">Check</Badge>}</h3><p className="mt-1 text-sm text-slate-600">{c.explanation}</p></section>))}
            </div>

            {result.relevantProjects.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-semibold text-slate-900">Your most relevant projects</h3>
                <ul className="mt-2 space-y-2">{result.relevantProjects.map((p) => <li key={p.projectId} className="text-sm"><span className="font-medium text-slate-900">{p.projectTitle}</span> <span className="text-slate-500">· {p.matchingTechnologies.join(", ")}</span></li>)}</ul></section>
            )}
            <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-semibold text-slate-900">What to do next</h3>
              <ul className="mt-2 space-y-3">{result.suggestedResumeImprovements.map((s) => <li key={s.area} className="text-sm"><p className="font-medium text-slate-900">{s.area}</p><p className="text-slate-600">{s.actionableAdvice}</p><p className="text-xs text-slate-500">{s.honestNote}</p></li>)}</ul></section>
          </div>); })()}
        {!refreshing && !result && saved.length === 0 && <EmptyState icon={<FilePlus2 className="h-6 w-6" />} title="Analyze your first job" body="Paste a job description above to see how well your verified profile fits and what to work on." />}
      </div>
    </div>
  );
}
