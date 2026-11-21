"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, Briefcase, CalendarDays, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, EmptyState, Field, Modal, Spinner, api, cx, inputCls, inputErrCls, useUI } from "@/components/ui";

const COLUMNS = [
  { id: "INTERESTED", label: "Saved", tone: "slate" as const },
  { id: "APPLIED", label: "Applied", tone: "blue" as const },
  { id: "ASSESSMENT", label: "Assessment", tone: "violet" as const },
  { id: "INTERVIEW", label: "Interview", tone: "amber" as const },
  { id: "SELECTED", label: "Offer", tone: "green" as const },
  { id: "REJECTED", label: "Rejected", tone: "rose" as const },
];
const OPEN = ["INTERESTED", "APPLIED", "ASSESSMENT", "INTERVIEW"];
const today = () => new Date().toISOString().slice(0, 10);

interface App { id: string; company: string; role: string; status: string; appliedDate: string | null; interviewDate: string | null; followUpDate: string | null; notes: string | null; resumeVersionId: string | null; resumeVersion?: { versionName: string } | null }
const blank = { id: "", company: "", role: "", status: "APPLIED", appliedDate: today(), interviewDate: "", followUpDate: "", notes: "", resumeVersionId: "" };

export default function JobTrackerPage() {
  const { toast, confirm } = useUI();
  const [apps, setApps] = useState<App[]>([]);
  const [resumes, setResumes] = useState<{ id: string; versionName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ...blank });
  const [fe, setFe] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, r] = await Promise.all([api("/api/applications"), api("/api/resumes/list")]);
    if (a.ok) setApps(a.data.applications || []); else toast(a.error || "Could not load applications.", "error");
    if (r.ok) setResumes(r.data.resumes || []);
    setLoading(false);
    return a.ok ? (a.data.applications as App[]) : [];
  }, [toast]);

  useEffect(() => { (async () => { const list = await load(); const id = new URLSearchParams(window.location.search).get("app"); const hit = list.find((x) => x.id === id); if (hit) edit(hit); })(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const edit = (a: App) => { setFe({}); setF({ id: a.id, company: a.company, role: a.role, status: a.status, appliedDate: a.appliedDate || "", interviewDate: a.interviewDate || "", followUpDate: a.followUpDate || "", notes: a.notes || "", resumeVersionId: a.resumeVersionId || "" }); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setFe({});
    const local: Record<string, string> = {};
    if (!f.company.trim()) local.company = "Enter the company";
    if (!f.role.trim()) local.role = "Enter the role";
    if (f.followUpDate && f.appliedDate && f.followUpDate < f.appliedDate) local.followUpDate = "Follow-up cannot be before the applied date";
    if (Object.keys(local).length) { setFe(local); return; }
    setSaving(true);
    const body = { company: f.company, role: f.role, status: f.status, appliedDate: f.appliedDate || null, interviewDate: f.interviewDate || "", followUpDate: f.followUpDate || "", notes: f.notes || "", resumeVersionId: f.resumeVersionId || null };
    const r = f.id ? await api(`/api/applications/${f.id}`, { method: "PUT", json: body }) : await api("/api/applications", { method: "POST", json: body });
    setSaving(false);
    if (!r.ok) { setFe(r.fieldErrors || {}); toast(r.error || "Could not save.", "error"); return; }
    setOpen(false); toast(f.id ? "Application updated." : "Application added.", "success"); load();
  };

  const move = async (a: App, status: string) => {
    if (a.status === status) return;
    const before = apps;
    setApps(apps.map((x) => (x.id === a.id ? { ...x, status } : x)));
    const r = await api(`/api/applications/${a.id}`, { method: "PUT", json: { status } });
    if (!r.ok) { setApps(before); toast(r.error || "Could not move that card.", "error"); }
  };

  const del = async (a: App) => {
    if (!(await confirm({ title: "Delete this application?", body: `${a.role} at ${a.company} will be removed from your tracker.`, confirmLabel: "Delete", danger: true }))) return;
    const r = await api(`/api/applications/${a.id}`, { method: "DELETE" });
    if (r.ok) { setApps(apps.filter((x) => x.id !== a.id)); toast("Deleted.", "success"); } else toast(r.error || "Could not delete.", "error");
  };

  const stats = useMemo(() => ({
    total: apps.length, active: apps.filter((a) => OPEN.includes(a.status) && a.status !== "INTERESTED").length,
    interviews: apps.filter((a) => a.status === "INTERVIEW").length, offers: apps.filter((a) => a.status === "SELECTED").length,
    overdue: apps.filter((a) => OPEN.includes(a.status) && a.followUpDate && a.followUpDate <= today()).length,
  }), [apps]);

  if (loading) return <Spinner label="Loading your tracker" />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">Job tracker</h1><p className="mt-1 text-sm text-slate-600">Drag cards between columns, or use the status menu on each card.</p></div>
        <Button onClick={() => { setFe({}); setF({ ...blank, appliedDate: today() }); setOpen(true); }}><Plus className="h-4 w-4" />Add application</Button>
      </header>

      {apps.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[["Tracked", stats.total, ""], ["In progress", stats.active, ""], ["Interviews", stats.interviews, ""], ["Offers", stats.offers, "text-emerald-700"], ["Follow-ups due", stats.overdue, stats.overdue ? "text-amber-700" : ""]].map(([l, v, c]) => (
            <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-3"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{l}</dt><dd className={cx("text-2xl font-bold text-slate-900", c as string)}>{v}</dd></div>))}
        </dl>
      )}

      {apps.length === 0 ? (
        <EmptyState icon={<Briefcase className="h-6 w-6" />} title="Track your applications" body="Add the jobs you are interested in or have applied to. Set follow-up dates and you will get a reminder." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add your first</Button>} />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-3">
            {COLUMNS.map((col) => {
              const items = apps.filter((a) => a.status === col.id);
              return (
                <section key={col.id} aria-label={`${col.label}, ${items.length} applications`}
                  onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }} onDragLeave={() => setOverCol(null)}
                  onDrop={() => { const a = apps.find((x) => x.id === dragId); if (a) move(a, col.id); setDragId(null); setOverCol(null); }}
                  className={cx("w-[270px] shrink-0 rounded-2xl bg-slate-100 p-2.5 transition", overCol === col.id && "bg-blue-50 ring-2 ring-blue-400")}>
                  <h2 className="mb-2 flex items-center justify-between px-1.5 text-sm font-semibold text-slate-700">{col.label}<Badge tone={col.tone}>{items.length}</Badge></h2>
                  <ul className="space-y-2">
                    {items.map((a) => {
                      const due = OPEN.includes(a.status) && a.followUpDate && a.followUpDate <= today();
                      return (
                        <li key={a.id} draggable onDragStart={() => setDragId(a.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }} className={cx("cursor-grab rounded-xl border bg-white p-3 shadow-sm active:cursor-grabbing", due ? "border-amber-300" : "border-slate-200", dragId === a.id && "opacity-50")}>
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{a.role}</p><p className="truncate text-sm text-slate-600">{a.company}</p></div>
                            <div className="flex shrink-0"><button onClick={() => edit(a)} aria-label={`Edit ${a.role} at ${a.company}`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => del(a)} aria-label={`Delete ${a.role} at ${a.company}`} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-slate-500">
                            {a.appliedDate && <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Applied {a.appliedDate}</p>}
                            {a.interviewDate && <p className="flex items-center gap-1.5 font-medium text-slate-700"><CalendarDays className="h-3.5 w-3.5" />Interview {a.interviewDate}</p>}
                            {a.followUpDate && OPEN.includes(a.status) && <p className={cx("flex items-center gap-1.5", due && "font-semibold text-amber-700")}><BellRing className="h-3.5 w-3.5" />{due ? "Follow up now" : `Follow up ${a.followUpDate}`}</p>}
                            {a.resumeVersion && <p className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /><span className="truncate">{a.resumeVersion.versionName}</span></p>}
                          </div>
                          {a.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{a.notes}</p>}
                          <label className="sr-only" htmlFor={`st-${a.id}`}>Move {a.role} at {a.company} to</label>
                          <select id={`st-${a.id}`} value={a.status} onChange={(e) => move(a, e.target.value)} className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                        </li>);
                    })}
                    {items.length === 0 && <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">Nothing here</li>}
                  </ul>
                </section>);
            })}
          </div>
        </div>
      )}
      {apps.some((a) => a.status === "INTERVIEW") && <p className="text-sm text-slate-600">Interview coming up? <Link href="/dashboard/interviews" className="font-semibold text-blue-700 underline">Run a mock interview</Link>.</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={f.id ? "Edit application" : "Add application"}>
        <form onSubmit={save} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" required error={fe.company}>{(p) => <input {...p} className={cx(inputCls, fe.company && inputErrCls)} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />}</Field>
            <Field label="Role" required error={fe.role}>{(p) => <input {...p} className={cx(inputCls, fe.role && inputErrCls)} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />}</Field>
            <Field label="Status">{(p) => <select {...p} className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>}</Field>
            <Field label="Applied on" error={fe.appliedDate}>{(p) => <input {...p} type="date" className={inputCls} value={f.appliedDate} onChange={(e) => setF({ ...f, appliedDate: e.target.value })} />}</Field>
            <Field label="Follow up on" error={fe.followUpDate} hint="You get a reminder on this date.">{(p) => <input {...p} type="date" className={cx(inputCls, fe.followUpDate && inputErrCls)} value={f.followUpDate} onChange={(e) => setF({ ...f, followUpDate: e.target.value })} />}</Field>
            <Field label="Interview date" error={fe.interviewDate}>{(p) => <input {...p} type="date" className={inputCls} value={f.interviewDate} onChange={(e) => setF({ ...f, interviewDate: e.target.value })} />}</Field>
          </div>
          <Field label="Resume used">{(p) => <select {...p} className={inputCls} value={f.resumeVersionId} onChange={(e) => setF({ ...f, resumeVersionId: e.target.value })}><option value="">None selected</option>{resumes.map((r) => <option key={r.id} value={r.id}>{r.versionName}</option>)}</select>}</Field>
          <Field label="Notes" error={fe.notes} hint={`${f.notes.length}/2000`}>{(p) => <textarea {...p} rows={3} maxLength={2000} className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />}</Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={saving}>{f.id ? "Save changes" : "Add application"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
