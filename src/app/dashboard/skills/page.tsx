"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, CheckCircle2, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import { PROFICIENCY_LEVELS, SKILL_CATEGORIES, levelRank } from "@/lib/types";
import { canonicalKey, findSkill } from "@/lib/skills-catalog";
import { Badge, Button, EmptyState, Field, Modal, Spinner, api, cx, inputCls, useUI } from "@/components/ui";
import { LEVEL_HELP, SkillCatalogPicker, newDraft } from "@/components/SkillPicker";

interface Skill {
  id: string; name: string; category: string; proficiencyLevel: string;
  usedInProject: boolean; usedAcademically: boolean; usedProfessionally: boolean;
  lastUsedDate: string | null; practicalExperienceNotes: string | null; evidence: { id: string; title: string }[];
}

export default function SkillsPage() {
  const { toast, confirm } = useUI();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<{ title: string; technologies: string[] }[]>([]);
  const [roles, setRoles] = useState<{ position: string; company: string; technologies: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [staged, setStaged] = useState<{ name: string; category: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [editErr, setEditErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await api("/api/profile");
    if (r.ok) { setSkills(r.data.profile.skills || []); setProjects(r.data.profile.projects || []); setRoles(r.data.profile.workExperience || []); }
    else toast(r.error || "Could not load your skills.", "error");
    setLoading(false);
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  /* where each skill is actually used, according to the rest of the profile */
  const usage = useCallback((s: Skill) => {
    const k = canonicalKey(s.name);
    return {
      projects: projects.filter((p) => p.technologies.some((t) => canonicalKey(t) === k)).map((p) => p.title),
      roles: roles.filter((r) => r.technologies.some((t) => canonicalKey(t) === k)).map((r) => `${r.position}, ${r.company}`),
    };
  }, [projects, roles]);
  const backed = useCallback((s: Skill) => {
    const u = usage(s);
    return s.usedInProject || s.usedAcademically || s.usedProfessionally || !!s.practicalExperienceNotes?.trim() || s.evidence.length > 0 || u.projects.length > 0 || u.roles.length > 0;
  }, [usage]);
  const needsEvidence = (s: Skill) => levelRank(s.proficiencyLevel) >= levelRank("Intermediate") && !backed(s);

  const stats = useMemo(() => ({
    total: skills.length,
    verified: skills.filter((s) => levelRank(s.proficiencyLevel) >= levelRank("Beginner") && backed(s)).length,
    needs: skills.filter(needsEvidence).length,
    learning: skills.filter((s) => s.proficiencyLevel === "Just started").length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [skills, backed]);

  const counts = useMemo(() => { const c: Record<string, number> = { All: skills.length }; for (const s of skills) c[s.category] = (c[s.category] || 0) + 1; return c; }, [skills]);
  const shown = skills
    .filter((s) => (filter === "All" || s.category === filter) && (!q.trim() || canonicalKey(s.name).includes(canonicalKey(q))))
    .sort((a, b) => levelRank(b.proficiencyLevel) - levelRank(a.proficiencyLevel) || a.name.localeCompare(b.name));

  const patch = async (s: Skill, body: Partial<Skill>) => {
    const before = skills;
    setSkills(skills.map((x) => (x.id === s.id ? { ...x, ...body } : x))); // optimistic
    const r = await api("/api/profile/skills", { method: "PUT", json: { id: s.id, ...body } });
    if (!r.ok) { setSkills(before); toast(r.error || "Could not save that change.", "error"); return false; }
    setSkills((cur) => cur.map((x) => (x.id === s.id ? { ...x, ...r.data.skill } : x)));
    return true;
  };

  const existingKeys = useMemo(() => new Set(skills.map((s) => canonicalKey(s.name))), [skills]);
  const stagedKeys = new Set(staged.map((s) => canonicalKey(s.name)));
  const pickerKeys = new Set([...existingKeys, ...stagedKeys]);

  const addStaged = async () => {
    setAdding(true);
    let ok = 0; const failed: string[] = [];
    for (const s of staged) {
      const d = newDraft(s.name, s.category);
      const r = await api("/api/profile/skills", { method: "POST", json: { name: d.name, category: d.category, proficiencyLevel: d.proficiencyLevel, usedInProject: false, usedAcademically: false, usedProfessionally: false } });
      if (r.ok) ok++; else if (r.status !== 409) failed.push(s.name);
    }
    setAdding(false);
    await load();
    if (failed.length) toast(`Could not add: ${failed.join(", ")}`, "error");
    if (ok) toast(`${ok} skill${ok > 1 ? "s" : ""} added as Beginner. Set your real level on each card.`, "success");
    setStaged([]); setAddOpen(false);
  };

  const remove = async (s: Skill) => {
    if (!(await confirm({ title: `Remove ${s.name}?`, body: "It will no longer be matched against jobs or appear on new resumes. Existing resume versions keep their snapshot.", confirmLabel: "Remove", danger: true }))) return;
    const r = await api(`/api/profile/skills?id=${s.id}`, { method: "DELETE" });
    if (r.ok) { setSkills(skills.filter((x) => x.id !== s.id)); toast(`${s.name} removed.`, "success"); } else toast(r.error || "Could not remove the skill.", "error");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true); setEditErr({});
    const r = await api("/api/profile/skills", { method: "PUT", json: { id: editing.id, proficiencyLevel: editing.proficiencyLevel, usedInProject: editing.usedInProject, usedAcademically: editing.usedAcademically, usedProfessionally: editing.usedProfessionally, lastUsedDate: editing.lastUsedDate || "", practicalExperienceNotes: editing.practicalExperienceNotes || "" } });
    setSaving(false);
    if (!r.ok) { setEditErr(r.fieldErrors || { _: r.error || "Could not save" }); toast(r.error || "Could not save.", "error"); return; }
    setSkills(skills.map((x) => (x.id === editing.id ? { ...x, ...r.data.skill } : x)));
    setEditing(null); toast("Skill updated.", "success");
  };

  if (loading) return <Spinner label="Loading your skills" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My skills</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Only skills listed here, at the level you set, can appear on a resume. Tap <strong>Add skills</strong> to choose from the catalog instead of typing.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add skills</Button>
      </header>

      {skills.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Total", stats.total, "text-slate-900"], ["Backed by evidence", stats.verified, "text-emerald-700"], ["Need evidence", stats.needs, "text-amber-700"], ["Currently learning", stats.learning, "text-blue-700"]].map(([l, v, c]) => (
            <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-4"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{l}</dt><dd className={cx("mt-1 text-2xl font-bold", c as string)}>{v}</dd></div>
          ))}
        </dl>
      )}

      {skills.length === 0 ? (
        <EmptyState icon={<Wrench className="h-6 w-6" />} title="No skills yet" body="Choose the technologies and tools you know from our catalog. Each one starts as Beginner, and you set your real level next." action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add skills</Button>} />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <label htmlFor="skill-filter" className="sr-only">Filter your skills</label>
              <input id="skill-filter" className={cx(inputCls, "pl-9")} placeholder="Filter your skills…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div role="tablist" aria-label="Filter by category" className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1 pb-1">
              {["All", ...SKILL_CATEGORIES].filter((c) => c === "All" || counts[c]).map((c) => (
                <button key={c} role="tab" aria-selected={filter === c} onClick={() => setFilter(c)} className={cx("shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium", filter === c ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}>
                  {c} <span className={cx("ml-1 text-xs", filter === c ? "text-white/80" : "text-slate-400")}>{counts[c] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No skills match this filter.</p> : (
            <ul className="grid gap-3 md:grid-cols-2">
              {shown.map((s) => {
                const u = usage(s);
                const warn = needsEvidence(s);
                const custom = !findSkill(s.name);
                return (
                  <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-semibold text-slate-900">{s.name}</h2>
                        <div className="mt-1 flex flex-wrap gap-1.5"><Badge tone={custom ? "amber" : "slate"}>{custom ? "Custom" : s.category}</Badge>
                          {s.proficiencyLevel === "Just started" && <Badge tone="blue"><BookOpen className="h-3 w-3" />Learning</Badge>}
                          {!warn && levelRank(s.proficiencyLevel) >= levelRank("Beginner") && backed(s) && <Badge tone="green"><CheckCircle2 className="h-3 w-3" />Evidence</Badge>}</div>
                      </div>
                      <div className="flex gap-1">
                        <button aria-label={`Edit ${s.name}`} onClick={() => { setEditErr({}); setEditing({ ...s }); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                        <button aria-label={`Remove ${s.name}`} onClick={() => remove(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label htmlFor={`l-${s.id}`} className="sr-only">Proficiency for {s.name}</label>
                      <select id={`l-${s.id}`} value={s.proficiencyLevel} onChange={(e) => patch(s, { proficiencyLevel: e.target.value })} className={inputCls}>
                        {PROFICIENCY_LEVELS.map((l) => <option key={l}>{l}</option>)}
                      </select>
                      <p className="mt-1 text-xs text-slate-500">{LEVEL_HELP[s.proficiencyLevel]}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {([["usedInProject", "Project"], ["usedAcademically", "Coursework"], ["usedProfessionally", "Work"]] as const).map(([k, label]) => (
                        <label key={k} className="flex items-center gap-1.5 text-sm text-slate-700"><input type="checkbox" checked={s[k]} onChange={(e) => patch(s, { [k]: e.target.checked } as any)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{label}</label>
                      ))}
                    </div>

                    {(u.projects.length > 0 || u.roles.length > 0) && (
                      <p className="mt-2 text-xs text-slate-600"><span className="font-semibold">Found in your profile:</span> {[...u.projects.map((p) => `project “${p}”`), ...u.roles].join("; ")}</p>
                    )}
                    {warn && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>Rated {s.proficiencyLevel} but nothing backs it up, so it counts as unverified. Tick where you used it, or <button className="font-semibold underline" onClick={() => setEditing({ ...s })}>add a note</button>.</span></div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ---- add skills ---- */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setStaged([]); }} title="Add skills" wide>
        <p className="mb-4 text-sm text-slate-600">Tap to select as many as you like. Skills you already have are marked.</p>
        <SkillCatalogPicker
          selectedKeys={pickerKeys}
          onToggle={(name, category) => {
            const k = canonicalKey(name);
            if (existingKeys.has(k)) { toast(`${name} is already in your skills.`, "info"); return; }
            setStaged((cur) => (cur.some((x) => canonicalKey(x.name) === k) ? cur.filter((x) => canonicalKey(x.name) !== k) : [...cur, { name, category }]));
          }}
          onAddCustom={(name, category) => { if (!pickerKeys.has(canonicalKey(name))) setStaged((c) => [...c, { name, category }]); }}
        />
        <div className="sticky bottom-0 -mx-5 -mb-4 mt-5 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <p className="text-sm text-slate-600">{staged.length ? <>{staged.length} selected: <span className="font-medium text-slate-800">{staged.slice(0, 4).map((s) => s.name).join(", ")}{staged.length > 4 ? "…" : ""}</span></> : "Nothing selected"}</p>
          <Button onClick={addStaged} disabled={!staged.length} loading={adding}>Add {staged.length || ""} skill{staged.length === 1 ? "" : "s"}</Button>
        </div>
      </Modal>

      {/* ---- edit one skill ---- */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : ""}>
        {editing && (
          <div className="space-y-4">
            <Field label="Proficiency" hint={LEVEL_HELP[editing.proficiencyLevel]} error={editErr.proficiencyLevel}>
              {(p) => <select {...p} className={inputCls} value={editing.proficiencyLevel} onChange={(e) => setEditing({ ...editing, proficiencyLevel: e.target.value })}>{PROFICIENCY_LEVELS.map((l) => <option key={l}>{l}</option>)}</select>}
            </Field>
            <fieldset className="space-y-1.5"><legend className="text-sm font-medium text-slate-700">Where have you used it?</legend>
              {([["usedInProject", "In a project"], ["usedAcademically", "In coursework"], ["usedProfessionally", "At work or an internship"]] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{label}</label>
              ))}
            </fieldset>
            <Field label="Last used" error={editErr.lastUsedDate} hint="Optional">{(p) => <input {...p} type="month" className={inputCls} value={editing.lastUsedDate || ""} onChange={(e) => setEditing({ ...editing, lastUsedDate: e.target.value })} />}</Field>
            <Field label="Evidence note" error={editErr.practicalExperienceNotes} hint="One or two sentences on what you actually did with it. Clearing this box removes the note.">
              {(p) => <textarea {...p} rows={3} maxLength={500} className={inputCls} value={editing.practicalExperienceNotes || ""} onChange={(e) => setEditing({ ...editing, practicalExperienceNotes: e.target.value })} />}
            </Field>
            {editErr._ && <p role="alert" className="text-sm font-medium text-rose-600">{editErr._}</p>}
            <div className="flex justify-between gap-2">
              <Link href={`/dashboard/skill-growth?skill=${encodeURIComponent(editing.name)}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"><BookOpen className="h-4 w-4" />Build this skill</Link>
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveEdit} loading={saving}>Save</Button></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
