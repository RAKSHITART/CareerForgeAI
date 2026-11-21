import Link from "next/link";
import { BadgeCheck, FileCheck2, MessagesSquare, Sparkles } from "lucide-react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" aria-hidden />
        <Link href="/" className="relative flex items-center gap-2.5 text-lg font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600"><Sparkles className="h-5 w-5" /></span>CareerForge AI</Link>
        <div className="relative space-y-8">
          <h2 className="max-w-md text-3xl font-bold leading-tight">A resume you can defend in every interview.</h2>
          <ul className="space-y-5 text-slate-300">
            {[[BadgeCheck, "Only skills you can back up", "Every skill is matched to your projects, coursework or work. Nothing is added just because a job asks for it."], [FileCheck2, "Tailored, never inflated", "Reorders and highlights your real experience for each job. Your wording stays yours."], [MessagesSquare, "Practise with feedback", "Mock interviews built from your skills, projects and the job you are targeting."]].map(([Icon, h, b]: any) => (
              <li key={h} className="flex gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" aria-hidden /><div><p className="font-semibold text-white">{h}</p><p className="text-sm">{b}</p></div></li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">Scores are estimates, not employer decisions.</p>
      </aside>
      <main className="flex items-center justify-center bg-white px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-bold text-slate-900 lg:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Sparkles className="h-4 w-4" /></span>CareerForge AI</Link>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
