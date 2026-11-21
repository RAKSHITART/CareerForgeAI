"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Briefcase, FileText, MessagesSquare, Rocket, ScanSearch, Wrench } from "lucide-react";
import { Badge, ProgressBar, Spinner, api, cx, useUI } from "@/components/ui";

const band = (n: number) => (n >= 75 ? "text-emerald-700" : n >= 50 ? "text-amber-700" : "text-rose-700");

export default function DashboardHome() {
  const { toast } = useUI();
  const [d, setD] = useState<{ name: string; checklist: any; jds: any[]; resumes: any[]; apps: any[]; skills: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [me, prof, jds, res, apps] = await Promise.all([api("/api/auth/me"), api("/api/profile"), api("/api/jd/list"), api("/api/resumes/list"), api("/api/applications")]);
      if (!prof.ok) { toast(prof.error || "Could not load your dashboard.", "error"); }
      setD({
        name: me.data?.user?.name || "", checklist: prof.data?.checklist || { percent: 0, steps: [] },
        jds: jds.data?.jobDescriptions || [], resumes: res.data?.resumes || [], apps: apps.data?.applications || [], skills: prof.data?.profile?.skills?.length || 0,
      });
    })();
  }, [toast]);

  if (!d) return <Spinner label="Loading your dashboard" />;

  const today = new Date().toISOString().slice(0, 10);
  const due = d.apps.filter((a) => ["INTERESTED", "APPLIED", "ASSESSMENT", "INTERVIEW"].includes(a.status) && a.followUpDate && a.followUpDate <= today);
  const nextStep = d.checklist.steps.find((s: any) => !s.done);

  // one clear next action, in priority order
  const action =
    d.skills === 0 ? { t: "Build your skill profile", b: "Pick the technologies you know from the catalog. Everything else is based on this.", href: "/dashboard/skills", cta: "Choose skills" }
    : d.jds.length === 0 ? { t: "Analyze your first job", b: "Paste a job description to see how your verified skills compare and what to learn next.", href: "/dashboard/jd-analyzer", cta: "Analyze a job" }
    : d.resumes.length === 0 ? { t: "Create a tailored resume", b: "Turn your best match into a resume that highlights what is genuinely true about you.", href: "/dashboard/resumes", cta: "Create resume" }
    : nextStep ? { t: nextStep.label, b: "Completing your profile makes every resume and match more accurate.", href: nextStep.href, cta: "Do it now" }
    : { t: "Practise for your next interview", b: "Run a mock interview built from your skills and projects.", href: "/dashboard/interviews", cta: "Start practice" };

  const tiles = [
    { href: "/dashboard/jd-analyzer", icon: ScanSearch, label: "Analyze a job", sub: `${d.jds.length} analyzed` },
    { href: "/dashboard/resumes", icon: FileText, label: "Resumes", sub: `${d.resumes.length} versions` },
    { href: "/dashboard/skills", icon: Wrench, label: "My skills", sub: `${d.skills} skills` },
    { href: "/dashboard/skill-growth", icon: Rocket, label: "Skill growth", sub: "Close your gaps" },
    { href: "/dashboard/interviews", icon: MessagesSquare, label: "Mock interviews", sub: "Practise with feedback" },
    { href: "/dashboard/job-tracker", icon: Briefcase, label: "Job tracker", sub: `${d.apps.length} tracked` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{d.name ? `Welcome back, ${d.name.split(" ")[0]}` : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-slate-600">Here is where you stand and what to do next.</p></header>

      <section aria-labelledby="next" className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white shadow-md">
        <p id="next" className="text-xs font-semibold uppercase tracking-wider text-blue-200">Your next step</p>
        <h2 className="mt-1 text-xl font-bold">{action.t}</h2><p className="mt-1 max-w-xl text-sm text-blue-100">{action.b}</p>
        <Link href={action.href} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50">{action.cta}<ArrowRight className="h-4 w-4" /></Link>
      </section>

      {due.length > 0 && (
        <section aria-labelledby="due" className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h2 id="due" className="flex items-center gap-2 text-sm font-bold text-amber-900"><BellRing className="h-4 w-4" />Follow-ups due ({due.length})</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">{due.slice(0, 4).map((a) => <li key={a.id}><Link href={`/dashboard/job-tracker?app=${a.id}`} className="font-medium underline">{a.role} at {a.company}</Link> <span className="text-amber-800/80">(due {a.followUpDate})</span></li>)}</ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ href, icon: Icon, label, sub }) => (
          <Link key={href} href={href} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white"><Icon className="h-5 w-5" /></span>
            <span><span className="block font-semibold text-slate-900">{label}</span><span className="text-sm text-slate-500">{sub}</span></span>
          </Link>))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="prof" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 id="prof" className="font-semibold text-slate-900">Profile strength</h2><span className="text-sm font-bold">{d.checklist.percent}%</span></div>
          <div className="mt-2"><ProgressBar value={d.checklist.percent} tone={d.checklist.percent === 100 ? "green" : "blue"} /></div>
          <ul className="mt-3 space-y-1.5">{d.checklist.steps.map((s: any) => <li key={s.id} className="flex items-center gap-2 text-sm"><span aria-hidden className={cx("flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold", s.done ? "bg-emerald-500 text-white" : "border-2 border-slate-300")}>{s.done ? "✓" : ""}</span>{s.done ? <span className="text-slate-500">{s.label}</span> : <Link href={s.href} className="font-medium text-blue-700 hover:underline">{s.label}</Link>}</li>)}</ul>
        </section>

        <section aria-labelledby="recent" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 id="recent" className="font-semibold text-slate-900">Recent job analyses</h2><Link href="/dashboard/jd-analyzer" className="text-sm font-semibold text-blue-700 hover:underline">New</Link></div>
          {d.jds.length === 0 ? <p className="mt-3 text-sm text-slate-500">No analyses yet.</p> : (
            <ul className="mt-3 divide-y divide-slate-100">{d.jds.slice(0, 5).map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{j.jobTitle}</p><p className="truncate text-xs text-slate-500">{j.companyName}</p></div>
                <div className="text-right"><p className={cx("text-sm font-bold", band(j.overallScore))}>{j.overallScore}%</p>{j.missingCount > 0 && <Badge tone="rose">{j.missingCount} missing</Badge>}</div></li>))}</ul>)}
        </section>
      </div>
    </div>
  );
}
