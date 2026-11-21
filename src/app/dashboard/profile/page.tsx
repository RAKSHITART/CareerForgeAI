"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Briefcase, Check, FolderGit2, GraduationCap, Mail, MapPin, Pencil, Phone, Wrench } from "lucide-react";
import { Badge, Button, Spinner, api, cx, useUI } from "@/components/ui";
import { SKILL_CATEGORIES } from "@/lib/types";

const fmt = (s?: string | null) => { const m = s?.match(/^(\d{4})-(\d{1,2})/); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : s || ""; };

function Section({ icon, title, step, href, count, children, empty }: { icon: React.ReactNode; title: string; step?: number; href?: string; count: number; children: React.ReactNode; empty: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><span className="text-blue-700">{icon}</span>{title}<Badge tone="slate">{count}</Badge></h2>
        <Link href={href || `/onboarding?step=${step}`} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" />{count ? "Edit" : "Add"}</Link>
      </div>
      <div className="mt-3">{count ? children : <p className="text-sm text-slate-500">{empty}</p>}</div>
    </section>
  );
}

export default function ProfilePage() {
  const { toast } = useUI();
  const [p, setP] = useState<any>(null);
  const [check, setCheck] = useState<{ percent: number; steps: { id: string; label: string; done: boolean; href: string }[] } | null>(null);

  useEffect(() => { api("/api/profile").then((r) => { if (r.ok) { setP(r.data.profile); setCheck(r.data.checklist); } else toast(r.error || "Could not load your profile.", "error"); }); }, [toast]);
  if (!p || !check) return <Spinner label="Loading your profile" />;

  const bySkill: Record<string, any[]> = {};
  for (const s of p.skills) (bySkill[s.category] ||= []).push(s);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xl font-bold text-blue-800">
              {p.photoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.photoUrl} alt="" className="h-full w-full object-cover" /> : (p.fullName || "?").split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div><h1 className="text-2xl font-bold text-slate-900">{p.fullName}</h1>
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{p.email}</li>
                {p.phone && <li className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{p.phone}</li>}
                {p.location && <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{p.location}</li>}
              </ul></div>
          </div>
          <Link href="/onboarding?step=0"><Button variant="secondary"><Pencil className="h-4 w-4" />Edit details</Button></Link>
        </div>
        {p.professionalSummary && <p className="mt-4 text-sm text-slate-700">{p.professionalSummary}</p>}
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">Profile strength</h2><span className="text-sm font-bold text-slate-900">{check.percent}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className={cx("h-full rounded-full", check.percent === 100 ? "bg-emerald-500" : "bg-blue-600")} style={{ width: `${check.percent}%` }} /></div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">{check.steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">{s.done ? <Check className="h-4 w-4 text-emerald-600" aria-label="Done" /> : <span className="h-4 w-4 rounded-full border-2 border-slate-300" aria-label="To do" />}
              {s.done ? <span className="text-slate-500">{s.label}</span> : <Link href={s.href} className="font-medium text-blue-700 hover:underline">{s.label}</Link>}</li>))}</ul>
        </div>
      </header>

      <Section icon={<GraduationCap className="h-5 w-5" />} title="Education" step={1} count={p.education.length} empty="Add your degree to include it on resumes.">
        <ul className="space-y-3">{p.education.map((e: any) => <li key={e.id}><p className="font-medium text-slate-900">{e.institution}</p><p className="text-sm text-slate-600">{e.degree}, {e.specialization} · {e.startYear} to {e.graduationYear}{e.cgpaOrPercentage ? ` · ${e.cgpaOrPercentage}` : ""}</p></li>)}</ul>
      </Section>

      <Section icon={<Wrench className="h-5 w-5" />} title="Skills" href="/dashboard/skills" count={p.skills.length} empty="Choose your skills from the catalog.">
        <div className="space-y-3">{SKILL_CATEGORIES.filter((c) => bySkill[c]).map((c) => (
          <div key={c}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">{bySkill[c].map((s: any) => <Badge key={s.id} tone={s.proficiencyLevel === "Just started" ? "blue" : s.proficiencyLevel === "Not familiar" ? "slate" : "green"}>{s.name} · {s.proficiencyLevel}</Badge>)}</div></div>))}</div>
      </Section>

      <Section icon={<FolderGit2 className="h-5 w-5" />} title="Projects" step={3} count={p.projects.length} empty="Projects are your strongest evidence. Add one you built.">
        <ul className="space-y-4">{p.projects.map((x: any) => (
          <li key={x.id}><p className="font-medium text-slate-900">{x.title}</p><p className="text-sm text-slate-600">{x.description}</p>
            <p className="mt-1 text-sm text-slate-500"><span className="font-medium text-slate-700">Your part:</span> {x.candidateContribution}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{x.technologies.map((t: string) => <Badge key={t} tone="blue">{t}</Badge>)}</div></li>))}</ul>
      </Section>

      <Section icon={<Briefcase className="h-5 w-5" />} title="Experience" step={4} count={p.workExperience.length} empty="No experience added. That is fine for freshers.">
        <ul className="space-y-3">{p.workExperience.map((w: any) => <li key={w.id}><p className="font-medium text-slate-900">{w.position}, {w.company}</p><p className="text-sm text-slate-600">{fmt(w.startDate)} to {w.isCurrent ? "Present" : fmt(w.endDate)} · {w.employmentType}</p></li>)}</ul>
      </Section>

      <Section icon={<Award className="h-5 w-5" />} title="Certificates" step={5} count={p.certifications.length} empty="Optional.">
        <ul className="space-y-2">{p.certifications.map((c: any) => <li key={c.id} className="text-sm"><span className="font-medium text-slate-900">{c.name}</span> <span className="text-slate-600">· {c.issuingOrganization} ({c.issueDate})</span></li>)}</ul>
      </Section>
    </div>
  );
}
