"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Check, Plus, Trash2, Upload } from "lucide-react";
import { BulkProfileSchema } from "@/lib/validations";
import { TEMPLATES } from "@/lib/templates";
import { canonicalKey } from "@/lib/skills-catalog";
import { Badge, Button, Field, ProgressBar, Spinner, api, cx, inputCls, inputErrCls, useUI } from "@/components/ui";
import { SkillDraft, SkillDraftEditor, TechInput, newDraft } from "@/components/SkillPicker";

/* ---------------- draft types (everything a form field edits is a string) ---------------- */
interface Edu { institution: string; degree: string; specialization: string; startYear: string; graduationYear: string; cgpaOrPercentage: string; relevantCoursework: string }
interface Proj { title: string; description: string; problemStatement: string; technologies: string[]; candidateContribution: string; measurableResults: string; githubUrl: string; liveDemoUrl: string; category: string; status: string }
interface Exp { company: string; position: string; employmentType: string; startDate: string; endDate: string; isCurrent: boolean; responsibilities: string; achievements: string; technologies: string[] }
interface Cert { name: string; issuingOrganization: string; issueDate: string; credentialUrl: string }
interface Prof { fullName: string; email: string; phone: string; location: string; linkedInUrl: string; gitHubUrl: string; portfolioUrl: string; professionalSummary: string; preferredTemplate: string; includePhoto: boolean; photoUrl: string }

const emptyEdu = (): Edu => ({ institution: "", degree: "", specialization: "", startYear: "", graduationYear: "", cgpaOrPercentage: "", relevantCoursework: "" });
const emptyProj = (): Proj => ({ title: "", description: "", problemStatement: "", technologies: [], candidateContribution: "", measurableResults: "", githubUrl: "", liveDemoUrl: "", category: "Full Stack", status: "Completed" });
const emptyExp = (): Exp => ({ company: "", position: "", employmentType: "Internship", startDate: "", endDate: "", isCurrent: false, responsibilities: "", achievements: "", technologies: [] });
const emptyCert = (): Cert => ({ name: "", issuingOrganization: "", issueDate: "", credentialUrl: "" });

const STEPS = ["About you", "Education", "Skills", "Projects", "Experience", "Certificates", "Resume style"] as const;
const DRAFT_KEY = "careerforge_onboarding_draft_v2";
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

/** Which payload section each step owns, for showing only that step's errors. */
const STEP_PREFIX: Record<number, string[]> = { 0: ["profile.fullName", "profile.email", "profile.phone", "profile.location", "profile.linkedInUrl", "profile.gitHubUrl", "profile.portfolioUrl", "profile.professionalSummary"], 1: ["education"], 2: ["skills"], 3: ["projects"], 4: ["workExperience"], 5: ["certifications"], 6: ["profile.preferredTemplate", "profile.photoUrl", "profile.includePhoto"] };

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const [prof, setProf] = useState<Prof>({ fullName: "", email: "", phone: "", location: "", linkedInUrl: "", gitHubUrl: "", portfolioUrl: "", professionalSummary: "", preferredTemplate: "google-style", includePhoto: false, photoUrl: "" });
  const [edu, setEdu] = useState<Edu[]>([emptyEdu()]);
  const [skills, setSkills] = useState<SkillDraft[]>([]);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [noProjects, setNoProjects] = useState(false);
  const [exp, setExp] = useState<Exp[]>([]);
  const [noExp, setNoExp] = useState(false);
  const [certs, setCerts] = useState<Cert[]>([]);

  /* ---------------- load existing profile (or restore a local draft) ---------------- */
  useEffect(() => {
    (async () => {
      const r = await api("/api/profile");
      const p = r.data?.profile;
      const hasServerData = p && (p.education?.length || p.skills?.length || p.projects?.length || p.workExperience?.length);
      if (hasServerData) {
        setProf({ fullName: p.fullName || "", email: p.email || "", phone: p.phone || "", location: p.location || "", linkedInUrl: p.linkedInUrl || "", gitHubUrl: p.gitHubUrl || "", portfolioUrl: p.portfolioUrl || "", professionalSummary: p.professionalSummary || "", preferredTemplate: p.preferredTemplate || "google-style", includePhoto: !!p.includePhoto, photoUrl: p.photoUrl || "" });
        setEdu(p.education?.length ? p.education.map((e: any) => ({ institution: e.institution, degree: e.degree, specialization: e.specialization, startYear: String(e.startYear), graduationYear: String(e.graduationYear), cgpaOrPercentage: e.cgpaOrPercentage || "", relevantCoursework: e.relevantCoursework || "" })) : [emptyEdu()]);
        setSkills((p.skills || []).map((s: any) => ({ id: s.id, name: s.name, category: s.category, proficiencyLevel: s.proficiencyLevel, usedInProject: s.usedInProject, usedAcademically: s.usedAcademically, usedProfessionally: s.usedProfessionally, practicalExperienceNotes: s.practicalExperienceNotes || "", lastUsedDate: s.lastUsedDate })));
        setProjects((p.projects || []).map((x: any) => ({ title: x.title, description: x.description, problemStatement: x.problemStatement || "", technologies: x.technologies || [], candidateContribution: x.candidateContribution, measurableResults: (x.measurableResults || []).join("\n"), githubUrl: x.githubUrl || "", liveDemoUrl: x.liveDemoUrl || "", category: x.category, status: x.status })));
        setExp((p.workExperience || []).map((x: any) => ({ company: x.company, position: x.position, employmentType: x.employmentType, startDate: x.startDate, endDate: x.endDate || "", isCurrent: x.isCurrent, responsibilities: (x.responsibilities || []).join("\n"), achievements: (x.achievements || []).join("\n"), technologies: x.technologies || [] })));
        setCerts((p.certifications || []).map((c: any) => ({ name: c.name, issuingOrganization: c.issuingOrganization, issueDate: c.issueDate, credentialUrl: c.credentialUrl || "" })));
        setFurthest(STEPS.length - 1);
        const want = Number(new URLSearchParams(window.location.search).get("step"));
        if (Number.isInteger(want) && want >= 0 && want < STEPS.length) setStep(want);
      } else {
        setProf((x) => ({ ...x, fullName: p?.fullName || "", email: p?.email || "" }));
        try {
          const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
          if (d?.prof) {
            setProf((x) => ({ ...x, ...d.prof })); setEdu(d.edu?.length ? d.edu : [emptyEdu()]); setSkills(d.skills || []); setProjects(d.projects || []);
            setExp(d.exp || []); setCerts(d.certs || []); setNoProjects(!!d.noProjects); setNoExp(!!d.noExp); setStep(d.step || 0); setFurthest(d.furthest || 0);
            toast("Restored your unsaved progress.", "info");
          }
        } catch { /* ignore a corrupt draft */ }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autosave draft locally (never contains a password; cleared after a successful save)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ prof: { ...prof, photoUrl: "" }, edu, skills, projects, exp, certs, noProjects, noExp, step, furthest })); } catch { /* storage full or blocked */ }
    }, 500);
    return () => clearTimeout(t);
  }, [loading, prof, edu, skills, projects, exp, certs, noProjects, noExp, step, furthest]);

  /* ---------------- build payload + validate with the same schema the server uses ---------------- */
  const payload = useMemo(() => ({
    profile: { fullName: prof.fullName, email: prof.email, phone: prof.phone, location: prof.location, linkedInUrl: prof.linkedInUrl, gitHubUrl: prof.gitHubUrl, portfolioUrl: prof.portfolioUrl, professionalSummary: prof.professionalSummary, preferredTemplate: prof.preferredTemplate, includePhoto: prof.includePhoto && !!prof.photoUrl, photoUrl: prof.photoUrl },
    education: edu.filter((e) => Object.values(e).some((v) => v.trim())).map((e) => ({ ...e, startYear: num(e.startYear), graduationYear: num(e.graduationYear) })),
    skills: skills.map((s) => ({ name: s.name, category: s.category, proficiencyLevel: s.proficiencyLevel, usedInProject: s.usedInProject, usedAcademically: s.usedAcademically, usedProfessionally: s.usedProfessionally, practicalExperienceNotes: s.practicalExperienceNotes, lastUsedDate: s.lastUsedDate || null })),
    projects: noProjects ? [] : projects.map((p) => ({ ...p, measurableResults: lines(p.measurableResults), keyFeatures: [] })),
    workExperience: noExp ? [] : exp.map((e) => ({ ...e, endDate: e.isCurrent ? null : e.endDate, responsibilities: lines(e.responsibilities), achievements: lines(e.achievements) })),
    certifications: certs,
  }), [prof, edu, skills, projects, exp, certs, noProjects, noExp]);

  const validate = useCallback((): Record<string, string> => {
    const out: Record<string, string> = {};
    const r = BulkProfileSchema.safeParse(payload);
    if (!r.success) for (const i of r.error.issues) { const k = i.path.join("."); if (!out[k]) out[k] = i.message; }
    if (payload.education.length === 0) out["education._"] = "Add at least one education entry";
    if (skills.length === 0) out["skills._"] = "Pick at least one skill";
    const dup = new Set<string>();
    for (const s of skills) { const k = canonicalKey(s.name); if (dup.has(k)) out["skills._"] = `${s.name} is listed twice`; dup.add(k); }
    return out;
  }, [payload, skills]);

  const stepErrors = (s: number, all: Record<string, string>) => Object.fromEntries(Object.entries(all).filter(([k]) => STEP_PREFIX[s].some((p) => k === p || k.startsWith(p + ".") || k.startsWith(p + "_"))));
  const firstBadStep = (all: Record<string, string>) => STEPS.findIndex((_, i) => Object.keys(stepErrors(i, all)).length > 0);

  const goto = (n: number) => { setStep(n); setFurthest((f) => Math.max(f, n)); topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const next = () => {
    const all = validate();
    const here = stepErrors(step, all);
    setErrors(all);
    if (Object.keys(here).length) { toast("Please fix the highlighted fields to continue.", "error"); return; }
    goto(step + 1);
  };

  const finish = async () => {
    const all = validate();
    setErrors(all);
    const bad = firstBadStep(all);
    if (bad !== -1) { toast(`Step ${bad + 1} (${STEPS[bad]}) needs attention.`, "error"); setStep(bad); return; }
    setSaving(true);
    const r = await api("/api/profile/bulk", { method: "POST", json: payload });
    setSaving(false);
    if (!r.ok) {
      toast(r.error || "Could not save.", "error");
      if (r.fieldErrors) { setErrors(r.fieldErrors); const b = firstBadStep(r.fieldErrors); if (b !== -1) setStep(b); }
      return;
    }
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    const editing = new URLSearchParams(window.location.search).has("step");
    toast(editing ? "Profile updated." : "Profile saved. You're ready to analyze a job.", "success");
    router.push(editing ? "/dashboard/profile" : "/dashboard");
  };

  /* ---------------- helpers for lists ---------------- */
  const E = (k: string) => errors[k];
  const upd = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, i: number, patch: Partial<T>) => set((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const projectTechKeys = useMemo(() => new Set(projects.flatMap((p) => p.technologies).concat(exp.flatMap((e) => e.technologies)).map(canonicalKey)), [projects, exp]);
  const unlistedTechs = useMemo(() => {
    const have = new Set(skills.map((s) => canonicalKey(s.name)));
    const names = [...projects.flatMap((p) => p.technologies), ...exp.flatMap((e) => e.technologies)];
    return Array.from(new Map(names.filter((n) => !have.has(canonicalKey(n))).map((n) => [canonicalKey(n), n])).values());
  }, [projects, exp, skills]);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) { toast("Use a JPG or PNG image.", "error"); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 240, c = document.createElement("canvas"); c.width = size; c.height = size;
      const ctx = c.getContext("2d")!; const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      setProf((p) => ({ ...p, photoUrl: c.toDataURL("image/jpeg", 0.85), includePhoto: true }));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => toast("That image could not be read.", "error");
    img.src = url;
  };

  if (loading) return <div className="min-h-screen bg-slate-50"><Spinner label="Loading your profile" /></div>;

  const inp = (id: string, extra: object = {}) => ({ id, ...extra });
  const bar = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="text-lg font-bold text-slate-900">CareerForge <span className="text-blue-700">AI</span></div>
          <button onClick={() => { toast("Progress is saved on this device. Come back any time.", "info"); router.push("/dashboard"); }} className="text-sm font-medium text-slate-600 hover:text-slate-900">Save & exit</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6" ref={topRef}>
        <nav aria-label="Progress" className="mb-6">
          <ol className="flex gap-1 overflow-x-auto pb-2">
            {STEPS.map((label, i) => {
              const done = i < step, current = i === step, reachable = i <= furthest;
              return (
                <li key={label} className="shrink-0">
                  <button onClick={() => reachable && goto(i)} disabled={!reachable} aria-current={current ? "step" : undefined}
                    className={cx("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium", current ? "bg-blue-600 text-white" : done ? "bg-blue-50 text-blue-800" : "bg-white text-slate-500 ring-1 ring-slate-200", !reachable && "cursor-not-allowed opacity-60")}>
                    <span className={cx("flex h-5 w-5 items-center justify-center rounded-full text-xs", current ? "bg-white/25" : done ? "bg-blue-600 text-white" : "bg-slate-200")}>{done ? <Check className="h-3 w-3" /> : i + 1}</span>{label}
                  </button>
                </li>
              );
            })}
          </ol>
          <ProgressBar value={bar} />
        </nav>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {/* ---------- 1. About you ---------- */}
          {step === 0 && (
            <section aria-labelledby="s0">
              <h1 id="s0" className="text-xl font-bold text-slate-900">Tell us about you</h1>
              <p className="mt-1 text-sm text-slate-500">This appears at the top of your resume. Only your name and email are required.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required error={E("profile.fullName")}>{(p) => <input {...p} className={cx(inputCls, E("profile.fullName") && inputErrCls)} value={prof.fullName} onChange={(e) => setProf({ ...prof, fullName: e.target.value })} autoComplete="name" />}</Field>
                <Field label="Email" required error={E("profile.email")}>{(p) => <input {...p} type="email" className={cx(inputCls, E("profile.email") && inputErrCls)} value={prof.email} onChange={(e) => setProf({ ...prof, email: e.target.value })} autoComplete="email" />}</Field>
                <Field label="Phone" error={E("profile.phone")} hint="Include country code, e.g. +91 98765 43210">{(p) => <input {...p} type="tel" className={cx(inputCls, E("profile.phone") && inputErrCls)} value={prof.phone} onChange={(e) => setProf({ ...prof, phone: e.target.value })} autoComplete="tel" />}</Field>
                <Field label="Location" hint="City, State/Country" error={E("profile.location")}>{(p) => <input {...p} className={inputCls} value={prof.location} onChange={(e) => setProf({ ...prof, location: e.target.value })} />}</Field>
                <Field label="LinkedIn" error={E("profile.linkedInUrl")} hint="Full link starting with https://">{(p) => <input {...p} type="url" className={cx(inputCls, E("profile.linkedInUrl") && inputErrCls)} value={prof.linkedInUrl} onChange={(e) => setProf({ ...prof, linkedInUrl: e.target.value })} placeholder="https://linkedin.com/in/…" />}</Field>
                <Field label="GitHub" error={E("profile.gitHubUrl")}>{(p) => <input {...p} type="url" className={cx(inputCls, E("profile.gitHubUrl") && inputErrCls)} value={prof.gitHubUrl} onChange={(e) => setProf({ ...prof, gitHubUrl: e.target.value })} placeholder="https://github.com/…" />}</Field>
                <Field label="Portfolio / website" error={E("profile.portfolioUrl")} className="sm:col-span-2">{(p) => <input {...p} type="url" className={cx(inputCls, E("profile.portfolioUrl") && inputErrCls)} value={prof.portfolioUrl} onChange={(e) => setProf({ ...prof, portfolioUrl: e.target.value })} placeholder="https://…" />}</Field>
                <Field label="Professional summary (optional)" error={E("profile.professionalSummary")} hint={`${prof.professionalSummary.length}/600. Written in your own words. If you leave it blank, a plain factual summary is built from your evidence-backed skills.`} className="sm:col-span-2">{(p) => <textarea {...p} rows={3} className={cx(inputCls, E("profile.professionalSummary") && inputErrCls)} value={prof.professionalSummary} onChange={(e) => setProf({ ...prof, professionalSummary: e.target.value })} />}</Field>
              </div>
            </section>
          )}

          {/* ---------- 2. Education ---------- */}
          {step === 1 && (
            <section aria-labelledby="s1">
              <h1 id="s1" className="text-xl font-bold text-slate-900">Education</h1>
              <p className="mt-1 text-sm text-slate-500">Add your degree or the one you are pursuing. A graduation year in the future is fine.</p>
              {E("education._") && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{E("education._")}</p>}
              <div className="mt-4 space-y-5">
                {edu.map((e, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">Education {i + 1}</h2>
                      {edu.length > 1 && <button onClick={() => setEdu(edu.filter((_, j) => j !== i))} aria-label={`Remove education ${i + 1}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Institution" required error={E(`education.${i}.institution`)} className="sm:col-span-2">{(p) => <input {...p} className={cx(inputCls, E(`education.${i}.institution`) && inputErrCls)} value={e.institution} onChange={(x) => upd(setEdu, i, { institution: x.target.value })} />}</Field>
                      <Field label="Degree" required error={E(`education.${i}.degree`)}>{(p) => <input {...p} className={cx(inputCls, E(`education.${i}.degree`) && inputErrCls)} value={e.degree} onChange={(x) => upd(setEdu, i, { degree: x.target.value })} placeholder="B.Tech, B.Sc, MCA…" />}</Field>
                      <Field label="Specialization" required error={E(`education.${i}.specialization`)}>{(p) => <input {...p} className={cx(inputCls, E(`education.${i}.specialization`) && inputErrCls)} value={e.specialization} onChange={(x) => upd(setEdu, i, { specialization: x.target.value })} placeholder="Computer Science" />}</Field>
                      <Field label="Start year" required error={E(`education.${i}.startYear`)}>{(p) => <input {...p} type="number" inputMode="numeric" className={cx(inputCls, E(`education.${i}.startYear`) && inputErrCls)} value={e.startYear} onChange={(x) => upd(setEdu, i, { startYear: x.target.value })} placeholder="2021" />}</Field>
                      <Field label="Graduation year (expected is fine)" required error={E(`education.${i}.graduationYear`)}>{(p) => <input {...p} type="number" inputMode="numeric" className={cx(inputCls, E(`education.${i}.graduationYear`) && inputErrCls)} value={e.graduationYear} onChange={(x) => upd(setEdu, i, { graduationYear: x.target.value })} placeholder="2025" />}</Field>
                      <Field label="CGPA / percentage" error={E(`education.${i}.cgpaOrPercentage`)}>{(p) => <input {...p} className={inputCls} value={e.cgpaOrPercentage} onChange={(x) => upd(setEdu, i, { cgpaOrPercentage: x.target.value })} placeholder="8.4 CGPA" />}</Field>
                      <Field label="Relevant coursework" error={E(`education.${i}.relevantCoursework`)}>{(p) => <input {...p} className={inputCls} value={e.relevantCoursework} onChange={(x) => upd(setEdu, i, { relevantCoursework: x.target.value })} placeholder="Data Structures, DBMS, OS" />}</Field>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="mt-4" onClick={() => setEdu([...edu, emptyEdu()])}><Plus className="h-4 w-4" />Add another</Button>
            </section>
          )}

          {/* ---------- 3. Skills ---------- */}
          {step === 2 && (
            <section aria-labelledby="s2">
              <h1 id="s2" className="text-xl font-bold text-slate-900">Your skills</h1>
              <p className="mt-1 text-sm text-slate-500">Pick from the list instead of typing. Be honest about your level: it decides what can appear on a resume, and interviewers will ask.</p>
              {E("skills._") && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{E("skills._")}</p>}
              {Object.entries(errors).filter(([k]) => k.startsWith("skills.") && k !== "skills._").slice(0, 1).map(([k, v]) => <p key={k} role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{v}</p>)}
              <div className="mt-5"><SkillDraftEditor skills={skills} onChange={setSkills} projectTechKeys={projectTechKeys} /></div>
              {skills.length > 0 && skills.length < 5 && <p className="mt-4 text-sm text-slate-500">Tip: most resumes list 8 to 15 skills you can talk about confidently.</p>}
            </section>
          )}

          {/* ---------- 4. Projects ---------- */}
          {step === 3 && (
            <section aria-labelledby="s3">
              <h1 id="s3" className="text-xl font-bold text-slate-900">Projects</h1>
              <p className="mt-1 text-sm text-slate-500">Projects are your strongest evidence. Describe what <em>you</em> did.</p>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" checked={noProjects} onChange={(e) => setNoProjects(e.target.checked)} />I have no projects to add yet</label>
              {!noProjects && (
                <>
                  <div className="mt-4 space-y-5">
                    {projects.map((p, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">Project {i + 1}</h2>
                          <button onClick={() => setProjects(projects.filter((_, j) => j !== i))} aria-label={`Remove project ${i + 1}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Title" required error={E(`projects.${i}.title`)}>{(q) => <input {...q} className={cx(inputCls, E(`projects.${i}.title`) && inputErrCls)} value={p.title} onChange={(x) => upd(setProjects, i, { title: x.target.value })} />}</Field>
                          <Field label="Type">{(q) => <select {...q} className={inputCls} value={p.category} onChange={(x) => upd(setProjects, i, { category: x.target.value })}>{["Full Stack", "Frontend", "Backend", "Mobile", "Data / ML", "DevOps", "Testing / QA", "Other"].map((c) => <option key={c}>{c}</option>)}</select>}</Field>
                          <Field label="What is it?" required error={E(`projects.${i}.description`)} hint="At least 10 characters" className="sm:col-span-2">{(q) => <textarea {...q} rows={2} className={cx(inputCls, E(`projects.${i}.description`) && inputErrCls)} value={p.description} onChange={(x) => upd(setProjects, i, { description: x.target.value })} />}</Field>
                          <Field label="Your own contribution" required error={E(`projects.${i}.candidateContribution`)} hint="Be specific about your part, especially in team projects." className="sm:col-span-2">{(q) => <textarea {...q} rows={2} className={cx(inputCls, E(`projects.${i}.candidateContribution`) && inputErrCls)} value={p.candidateContribution} onChange={(x) => upd(setProjects, i, { candidateContribution: x.target.value })} />}</Field>
                          <div className="sm:col-span-2"><TechInput value={p.technologies} onChange={(v) => upd(setProjects, i, { technologies: v })} error={E(`projects.${i}.technologies`)} /></div>
                          <Field label="Measurable results (one per line, only real numbers)" className="sm:col-span-2">{(q) => <textarea {...q} rows={2} className={inputCls} value={p.measurableResults} onChange={(x) => upd(setProjects, i, { measurableResults: x.target.value })} placeholder="Cut page load time from 4s to 1.5s" />}</Field>
                          <Field label="GitHub link" error={E(`projects.${i}.githubUrl`)}>{(q) => <input {...q} type="url" className={cx(inputCls, E(`projects.${i}.githubUrl`) && inputErrCls)} value={p.githubUrl} onChange={(x) => upd(setProjects, i, { githubUrl: x.target.value })} placeholder="https://github.com/…" />}</Field>
                          <Field label="Live demo link" error={E(`projects.${i}.liveDemoUrl`)}>{(q) => <input {...q} type="url" className={cx(inputCls, E(`projects.${i}.liveDemoUrl`) && inputErrCls)} value={p.liveDemoUrl} onChange={(x) => upd(setProjects, i, { liveDemoUrl: x.target.value })} placeholder="https://…" />}</Field>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="secondary" className="mt-4" onClick={() => setProjects([...projects, emptyProj()])}><Plus className="h-4 w-4" />Add a project</Button>
                </>
              )}
              {unlistedTechs.length > 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">These technologies are in your projects or jobs but not in your skills list:</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{unlistedTechs.map((t) => <Badge key={t} tone="amber">{t}</Badge>)}</div>
                  <Button size="sm" variant="secondary" className="mt-3" onClick={() => setSkills([...skills, ...unlistedTechs.map((t) => ({ ...newDraft(t), usedInProject: true }))])}>Add them as Beginner skills</Button>
                  <p className="mt-1 text-xs text-amber-800">You can adjust the level on the Skills step. Skills you have not declared cannot be verified on your resume.</p>
                </div>
              )}
            </section>
          )}

          {/* ---------- 5. Experience ---------- */}
          {step === 4 && (
            <section aria-labelledby="s4">
              <h1 id="s4" className="text-xl font-bold text-slate-900">Work experience & internships</h1>
              <p className="mt-1 text-sm text-slate-500">Optional. Freshers can skip this.</p>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" checked={noExp} onChange={(e) => setNoExp(e.target.checked)} />I have no work experience yet</label>
              {!noExp && (
                <>
                  <div className="mt-4 space-y-5">
                    {exp.map((x, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">Role {i + 1}</h2>
                          <button onClick={() => setExp(exp.filter((_, j) => j !== i))} aria-label={`Remove role ${i + 1}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Company" required error={E(`workExperience.${i}.company`)}>{(q) => <input {...q} className={cx(inputCls, E(`workExperience.${i}.company`) && inputErrCls)} value={x.company} onChange={(e) => upd(setExp, i, { company: e.target.value })} />}</Field>
                          <Field label="Position" required error={E(`workExperience.${i}.position`)}>{(q) => <input {...q} className={cx(inputCls, E(`workExperience.${i}.position`) && inputErrCls)} value={x.position} onChange={(e) => upd(setExp, i, { position: e.target.value })} />}</Field>
                          <Field label="Type">{(q) => <select {...q} className={inputCls} value={x.employmentType} onChange={(e) => upd(setExp, i, { employmentType: e.target.value })}>{["Internship", "Full-time", "Part-time", "Contract", "Freelance"].map((t) => <option key={t}>{t}</option>)}</select>}</Field>
                          <div />
                          <Field label="Start" required error={E(`workExperience.${i}.startDate`)}>{(q) => <input {...q} type="month" className={cx(inputCls, E(`workExperience.${i}.startDate`) && inputErrCls)} value={x.startDate} onChange={(e) => upd(setExp, i, { startDate: e.target.value })} />}</Field>
                          <Field label="End" error={E(`workExperience.${i}.endDate`)}>{(q) => <input {...q} type="month" disabled={x.isCurrent} className={cx(inputCls, E(`workExperience.${i}.endDate`) && inputErrCls)} value={x.isCurrent ? "" : x.endDate} onChange={(e) => upd(setExp, i, { endDate: e.target.value })} />}</Field>
                          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" checked={x.isCurrent} onChange={(e) => upd(setExp, i, { isCurrent: e.target.checked })} />I currently work here</label>
                          <Field label="What you did (one per line)" hint="Describe your actual duties. Do not inflate your role." className="sm:col-span-2">{(q) => <textarea {...q} rows={3} className={inputCls} value={x.responsibilities} onChange={(e) => upd(setExp, i, { responsibilities: e.target.value })} />}</Field>
                          <Field label="Achievements (one per line, optional)" className="sm:col-span-2">{(q) => <textarea {...q} rows={2} className={inputCls} value={x.achievements} onChange={(e) => upd(setExp, i, { achievements: e.target.value })} />}</Field>
                          <div className="sm:col-span-2"><TechInput value={x.technologies} onChange={(v) => upd(setExp, i, { technologies: v })} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="secondary" className="mt-4" onClick={() => setExp([...exp, emptyExp()])}><Plus className="h-4 w-4" />Add a role</Button>
                </>
              )}
            </section>
          )}

          {/* ---------- 6. Certificates ---------- */}
          {step === 5 && (
            <section aria-labelledby="s5">
              <h1 id="s5" className="text-xl font-bold text-slate-900">Certificates & achievements</h1>
              <p className="mt-1 text-sm text-slate-500">Optional. Only list ones you actually completed.</p>
              <div className="mt-4 space-y-4">
                {certs.map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">Certificate {i + 1}</h2>
                      <button onClick={() => setCerts(certs.filter((_, j) => j !== i))} aria-label={`Remove certificate ${i + 1}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Name" required error={E(`certifications.${i}.name`)}>{(q) => <input {...q} className={cx(inputCls, E(`certifications.${i}.name`) && inputErrCls)} value={c.name} onChange={(e) => upd(setCerts, i, { name: e.target.value })} />}</Field>
                      <Field label="Issued by" required error={E(`certifications.${i}.issuingOrganization`)}>{(q) => <input {...q} className={cx(inputCls, E(`certifications.${i}.issuingOrganization`) && inputErrCls)} value={c.issuingOrganization} onChange={(e) => upd(setCerts, i, { issuingOrganization: e.target.value })} />}</Field>
                      <Field label="Issue date" required error={E(`certifications.${i}.issueDate`)}>{(q) => <input {...q} type="month" className={cx(inputCls, E(`certifications.${i}.issueDate`) && inputErrCls)} value={c.issueDate} onChange={(e) => upd(setCerts, i, { issueDate: e.target.value })} />}</Field>
                      <Field label="Credential link" error={E(`certifications.${i}.credentialUrl`)}>{(q) => <input {...q} type="url" className={cx(inputCls, E(`certifications.${i}.credentialUrl`) && inputErrCls)} value={c.credentialUrl} onChange={(e) => upd(setCerts, i, { credentialUrl: e.target.value })} placeholder="https://…" />}</Field>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="mt-4" onClick={() => setCerts([...certs, emptyCert()])}><Plus className="h-4 w-4" />Add a certificate</Button>
            </section>
          )}

          {/* ---------- 7. Resume style ---------- */}
          {step === 6 && (
            <section aria-labelledby="s6">
              <h1 id="s6" className="text-xl font-bold text-slate-900">Resume style</h1>
              <p className="mt-1 text-sm text-slate-500">Pick a default. You can change it for each resume later.</p>
              <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Template</legend>
                {TEMPLATES.map((t) => (
                  <label key={t.id} className={cx("cursor-pointer rounded-xl border p-4 transition", prof.preferredTemplate === t.id ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/20" : "border-slate-200 hover:border-slate-300")}>
                    <input type="radio" name="tpl" className="sr-only" checked={prof.preferredTemplate === t.id} onChange={() => setProf({ ...prof, preferredTemplate: t.id })} />
                    <div className="flex items-center justify-between"><span className="font-semibold text-slate-900">{t.name}</span>{prof.preferredTemplate === t.id && <Check className="h-4 w-4 text-blue-700" />}</div>
                    <p className="mt-1 text-sm text-slate-500">{t.description}</p>
                  </label>
                ))}
              </fieldset>

              <div className="mt-6 rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                    {prof.photoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={prof.photoUrl} alt="Your resume photo" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7 text-slate-400" aria-hidden />}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-slate-900">Photo (optional)</h2>
                    <p className="text-sm text-slate-500">Many employers, especially in the US and UK, prefer resumes without photos. Add one only if it is customary where you apply.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <Upload className="h-4 w-4" />Upload JPG or PNG<input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
                      </label>
                      {prof.photoUrl && <button onClick={() => setProf({ ...prof, photoUrl: "", includePhoto: false })} className="text-sm font-medium text-rose-600 hover:underline">Remove</button>}
                    </div>
                    {prof.photoUrl && <label className="mt-2 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" checked={prof.includePhoto} onChange={(e) => setProf({ ...prof, includePhoto: e.target.checked })} />Include it on new resumes</label>}
                    {E("profile.photoUrl") && <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{E("profile.photoUrl")}</p>}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <h2 className="mb-2 font-semibold text-slate-900">Ready to save</h2>
                <ul className="grid gap-1 sm:grid-cols-2">
                  <li>{payload.education.length} education {payload.education.length === 1 ? "entry" : "entries"}</li><li>{skills.length} skills</li>
                  <li>{payload.projects.length} projects</li><li>{payload.workExperience.length} roles</li><li>{certs.length} certificates</li>
                </ul>
              </div>
            </section>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="secondary" onClick={() => goto(step - 1)} disabled={step === 0}><ArrowLeft className="h-4 w-4" />Back</Button>
          {step < STEPS.length - 1 ? <Button onClick={next}>Continue<ArrowRight className="h-4 w-4" /></Button> : <Button onClick={finish} loading={saving}>Save profile</Button>}
        </div>
      </main>
    </div>
  );
}
