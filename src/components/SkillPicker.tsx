"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Plus, Search, X } from "lucide-react";
import { SKILL_CATEGORIES, PROFICIENCY_LEVELS, levelRank } from "@/lib/types";
import { canonicalKey, canonicalName, categoryFor, findSkill, searchCatalog, skillsByCategory, suggestSimilar } from "@/lib/skills-catalog";
import { Badge, cx, inputCls } from "./ui";

export interface SkillDraft {
  id?: string;
  name: string;
  category: string;
  proficiencyLevel: string;
  usedInProject: boolean;
  usedAcademically: boolean;
  usedProfessionally: boolean;
  practicalExperienceNotes: string;
  lastUsedDate?: string | null;
}

export const LEVEL_HELP: Record<string, string> = {
  "Not familiar": "Heard of it. It will not appear on your resume.",
  "Just started": "Learning it now. Shown as \"currently learning\", never as a skill.",
  Beginner: "Followed tutorials or small exercises.",
  "Basic working knowledge": "Can use it with documentation open.",
  Intermediate: "Built real things with it.",
  Advanced: "Comfortable with complex work and can explain trade-offs.",
  Expert: "Deep, production-level experience.",
};

export const newDraft = (name: string, category?: string): SkillDraft => ({
  name: canonicalName(name),
  category: categoryFor(name, category || "Other"),
  proficiencyLevel: "Beginner",
  usedInProject: false, usedAcademically: false, usedProfessionally: false,
  practicalExperienceNotes: "",
});

/* =====================================================================
   Catalog browser: search + categories + chips. Multi-select, no typing required.
   ===================================================================== */
export function SkillCatalogPicker({ selectedKeys, onToggle, onAddCustom }: {
  selectedKeys: Set<string>;
  onToggle: (name: string, category: string, selected: boolean) => void;
  onAddCustom?: (name: string, category: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>(SKILL_CATEGORIES[0]);
  const [customCat, setCustomCat] = useState("Other");
  const byCat = useMemo(() => skillsByCategory(), []);
  const results = query.trim() ? searchCatalog(query, 14) : [];
  const exact = !!findSkill(query);
  const similar = query.trim() && !exact ? suggestSimilar(query) : [];

  const Chip = ({ name, category }: { name: string; category: string }) => {
    const on = selectedKeys.has(canonicalKey(name));
    return (
      <button type="button" onClick={() => onToggle(name, category, on)} aria-pressed={on}
        className={cx("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition",
          on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:bg-blue-50")}>
        {on ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5 text-slate-400" aria-hidden />}{name}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="skill-search" className="sr-only">Search skills</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input id="skill-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search skills, e.g. react, postgres, k8s…" className={cx(inputCls, "pl-9")} autoComplete="off"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = results[0]; if (t) { onToggle(t.name, t.category, selectedKeys.has(t.key)); } } }} />
        </div>
      </div>

      {query.trim() ? (
        <div>
          {results.length > 0 ? (
            <div className="flex flex-wrap gap-2">{results.map((s) => <Chip key={s.key} name={s.name} category={s.category} />)}</div>
          ) : (
            <p className="text-sm text-slate-500">No catalog skill matches “{query}”.</p>
          )}
          {similar.length > 0 && (
            <p className="mt-3 text-sm text-slate-600">Did you mean{" "}
              {similar.map((s, i) => (
                <span key={s.key}><button type="button" className="font-semibold text-blue-700 underline" onClick={() => { onToggle(s.name, s.category, false); setQuery(""); }}>{s.name}</button>{i < similar.length - 1 ? ", " : "?"}</span>
              ))}
            </p>
          )}
          {onAddCustom && !exact && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              <span className="text-sm text-slate-600">Not in the list? Add <strong>“{query.trim()}”</strong> as a custom skill in</span>
              <select aria-label="Category for custom skill" value={customCat} onChange={(e) => setCustomCat(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                {SKILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button type="button" onClick={() => { onAddCustom(query.trim(), customCat); setQuery(""); }} className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-900">Add custom skill</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Skill categories" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {SKILL_CATEGORIES.map((c) => {
              const count = (byCat[c] || []).filter((s) => selectedKeys.has(s.key)).length;
              return (
                <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} type="button"
                  className={cx("shrink-0 rounded-lg px-3 py-2 text-sm font-medium", cat === c ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}>
                  {c}{count > 0 && <span className={cx("ml-1.5 rounded-full px-1.5 text-xs", cat === c ? "bg-white/25" : "bg-blue-100 text-blue-800")}>{count}</span>}
                </button>
              );
            })}
          </div>
          <div role="tabpanel" className="flex flex-wrap gap-2">
            {(byCat[cat] || []).map((s) => <Chip key={s.key} name={s.name} category={s.category} />)}
          </div>
        </>
      )}
    </div>
  );
}

/* =====================================================================
   Draft editor: used by onboarding. Pick from the catalog, then set level and evidence.
   ===================================================================== */
export function evidenceMissing(s: SkillDraft, backedByProject = false) {
  return levelRank(s.proficiencyLevel) >= levelRank("Intermediate") && !(s.usedInProject || s.usedAcademically || s.usedProfessionally || s.practicalExperienceNotes.trim() || backedByProject);
}

export function SkillDraftEditor({ skills, onChange, projectTechKeys = new Set<string>() }: { skills: SkillDraft[]; onChange: (s: SkillDraft[]) => void; projectTechKeys?: Set<string> }) {
  const selectedKeys = useMemo(() => new Set(skills.map((s) => canonicalKey(s.name))), [skills]);
  const toggle = (name: string, category: string, selected: boolean) => {
    if (selected) onChange(skills.filter((s) => canonicalKey(s.name) !== canonicalKey(name)));
    else onChange([...skills, newDraft(name, category)]);
  };
  const update = (i: number, patch: Partial<SkillDraft>) => onChange(skills.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const order = [...skills.keys()].sort((a, b) => SKILL_CATEGORIES.indexOf(skills[a].category as any) - SKILL_CATEGORIES.indexOf(skills[b].category as any));

  return (
    <div className="space-y-6">
      <SkillCatalogPicker selectedKeys={selectedKeys} onToggle={toggle} onAddCustom={(n, c) => !selectedKeys.has(canonicalKey(n)) && onChange([...skills, newDraft(n, c)])} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Your skills ({skills.length})</h3>
        {skills.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">Nothing selected yet. Tap skills above to add them.</p>
        ) : (
          <ul className="space-y-2">
            {order.map((i) => {
              const s = skills[i];
              const warn = evidenceMissing(s, projectTechKeys.has(canonicalKey(s.name)));
              const custom = !findSkill(s.name);
              return (
                <li key={`${s.name}-${i}`} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{s.name}</span>
                    <Badge tone={custom ? "amber" : "slate"}>{custom ? "Custom" : s.category}</Badge>
                    <div className="ml-auto flex items-center gap-2">
                      <label className="sr-only" htmlFor={`lvl-${i}`}>Proficiency for {s.name}</label>
                      <select id={`lvl-${i}`} value={s.proficiencyLevel} onChange={(e) => update(i, { proficiencyLevel: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                        {PROFICIENCY_LEVELS.map((l) => <option key={l}>{l}</option>)}
                      </select>
                      <button type="button" aria-label={`Remove ${s.name}`} onClick={() => onChange(skills.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{LEVEL_HELP[s.proficiencyLevel]}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {([["usedInProject", "Used in a project"], ["usedAcademically", "Used in coursework"], ["usedProfessionally", "Used at work / internship"]] as const).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-1.5 text-sm text-slate-700">
                        <input type="checkbox" checked={s[k]} onChange={(e) => update(i, { [k]: e.target.checked } as any)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{label}
                      </label>
                    ))}
                  </div>
                  {warn && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      {s.proficiencyLevel} with no evidence will be treated as unverified. Tick where you used it, or add a short note.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   Technology chips input for projects / experience, with catalog suggestions
   ===================================================================== */
export function TechInput({ value, onChange, label = "Technologies", error }: { value: string[]; onChange: (v: string[]) => void; label?: string; error?: string }) {
  const [text, setText] = useState("");
  const keys = new Set(value.map(canonicalKey));
  const suggestions = text.trim() ? searchCatalog(text, 6, keys) : [];
  const add = (raw: string) => {
    const parts = raw.split(/[,;]/).map((x) => canonicalName(x)).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((v) => canonicalKey(v) === canonicalKey(p))) next.push(p);
    onChange(next);
    setText("");
  };
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className={cx("rounded-lg border bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-600/25", error ? "border-rose-500" : "border-slate-300 focus-within:border-blue-600")}>
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-800">
              {v}<button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="text-blue-600 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
          <input value={text} onChange={(e) => setText(e.target.value)} aria-label={`Add ${label.toLowerCase()}`} placeholder={value.length ? "Add another…" : "Type to search, press Enter to add"}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && text.trim()) { e.preventDefault(); add(suggestions[0] && !findSkill(text) ? suggestions[0].name : text); } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1)); }}
            className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm focus:outline-none focus:ring-0" />
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {suggestions.map((s) => <button key={s.key} type="button" onClick={() => add(s.name)} className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-500 hover:bg-blue-50">+ {s.name}</button>)}
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
