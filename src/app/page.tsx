import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  FileText,
  Target,
  Bot,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Award,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900">CareerForge</span>
              <span className="text-blue-600 font-bold ml-1 text-sm uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                AI
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#anti-fabrication" className="hover:text-blue-600 transition-colors">Anti-Fabrication Principle</a>
            <a href="#interview-studio" className="hover:text-blue-600 transition-colors">AI Interview Studio</a>
            <a href="#skill-growth" className="hover:text-blue-600 transition-colors">Skill Growth</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition-all hover:shadow"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Honest ATS Intelligence & Job Preparation
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
          Land Interviews Based on <span className="text-blue-600">Real Skills</span>, Not Fabricated Keywords.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal">
          CareerForge AI builds truthful, evidence-backed resumes tailored to each job description, conducts adaptive AI mock interviews, and bridges your real skill gaps with actionable roadmaps.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
          >
            Start Your Career Profile <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all"
          >
            Live Demo Access
          </Link>
        </div>

        {/* The Core Anti-Fabrication Logic Interactive Card */}
        <div className="mt-16 max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                The Core Principle
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">
                How CareerForge AI Evaluates Job Description Requirements
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Zero Fake Keywords • Verified Evidence Only
            </span>
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="pb-3">JD Requirement</th>
                  <th className="pb-3">Candidate Status</th>
                  <th className="pb-3">Platform Tailoring Action</th>
                  <th className="pb-3 text-right">Integrity Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 font-semibold text-slate-900">Java</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Intermediate
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-700 font-medium">Include with verified project reference</td>
                  <td className="py-3.5 text-right">
                    <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 font-semibold text-slate-900">SQL</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Beginner
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-700 font-medium">Include with fundamental positioning</td>
                  <td className="py-3.5 text-right">
                    <span className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Partial Match
                    </span>
                  </td>
                </tr>
                <tr className="bg-rose-50/40">
                  <td className="py-3.5 font-semibold text-slate-900">Selenium</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      Never Learned
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-700 font-medium font-semibold text-rose-700">
                    DO NOT INCLUDE — Route to Skill Growth Studio
                  </td>
                  <td className="py-3.5 text-right">
                    <span className="text-xs font-semibold text-rose-600 inline-flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Blocked
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 font-semibold text-slate-900">API Testing</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Learning
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-700 font-medium">Mark as learning; do not claim proficiency</td>
                  <td className="py-3.5 text-right">
                    <span className="text-xs font-semibold text-amber-600 inline-flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" /> In Progress
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 font-semibold text-slate-900">Communication</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      Advanced
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-700 font-medium">Include supported by presentations & team items</td>
                  <td className="py-3.5 text-right">
                    <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5 Core Feature Pillars */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              The Complete Career Improvement Loop
            </h2>
            <p className="mt-4 text-base text-slate-600">
              From your initial verified profile to tailored resumes, mock interviews, and active skill roadmaps.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">1. JD Intelligence Engine</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Extract mandatory vs. preferred requirements, core CS concepts, and ATS keywords. Compares against your verified capabilities without confusing related frameworks (e.g. React != Angular).
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">2. Truthful Resume Tailoring</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Puts your most relevant projects first and tidies wording without changing what you claim. Edit any line yourself, then export to Word (.docx) or print to PDF.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-5">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">3. AI Mock Interview Studio</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Practice text or voice interviews tailored to specific roles. Get evaluated on technical correctness, conceptual depth, clarity, and receive actionable revision topics.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">4. Skill Growth & Roadmaps</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Discovered missing skills from a target JD? Follow Beginner, Intermediate, and Advanced roadmaps with exercises, a mini project, and links to official documentation. Skills are added to your profile at the level your progress supports.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">5. Career Readiness Analytics</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Track interview score progression, application status stages (Interested, Applied, Interview, Offer), and benchmark your actual job preparation over time.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-5">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">6. Version Snapshots</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Create separate customized resumes for different target roles (e.g. Frontend vs Full Stack). Master profiles remain immutable so older applications never mutate silently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-12 bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-base">CareerForge AI</span>
            <span className="text-xs text-slate-400">© 2026. Truthful Career Development.</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-white transition-colors">Create Account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ClockIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
