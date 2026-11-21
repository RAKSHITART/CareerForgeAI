"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Copy, Download, FilePlus2, FileSearch, FileText, Star, Trash2, Upload } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import { Badge, Button, EmptyState, Field, Modal, Spinner, api, cx, inputCls, useUI } from "@/components/ui";

interface ResumeRow { id: string; versionName: string; targetRole: string; targetCompany: string; templateId: string; isPrimary: boolean; createdAt: string; updatedAt: string }
interface JDRow { id: string; companyName: string; jobTitle: string; overallScore: number }

export default function ResumesPage() {
  const { toast, confirm } = useUI();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [jds, setJds] = useState<JDRow[]>([]);
  const [loading, setLoading] = useState(true);

  // create
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ jobDescriptionId: "", targetRole: "", targetCompany: "", templateId: "google-style" });
  const [fe, setFe] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  // upload check
  const [upOpen, setUpOpen] = useState(false);
  const [upText, setUpText] = useState("");
  const [upBusy, setUpBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  // compare
  const [cmpOpen, setCmpOpen] = useState(false);
  const [cmp, setCmp] = useState<{ a: string; b: string; data: any[] | null }>({ a: "", b: "", data: null });

  const load = useCallback(async () => {
    const [r, j] = await Promise.all([api("/api/resumes/list"), api("/api/jd/list")]);
    if (r.ok) setResumes(r.data.resumes || []); else toast(r.error || "Could not load resumes.", "error");
    if (j.ok) setJds(j.data.jobDescriptions || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
    const sp = new URLSearchParams(window.location.search);
    const jd = sp.get("fromJD");
    if (jd) { setForm((f) => ({ ...f, jobDescriptionId: jd, targetRole: sp.get("role") || "", targetCompany: sp.get("company") || "" })); setCreateOpen(true); }
  }, [load]);

  const pickJD = (id: string) => {
    const jd = jds.find((x) => x.id === id);
    setForm((f) => ({ ...f, jobDescriptionId: id, ...(jd ? { targetRole: jd.jobTitle, targetCompany: jd.companyName } : {}) }));
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setFe({});
    const local: Record<string, string> = {};
    if (form.targetRole.trim().length < 2) local.targetRole = "Enter the role you are applying for";
    if (!form.targetCompany.trim()) local.targetCompany = "Enter the company";
    if (Object.keys(local).length) { setFe(local); return; }
    setCreating(true);
    const r = await api("/api/resumes/generate", { method: "POST", json: { ...form, jobDescriptionId: form.jobDescriptionId || null } });
    setCreating(false);
    if (!r.ok) { setFe(r.fieldErrors || {}); toast(r.error || "Could not create the resume.", "error"); return; }
    window.location.href = `/dashboard/resumes/${r.data.resume.id}`;
  };

  const del = async (r: ResumeRow) => {
    if (!(await confirm({ title: "Delete this resume?", body: `“${r.versionName}” will be permanently deleted. Applications that used it keep their record.`, confirmLabel: "Delete", danger: true }))) return;
    const res = await api(`/api/resumes/${r.id}`, { method: "DELETE" });
    if (res.ok) { setResumes((x) => x.filter((y) => y.id !== r.id)); toast("Resume deleted.", "success"); } else toast(res.error || "Could not delete.", "error");
  };
  const dup = async (r: ResumeRow) => { const res = await api(`/api/resumes/${r.id}/duplicate`, { method: "POST" }); if (res.ok) { toast("Duplicated.", "success"); load(); } else toast(res.error || "Could not duplicate.", "error"); };

  const analyse = async (file?: File) => {
    setUpBusy(true); setReport(null);
    let r;
    if (file) { const fd = new FormData(); fd.append("file", file); r = await api("/api/resumes/analyze-upload", { method: "POST", body: fd }); }
    else r = await api("/api/resumes/analyze-upload", { method: "POST", json: { text: upText } });
    setUpBusy(false);
    if (!r.ok) { toast(r.error || "Could not analyse that resume.", "error"); return; }
    setReport(r.data.report);
  };
  const addSkill = async (name: string, category: string) => {
    const r = await api("/api/profile/skills", { method: "POST", json: { name, category, proficiencyLevel: "Beginner" } });
    if (r.ok || r.status === 409) { setAdded((s) => new Set(s).add(name)); toast(`${name} added as Beginner. Set your real level on the Skills page.`, "success"); } else toast(r.error || "Could not add.", "error");
  };

  const runCompare = async () => {
    const [a, b] = await Promise.all([api(`/api/resumes/${cmp.a}`), api(`/api/resumes/${cmp.b}`)]);
    if (!a.ok || !b.ok) { toast("Could not load both resumes.", "error"); return; }
    setCmp({ ...cmp, data: [a.data.resume, b.data.resume] });
  };
  const skillSet = (r: any) => new Set<string>((r.tailoredContent.prioritizedSkills || []).flatMap((c: any) => c.skills.map((s: any) => s.name)));

  if (loading) return <Spinner label="Loading resumes" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">Resume builder</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Each version is tailored to one job. It reorders and highlights what is true about you. It never adds skills you do not have.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { setReport(null); setUpText(""); setUpOpen(true); }}><FileSearch className="h-4 w-4" />Check an existing resume</Button>
          {resumes.length >= 2 && <Button variant="secondary" onClick={() => { setCmp({ a: resumes[0].id, b: resumes[1].id, data: null }); setCmpOpen(true); }}><ArrowLeftRight className="h-4 w-4" />Compare</Button>}
          <Button onClick={() => setCreateOpen(true)}><FilePlus2 className="h-4 w-4" />New resume</Button>
        </div>
      </header>

      {resumes.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6" />} title="No resumes yet" body="Analyze a job description first for a tailored version, or create a general one from your profile." action={<div className="flex flex-wrap justify-center gap-2"><Link href="/dashboard/jd-analyzer" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Analyze a job</Link><Button onClick={() => setCreateOpen(true)}>Create a resume</Button></div>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resumes.map((r) => (
            <li key={r.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><h2 className="truncate font-semibold text-slate-900">{r.versionName}</h2><p className="truncate text-sm text-slate-600">{r.targetRole} · {r.targetCompany}</p></div>
                {r.isPrimary && <Badge tone="amber"><Star className="h-3 w-3 fill-amber-400" />Primary</Badge>}
              </div>
              <p className="mt-2 text-xs text-slate-500">{TEMPLATES.find((t) => t.id === r.templateId)?.name || r.templateId} · updated {new Date(r.updatedAt).toLocaleDateString()}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/dashboard/resumes/${r.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Open</Link>
                <a href={`/api/resumes/${r.id}/export-docx`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Word</a>
                <button onClick={() => dup(r)} aria-label={`Duplicate ${r.versionName}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Copy className="h-4 w-4" /></button>
                <button onClick={() => del(r)} aria-label={`Delete ${r.versionName}`} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New resume">
        <form onSubmit={create} noValidate className="space-y-4">
          <Field label="Tailor to an analyzed job (optional)" hint={jds.length ? "Picks the role and company for you." : "No analyzed jobs yet. Use the JD Analyzer first for a tailored resume."}>
            {(p) => <select {...p} className={inputCls} value={form.jobDescriptionId} onChange={(e) => pickJD(e.target.value)}><option value="">General resume (no specific job)</option>{jds.map((j) => <option key={j.id} value={j.id}>{j.jobTitle} at {j.companyName} ({j.overallScore}% match)</option>)}</select>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Target role" required error={fe.targetRole}>{(p) => <input {...p} className={inputCls} value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })} />}</Field>
            <Field label="Company" required error={fe.targetCompany}>{(p) => <input {...p} className={inputCls} value={form.targetCompany} onChange={(e) => setForm({ ...form, targetCompany: e.target.value })} />}</Field>
          </div>
          <Field label="Template">{(p) => <select {...p} className={inputCls} value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>{TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}: {t.description}</option>)}</select>}</Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" loading={creating}>Create resume</Button></div>
        </form>
      </Modal>

      {/* upload check */}
      <Modal open={upOpen} onClose={() => setUpOpen(false)} title="Check an existing resume" wide>
        <p className="text-sm text-slate-600">Upload a resume or paste its text. We compare the skills it mentions with your verified profile and flag anything that does not line up. Nothing is stored.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Upload className="h-4 w-4" />Upload PDF, DOCX or TXT<input type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) analyse(f); e.target.value = ""; }} /></label>
          <span className="text-sm text-slate-500">or paste below</span>
        </div>
        <label htmlFor="uptext" className="sr-only">Resume text</label>
        <textarea id="uptext" rows={6} className={cx(inputCls, "mt-3")} placeholder="Paste your resume text here…" value={upText} onChange={(e) => setUpText(e.target.value)} />
        <div className="mt-3 flex justify-end"><Button onClick={() => analyse()} loading={upBusy} disabled={upText.trim().length < 30}>Analyze pasted text</Button></div>

        {report && (
          <div className="mt-5 space-y-4 border-t border-slate-200 pt-4" aria-live="polite">
            {report.inconsistencies.length > 0 && <div><h3 className="text-sm font-semibold text-slate-900">Things to fix</h3><ul className="mt-1 space-y-1 text-sm text-slate-700">{report.inconsistencies.map((t: string, i: number) => <li key={i} className="flex gap-2"><span aria-hidden className="text-amber-600">•</span>{t}</li>)}</ul></div>}
            {report.missingFromProfile.length > 0 && (
              <div><h3 className="text-sm font-semibold text-slate-900">In your resume but not in your profile</h3>
                <p className="text-xs text-slate-500">Add only the ones you can genuinely discuss in an interview.</p>
                <div className="mt-2 flex flex-wrap gap-2">{report.missingFromProfile.map((m: any) => added.has(m.name)
                  ? <Badge key={m.name} tone="green">{m.name} added</Badge>
                  : <button key={m.name} onClick={() => addSkill(m.name, m.category)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium hover:border-blue-500 hover:bg-blue-50">+ {m.name}</button>)}</div></div>
            )}
            <ul className="space-y-1 text-sm text-slate-600">{report.suggestions.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
          </div>
        )}
      </Modal>

      {/* compare */}
      <Modal open={cmpOpen} onClose={() => setCmpOpen(false)} title="Compare two versions" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["a", "b"] as const).map((k) => (
            <Field key={k} label={k === "a" ? "Version A" : "Version B"}>{(p) => <select {...p} className={inputCls} value={cmp[k]} onChange={(e) => setCmp({ ...cmp, [k]: e.target.value, data: null })}>{resumes.map((r) => <option key={r.id} value={r.id}>{r.versionName}</option>)}</select>}</Field>
          ))}
        </div>
        <div className="mt-3"><Button onClick={runCompare} disabled={!cmp.a || !cmp.b || cmp.a === cmp.b}>Compare</Button></div>
        {cmp.data && (() => {
          const [A, B] = cmp.data; const sa = skillSet(A), sb = skillSet(B);
          const onlyA = [...sa].filter((x) => !sb.has(x)), onlyB = [...sb].filter((x) => !sa.has(x));
          const rows: [string, string, string][] = [
            ["Template", A.templateId, B.templateId],
            ["Project order", (A.tailoredContent.tailoredProjects || []).map((p: any) => p.title).join(" → ") || "none", (B.tailoredContent.tailoredProjects || []).map((p: any) => p.title).join(" → ") || "none"],
            ["Summary", A.tailoredContent.professionalSummary?.text || "none", B.tailoredContent.professionalSummary?.text || "none"],
            ["Only in this version (skills)", onlyA.join(", ") || "nothing", onlyB.join(", ") || "nothing"],
          ];
          return <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2 pr-3"></th><th className="py-2 pr-3">A</th><th className="py-2">B</th></tr></thead>
            <tbody>{rows.map(([l, a, b]) => <tr key={l} className="border-b align-top"><th className="py-2 pr-3 font-medium text-slate-600">{l}</th><td className="py-2 pr-3">{a}</td><td className={cx("py-2", a !== b && "bg-amber-50")}>{b}</td></tr>)}</tbody></table></div>;
        })()}
      </Modal>
    </div>
  );
}
