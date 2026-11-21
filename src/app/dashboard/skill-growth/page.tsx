"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, ExternalLink, Plus, Rocket, Trash2 } from "lucide-react";
import { PROFICIENCY_LEVELS, levelRank } from "@/lib/types";
import { canonicalKey, canonicalName } from "@/lib/skills-catalog";
import { generateSkillRoadmap } from "@/services/ai/learning-planner";
import { Badge, Button, EmptyState, Field, Modal, ProgressBar, Spinner, api, cx, inputCls, useUI } from "@/components/ui";
import { SkillCatalogPicker } from "@/components/SkillPicker";

interface Exercise { id: string; title: string; description: string; estimatedMinutes: number; isCompleted: boolean }
interface Stage { stage: string; estimatedWeeks: number; learningObjectives: string[]; keyTopics: string[]; practicalExercises: Exercise[]; miniProject: { title: string; problemStatement: string; requirements: string[] }; verifiedResources: { title: string; provider: string; url: string; isFree: boolean }[] }
interface Plan { id: string; skillName: string; targetRole: string; currentProficiency: string; targetProficiency: string; status: string; progressPercent: number; roadmapStages: Stage[] }

/** Same rule the server enforces, shown up front so nobody is surprised. */
const capFor = (progress: number, hasNote: boolean) => (progress < 30 ? null : progress < 60 ? "Just started" : progress < 100 ? "Beginner" : hasNote ? "Intermediate" : "Basic working knowledge");

export default function SkillGrowthPage() {
  const { toast, confirm } = useUI();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startOpen, setStartOpen] = useState(false);
  const [target, setTarget] = useState("Intermediate");
  const [role, setRole] = useState("");
  const [busyEx, setBusyEx] = useState<string | null>(null);
  const [verOpen, setVerOpen] = useState(false);
  const [ver, setVer] = useState({ level: "Beginner", note: "", usedInProject: false });
  const [verErr, setVerErr] = useState<Record<string, string>>({});
  const [verBusy, setVerBusy] = useState(false);

  const load = useCallback(async (select?: string) => {
    const r = await api("/api/learning/plans");
    if (r.ok) { setPlans(r.data.plans || []); setSel((cur) => select ?? cur ?? r.data.plans?.[0]?.id ?? null); }
    else toast(r.error || "Could not load your roadmaps.", "error");
    setLoading(false);
    return r.ok ? (r.data.plans as Plan[]) : [];
  }, [toast]);

  const start = useCallback(async (skill: string, tgt = target, tRole = role) => {
    const r = await api("/api/learning/plans", { method: "POST", json: { skillName: skill, targetRole: tRole, targetProficiency: tgt } });
    if (!r.ok) { toast(r.error || "Could not start that roadmap.", "error"); return; }
    setStartOpen(false);
    await load(r.data.plan.id);
    toast(r.data.existing ? `You already have a ${r.data.plan.skillName} roadmap. Opened it.` : `Roadmap for ${r.data.plan.skillName} created.`, "success");
  }, [load, role, target, toast]);

  useEffect(() => {
    (async () => {
      const list = await load();
      const wanted = new URLSearchParams(window.location.search).get("skill");
      if (wanted) { const hit = list.find((p) => canonicalKey(p.skillName) === canonicalKey(wanted)); if (hit) setSel(hit.id); else await start(wanted); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = plans.find((p) => p.id === sel) || null;

  const toggle = async (ex: Exercise) => {
    if (!plan) return;
    setBusyEx(ex.id);
    const r = await api(`/api/learning/plans/${plan.id}`, { method: "PUT", json: { exerciseId: ex.id, isCompleted: !ex.isCompleted } });
    setBusyEx(null);
    if (!r.ok) { toast(r.error || "Could not update that exercise.", "error"); return; }
    setPlans((ps) => ps.map((p) => (p.id === plan.id ? { ...p, ...r.data.plan } : p)));
  };

  const remove = async () => {
    if (!plan || !(await confirm({ title: `Delete the ${plan.skillName} roadmap?`, body: "Your progress on it will be lost. Skills already added to your profile stay.", confirmLabel: "Delete", danger: true }))) return;
    const r = await api(`/api/learning/plans/${plan.id}`, { method: "DELETE" });
    if (r.ok) { setSel(null); await load(plans.find((p) => p.id !== plan.id)?.id); toast("Roadmap deleted.", "success"); } else toast(r.error || "Could not delete.", "error");
  };

  const cap = plan ? capFor(plan.progressPercent, ver.note.trim().length >= 20) : null;
  const levels = cap ? PROFICIENCY_LEVELS.filter((l) => levelRank(l) <= levelRank(cap) && levelRank(l) >= levelRank("Just started")) : [];

  const submitVerify = async () => {
    if (!plan) return;
    setVerErr({}); setVerBusy(true);
    const r = await api("/api/learning/verify-skill", { method: "POST", json: { skillName: plan.skillName, confirmedProficiency: ver.level, usedInProject: ver.usedInProject, evidenceNote: ver.note } });
    setVerBusy(false);
    if (!r.ok) { setVerErr(r.fieldErrors || {}); toast(r.error || "Could not add the skill.", "error"); return; }
    setVerOpen(false); toast(r.data.message, "success");
  };

  if (loading) return <Spinner label="Loading roadmaps" />;
  const why = plan ? generateSkillRoadmap(plan.skillName, plan.targetRole, plan.currentProficiency, plan.targetProficiency).whyItMatters : "";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">Skill growth</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Close a gap properly: follow a roadmap, build something, then add the skill to your profile at the level your work supports.</p></div>
        <Button onClick={() => setStartOpen(true)}><Plus className="h-4 w-4" />Start a roadmap</Button>
      </header>

      {plans.length === 0 ? (
        <EmptyState icon={<Rocket className="h-6 w-6" />} title="No roadmaps yet" body="Pick a skill from the catalog, or open one from a job analysis where it showed as missing." action={<Button onClick={() => setStartOpen(true)}>Start a roadmap</Button>} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <nav aria-label="Your roadmaps"><ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id}><button onClick={() => setSel(p.id)} aria-current={sel === p.id} className={cx("w-full rounded-xl border bg-white p-3 text-left", sel === p.id ? "border-blue-600 ring-2 ring-blue-600/20" : "border-slate-200 hover:border-slate-300")}>
                <div className="flex items-center justify-between"><span className="font-semibold text-slate-900">{p.skillName}</span>{p.status === "COMPLETED" && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Completed" />}</div>
                <div className="mt-2"><ProgressBar value={p.progressPercent} tone={p.progressPercent === 100 ? "green" : "blue"} /></div><p className="mt-1 text-xs text-slate-500">{p.progressPercent}% complete</p></button></li>))}
          </ul></nav>

          {plan && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-xl font-bold text-slate-900">{plan.skillName}</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">{why}</p>
                    <p className="mt-2 text-xs text-slate-500">From <strong>{plan.currentProficiency}</strong> to <strong>{plan.targetProficiency}</strong></p></div>
                  <button onClick={remove} aria-label="Delete this roadmap" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-4"><ProgressBar value={plan.progressPercent} tone={plan.progressPercent === 100 ? "green" : "blue"} /><p className="mt-1 text-sm font-medium text-slate-700">{plan.progressPercent}% complete</p></div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Add {plan.skillName} to your profile</h3>
                  <p className="mt-1 text-sm text-slate-600">{plan.progressPercent < 30 ? `Complete at least 30% of the exercises first (you are at ${plan.progressPercent}%). Skills are recorded from work you have actually done.` : `Your progress supports up to “${capFor(plan.progressPercent, false)}”${plan.progressPercent === 100 ? ", or “Intermediate” if you describe what you built." : ". Finish more of the roadmap to unlock a higher level."}`}</p>
                  <Button className="mt-3" disabled={plan.progressPercent < 30} onClick={() => { setVer({ level: capFor(plan.progressPercent, false)!, note: "", usedInProject: false }); setVerErr({}); setVerOpen(true); }}>Add to my profile</Button>
                </div>
              </section>

              {plan.roadmapStages.map((st) => (
                <section key={st.stage} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold text-slate-900">{st.stage}</h3><Badge tone="slate">about {st.estimatedWeeks} weeks</Badge></div>
                  <p className="mt-1 text-sm text-slate-600">{st.learningObjectives.join(" ")}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{st.keyTopics.map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</div>
                  <h4 className="mt-5 text-sm font-semibold text-slate-900">Exercises</h4>
                  <ul className="mt-2 space-y-2">{st.practicalExercises.map((ex) => (
                    <li key={ex.id}><label className={cx("flex cursor-pointer items-start gap-3 rounded-lg border p-3", ex.isCompleted ? "border-emerald-200 bg-emerald-50" : "border-slate-200 hover:bg-slate-50")}>
                      <input type="checkbox" checked={ex.isCompleted} disabled={busyEx === ex.id} onChange={() => toggle(ex)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" />
                      <span><span className={cx("font-medium", ex.isCompleted ? "text-emerald-900 line-through" : "text-slate-900")}>{ex.title}</span><span className="ml-2 text-xs text-slate-500">~{ex.estimatedMinutes} min</span><span className="block text-sm text-slate-600">{ex.description}</span></span></label></li>))}</ul>
                  <div className="mt-4 rounded-lg bg-blue-50 p-4"><h4 className="text-sm font-semibold text-blue-900">Mini project: {st.miniProject.title}</h4><p className="mt-1 text-sm text-blue-900/80">{st.miniProject.problemStatement}</p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-blue-900/80">{st.miniProject.requirements.map((r) => <li key={r}>{r}</li>)}</ul></div>
                  {st.verifiedResources.length > 0 && <><h4 className="mt-4 text-sm font-semibold text-slate-900">Suggested resources</h4>
                    <ul className="mt-1 space-y-1">{st.verifiedResources.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"><ExternalLink className="h-3.5 w-3.5" />{r.title}<span className="font-normal text-slate-500"> · {r.provider}{r.isFree ? " · free" : ""}</span></a></li>)}</ul></>}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={startOpen} onClose={() => setStartOpen(false)} title="Start a roadmap" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Target level">{(p) => <select {...p} className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>{["Beginner", "Intermediate", "Advanced"].map((l) => <option key={l}>{l}</option>)}</select>}</Field>
          <Field label="Role you are aiming for" hint="Optional">{(p) => <input {...p} className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Backend Developer" />}</Field>
        </div>
        <p className="my-4 text-sm text-slate-600">Choose the skill to learn:</p>
        <SkillCatalogPicker selectedKeys={new Set(plans.map((p) => canonicalKey(p.skillName)))} onToggle={(name, _c, on) => { if (on) { const hit = plans.find((p) => canonicalKey(p.skillName) === canonicalKey(name)); if (hit) { setSel(hit.id); setStartOpen(false); } } else start(canonicalName(name)); }} onAddCustom={(name) => start(name)} />
      </Modal>

      <Modal open={verOpen} onClose={() => setVerOpen(false)} title={`Add ${plan?.skillName || "skill"} to your profile`}>
        {plan && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Be honest: this level is what resumes and job matches will use.</p>
            <Field label="Level" hint={cap ? `Highest your progress supports: ${cap}` : undefined} error={verErr.confirmedProficiency}>{(p) => <select {...p} className={inputCls} value={ver.level} onChange={(e) => setVer({ ...ver, level: e.target.value })}>{levels.map((l) => <option key={l}>{l}</option>)}</select>}</Field>
            <Field label="What did you build or practise? (optional)" hint={plan.progressPercent === 100 ? "20+ characters here unlocks “Intermediate” and is saved as evidence." : "Saved as evidence on this skill."} error={verErr.evidenceNote}>{(p) => <textarea {...p} rows={3} maxLength={500} className={inputCls} value={ver.note} onChange={(e) => setVer({ ...ver, note: e.target.value })} />}</Field>
            <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600" checked={ver.usedInProject} onChange={(e) => setVer({ ...ver, usedInProject: e.target.checked })} /><span>I used it in a real project <span className="text-slate-500">(requires a description of at least 20 characters)</span></span></label>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setVerOpen(false)}>Cancel</Button><Button onClick={submitVerify} loading={verBusy}>Add to profile</Button></div>
            <p className="text-xs text-slate-500">Afterwards, review it on the <Link href="/dashboard/skills" className="font-semibold underline">Skills page</Link>.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
