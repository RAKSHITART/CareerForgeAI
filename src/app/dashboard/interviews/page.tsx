"use client";

import { useEffect, useState } from "react";
import { api, useUI } from "@/components/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Play,
  Mic,
  FileText,
  Clock,
  Award,
  ArrowRight,
  ShieldCheck,
  Target,
  Sparkles,
  Loader2,
} from "lucide-react";

export default function InterviewsHubPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);

  // Form State
  const { toast } = useUI();
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [jdId, setJdId] = useState<string | null>(null);
  const [roleErr, setRoleErr] = useState("");
  const [interviewType, setInterviewType] = useState<string>("TECHNICAL");
  const [difficulty, setDifficulty] = useState<string>("INTERMEDIATE");
  const [mode, setMode] = useState<"TEXT" | "VOICE">("VOICE");

  const loadSessions = async () => {
    const r = await api("/api/interviews/list");
    if (r.ok) setSessions(r.data.sessions || []);
    else toast(r.error || "Could not load your interviews.", "error");
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
    // arriving from a job analysis: prefill the role and use that job's skills
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("jd")) {
      setJdId(sp.get("jd")); setTargetRole(sp.get("role") || ""); setTargetCompany(sp.get("company") || ""); setShowStartModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleErr("");
    if (targetRole.trim().length < 2) { setRoleErr("Enter the role you are practising for"); return; }
    setCreating(true);
    const r = await api("/api/interviews/create", { method: "POST", json: { targetRole: targetRole.trim(), targetCompany: targetCompany.trim() || null, interviewType, difficulty, mode, questionCount, jobDescriptionId: jdId } });
    setCreating(false);
    if (!r.ok) { toast(r.error || "Could not start the interview.", "error"); return; }
    router.push(`/dashboard/interviews/${r.data.sessionId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-indigo-600" /> AI Mock Interview Studio
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Practice job-specific interviews with adaptive AI questions, real-time rubric evaluation, and actionable revision points.
          </p>
        </div>

        <button
          onClick={() => setShowStartModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
        >
          <Play className="w-4 h-4" /> Start New Interview Session
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <Bot className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">Adaptive Evaluation</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Evaluates technical correctness, clarity, and completeness. Fluff and keyword stuffing are not rewarded.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-blue-600">
            <Mic className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">Text & Voice Modes</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Choose standard typing or live speech-to-text with spoken AI prompts via Web Speech synthesis.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-600">
            <Award className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">Question-Wise Feedback</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Get instant breakdown of what was correct, what was missing, better answer structure, and topics to revise.
          </p>
        </div>
      </div>

      {/* Past Interview History */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Interview Sessions History ({sessions.length})
        </h2>

        {sessions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <Bot className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-base text-slate-800">No Interview Sessions Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ready to test your knowledge? Launch a mock interview tailored to your target company or engineering domain.
            </p>
            <button
              onClick={() => setShowStartModal(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Play className="w-4 h-4" /> Start First Mock Interview
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {sess.interviewType}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(sess.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 mt-2">{sess.targetRole}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sess.targetCompany} • {sess.difficulty} Level
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Overall Score</p>
                      <p className="text-lg font-extrabold text-slate-900">
                        {sess.overallScore !== null ? `${sess.overallScore}/100` : "In Progress"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          sess.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {sess.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Link
                    href={`/dashboard/interviews/${sess.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                  >
                    {sess.status === "COMPLETED" ? "View Report" : "Resume Session"} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start Interview Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" /> Start AI Mock Interview
            </h2>

            <form onSubmit={handleStartInterview} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Target Job Role *</label>
                <input
                  type="text"
                  aria-invalid={!!roleErr}
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Frontend Engineer, Full Stack, QA Engineer"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
                {roleErr && <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{roleErr}</p>}
                {jdId && <p className="mt-1 text-xs text-slate-500">Questions will focus on the skills in your analyzed job.</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Target Company</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Google, Stripe, Start-up"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Interview Type</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="TECHNICAL">Technical Deep-Dive</option>
                    <option value="BEHAVIORAL">Behavioral / Leadership</option>
                    <option value="HR">HR & Cultural Fit</option>
                    <option value="PROJECT_BASED">Project Walkthrough</option>
                    <option value="MIXED">Full Mock Panel (Mixed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="BEGINNER">Beginner / Fresher</option>
                    <option value="INTERMEDIATE">Intermediate (2-4 yrs)</option>
                    <option value="ADVANCED">Advanced / Senior</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="qcount" className="block text-xs font-semibold text-slate-700 uppercase">Number of questions</label>
                <select id="qcount" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold">
                  {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n} questions (about {n * 3} minutes)</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">Questions come from the skills on your profile, your projects{jdId ? " and the job" : ""}. Skipped questions count as zero.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Input Mode</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setMode("TEXT")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      mode === "TEXT"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Text Interview
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("VOICE")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      mode === "VOICE"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    Voice Interview (Mic)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Begin Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
