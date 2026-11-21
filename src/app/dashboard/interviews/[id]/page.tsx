"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Bot, CheckCircle2, ChevronDown, Info, Keyboard, Loader2, Mic, MicOff, Plus, RotateCcw, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { Badge, Button, Spinner, api, cx, inputCls, useUI } from "@/components/ui";
import { useVoice } from "@/components/useVoice";

interface Ev { score: number; technicalCorrectness?: number; clarity?: number; completeness?: number; feedbackWhatWasCorrect?: string; feedbackWhatWasMissing?: string; feedbackWhatWasIncorrect?: string; suggestedAnswer?: string; spokenReaction?: string; followUpQuestion?: string; mode?: "ai" | "heuristic" }
interface Msg { id: number; role: "bot" | "you" | "note"; text: string; kind?: "question" | "reaction" | "followup" | "intro"; qid?: string; ev?: Ev }
type Phase = "loading" | "ready" | "bot" | "answering" | "thinking" | "wrap" | "done";

const tone = (n: number) => (n >= 80 ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : n >= 60 ? "bg-amber-100 text-amber-800 ring-amber-200" : "bg-rose-100 text-rose-800 ring-rose-200");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let mid = 0;

export default function InterviewPage() {
  const params = useParams<{ id: string }>();
  const { toast, confirm } = useUI();
  const voice = useVoice();
  const vRef = useRef(voice); vRef.current = voice;

  const [session, setSession] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [report, setReport] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [ai, setAi] = useState<{ configured: boolean; model: string } | null>(null);
  const [speakOn, setSpeakOn] = useState(true);      // interviewer talks
  const [typeMode, setTypeMode] = useState(false);   // answer by typing instead of speaking
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // everything the async interview flow reads lives in refs so it never sees stale state
  const sessionRef = useRef<any>(null);
  const phaseRef = useRef<Phase>("loading");
  const qIdx = useRef(0);
  const followed = useRef(false);
  const baseAnswer = useRef("");
  const speakRef = useRef(true); speakRef.current = speakOn;
  const typeRef = useRef(false); typeRef.current = typeMode;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const go = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const add = (m: Omit<Msg, "id">) => { const id = ++mid; setMsgs((x) => [...x, { ...m, id }]); return id; };
  const scoreMsg = (id: number, ev: Ev) => setMsgs((x) => x.map((m) => (m.id === id ? { ...m, ev } : m)));
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, phase, voice.text]);

  /* ---------------- load ---------------- */
  const refresh = useCallback(async () => {
    const r = await api(`/api/interviews/${params.id}`);
    if (r.ok) { sessionRef.current = r.data.session; setSession(r.data.session); }
    return r.ok ? r.data.session : null;
  }, [params.id]);

  useEffect(() => {
    (async () => {
      const [s, me, st] = await Promise.all([api(`/api/interviews/${params.id}`), api("/api/auth/me"), api("/api/ai/status")]);
      if (!s.ok) { toast(s.error || "Could not load this interview.", "error"); return; }
      const sess = s.data.session;
      sessionRef.current = sess; setSession(sess);
      setFirstName((me.data?.user?.name || "").split(" ")[0]);
      if (st.ok) setAi(st.data);
      setSpeakOn(sess.mode === "VOICE"); setTypeMode(sess.mode !== "VOICE");

      const rebuilt: Msg[] = [];
      for (const q of sess.questions) {
        if (!q.evaluatedAt) continue;
        rebuilt.push({ id: ++mid, role: "bot", kind: "question", text: `Question ${q.questionIndex}. ${q.questionText}`, qid: q.id });
        rebuilt.push({ id: ++mid, role: "you", text: q.userResponseText || "", qid: q.id, ev: { score: q.score, feedbackWhatWasCorrect: q.feedbackWhatWasCorrect, feedbackWhatWasMissing: q.feedbackWhatWasMissing, feedbackWhatWasIncorrect: q.feedbackWhatWasIncorrect, suggestedAnswer: q.suggestedAnswer } });
      }
      setMsgs(rebuilt);
      if (sess.status === "COMPLETED") {
        setReport({ overallScore: sess.overallScore, technicalScore: sess.technicalScore, communicationScore: sess.communicationScore, knowledgeScore: sess.knowledgeScore, summaryFeedback: sess.summaryFeedback, strongAreas: sess.strongAreas || [], weakAreas: sess.weakAreas || [], recommendedTopics: sess.recommendedTopics || [], answered: sess.questions.filter((q: any) => q.evaluatedAt).length, total: sess.questions.length });
        go("done");
      } else go("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  /* ---------------- the interview flow ---------------- */
  const botSay = async (text: string, kind: Msg["kind"], qid?: string) => {
    if (!alive.current) return;
    add({ role: "bot", text, kind, qid });
    go("bot");
    if (speakRef.current && vRef.current.canSpeak) await vRef.current.speak(text);
    else await sleep(Math.min(1500, 400 + text.length * 7));
  };

  const beginAnswering = () => {
    if (!alive.current) return;
    go("answering");
    if (!typeRef.current && vRef.current.canListen) {
      vRef.current.listen({ silenceMs: 2800, minWords: 4, onDone: (t) => { void handleAnswer(t); } });
    }
  };

  const askQuestion = async (i: number) => {
    const q = sessionRef.current.questions[i];
    qIdx.current = i; followed.current = false; baseAnswer.current = "";
    await botSay(`Question ${q.questionIndex}. ${q.questionText}`, "question", q.id);
    beginAnswering();
  };

  const wrap = async () => {
    await botSay("That is all the questions I had prepared. Would you like a few more, or shall I wrap up and give you your report?", "intro");
    go("wrap");
  };

  const nextQuestion = async () => {
    const next = qIdx.current + 1;
    if (next < sessionRef.current.questions.length) await askQuestion(next); else await wrap();
  };

  const handleAnswer = async (raw: string) => {
    if (phaseRef.current !== "answering") return;
    const text = raw.trim();
    if (text.split(/\s+/).filter(Boolean).length < 2) {
      await botSay("Sorry, I did not catch that. Could you say it again?", "reaction");
      beginAnswering();
      return;
    }
    vRef.current.stopListening();
    go("thinking");
    const q = sessionRef.current.questions[qIdx.current];
    const youId = add({ role: "you", text, qid: q.id });
    const combined = followed.current ? `${baseAnswer.current}\n\n${text}` : text;
    const r = await api(`/api/interviews/${params.id}/evaluate-answer`, { method: "POST", json: { questionId: q.id, userResponseText: combined, isVoiceResponse: !typeRef.current } });
    if (!alive.current) return;
    if (!r.ok) {
      toast(r.error || "I could not score that answer.", "error");
      add({ role: "note", text: "I could not score that answer. Please answer again." });
      beginAnswering();
      return;
    }
    const ev: Ev = r.data.evaluation;
    scoreMsg(youId, ev);
    void refresh();
    await botSay(ev.spokenReaction || "Thank you.", "reaction");
    if (!followed.current && ev.score < 80 && ev.followUpQuestion) {
      followed.current = true; baseAnswer.current = combined;
      await botSay(ev.followUpQuestion, "followup");
      beginAnswering();
      return;
    }
    await nextQuestion();
  };

  const begin = async () => {
    const sess = sessionRef.current;
    const answered = sess.questions.filter((q: any) => q.evaluatedAt).length;
    const idx = sess.questions.findIndex((q: any) => !q.evaluatedAt);
    if (answered === 0) {
      await botSay(`Hi ${firstName || "there"}, I am your interviewer for the ${sess.targetRole} position${sess.targetCompany ? ` at ${sess.targetCompany}` : ""}. I will ask you ${sess.questions.length} questions. Answer out loud, the way you would in a real interview, and take your time.`, "intro");
    } else {
      await botSay("Welcome back. Let us carry on where we left off.", "intro");
    }
    if (idx === -1) await wrap(); else await askQuestion(idx);
  };

  /* ---------------- controls ---------------- */
  const skip = async () => {
    if (phaseRef.current !== "answering") return;
    vRef.current.stopListening();
    add({ role: "note", text: "Question skipped. It will count as zero in your score." });
    await botSay("No problem, let us move on.", "reaction");
    await nextQuestion();
  };

  const repeat = async () => {
    if (phaseRef.current !== "answering") return;
    vRef.current.stopListening();
    const q = sessionRef.current.questions[qIdx.current];
    await botSay(followed.current ? "Let me ask that again." : `Of course. ${q.questionText}`, "reaction");
    beginAnswering();
  };

  const switchToTyping = () => { vRef.current.stopListening(); typeRef.current = true; setTypeMode(true); };
  const switchToVoice = () => { if (!voice.canListen) { toast("This browser cannot listen. Use Chrome or Edge.", "error"); return; } typeRef.current = false; setTypeMode(false); if (phaseRef.current === "answering") beginAnswering(); };

  const sendTyped = () => { const t = typed; setTyped(""); void handleAnswer(t); };

  const more = async () => {
    go("thinking");
    const r = await api(`/api/interviews/${params.id}/more`, { method: "POST", json: { count: 3 } });
    if (!r.ok) { toast(r.error || "Could not add questions.", "error"); go("wrap"); return; }
    if (r.data.exhausted) { await botSay(r.data.error, "intro"); go("wrap"); return; }
    const before = sessionRef.current.questions.length;
    sessionRef.current = { ...sessionRef.current, questions: r.data.questions }; setSession(sessionRef.current);
    await botSay("Great, a few more.", "reaction");
    await askQuestion(before);
  };

  const finish = async () => {
    const answered = sessionRef.current.questions.filter((q: any) => q.evaluatedAt).length;
    if (answered === 0) { toast("Answer at least one question first.", "error"); return; }
    const unanswered = sessionRef.current.questions.length - answered;
    if (unanswered > 0 && !(await confirm({ title: "Finish with unanswered questions?", body: `${unanswered} unanswered question(s) will count as zero.`, confirmLabel: "Finish" }))) return;
    vRef.current.stopListening(); go("thinking");
    const r = await api(`/api/interviews/${params.id}/complete`, { method: "POST" });
    if (!r.ok) { toast(r.error || "Could not finish.", "error"); go("wrap"); return; }
    await refresh();
    setReport(r.data.report); go("done");
  };

  /* ---------------- render ---------------- */
  if (phase === "loading" || !session) return <Spinner label="Loading your interview" />;
  const total = session.questions.length;
  const answeredCount = session.questions.filter((q: any) => q.evaluatedAt).length;
  const canVoice = voice.canListen;

  if (phase === "done" && report) {
    const qs = session.questions.filter((q: any) => q.evaluatedAt);
    return (
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <Link href="/dashboard/interviews" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Interview hub</Link>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Badge tone="green">Interview complete</Badge>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{session.targetRole} interview report</h1>
          <p className="mt-1 text-sm text-slate-600">{report.summaryFeedback}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([["Overall", report.overallScore], ["Accuracy", report.technicalScore], ["Communication", report.communicationScore], ["Completeness", report.knowledgeScore]] as const).map(([l, v]) => (
              <div key={l} className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xs font-medium uppercase text-slate-500">{l}</p><p className={cx("mt-1 text-2xl font-bold", v >= 80 ? "text-emerald-700" : v >= 60 ? "text-amber-700" : "text-rose-700")}>{v}</p></div>))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{report.answered} of {report.total} questions answered.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"><h2 className="flex items-center gap-1.5 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-4 w-4" />Strong areas</h2>
              {(report.strongAreas || []).length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{report.strongAreas.map((a: string) => <li key={a}>{a}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">None scored 75 or above yet.</p>}</div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><h2 className="flex items-center gap-1.5 text-sm font-bold text-amber-900"><AlertCircle className="h-4 w-4" />Work on</h2>
              {([...(report.weakAreas || []), ...(report.recommendedTopics || [])]).length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{[...(report.weakAreas || []), ...(report.recommendedTopics || [])].slice(0, 8).map((a: string, i: number) => <li key={i}>{a}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Nothing flagged.</p>}</div>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Question by question</h2>
          <ul className="mt-3 divide-y divide-slate-100">{qs.map((q: any) => (
            <li key={q.id} className="py-3"><details><summary className="flex cursor-pointer items-start justify-between gap-3"><span className="text-sm font-medium text-slate-900">{q.questionText}</span><span className={cx("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset", tone(q.score))}>{q.score}</span></summary>
              <div className="mt-2 space-y-2 text-sm text-slate-700"><p><span className="font-semibold">Your answer:</span> {q.userResponseText}</p>
                {q.feedbackWhatWasMissing && <p><span className="font-semibold">Missing:</span> {q.feedbackWhatWasMissing}</p>}
                {q.suggestedAnswer && <p><span className="font-semibold">A strong answer:</span> {q.suggestedAnswer}</p>}</div></details></li>))}</ul>
        </section>
        <div className="flex flex-wrap gap-3"><Link href="/dashboard/interviews" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Practise again</Link><Link href="/dashboard/skill-growth" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Build the skills I missed</Link></div>
      </div>
    );
  }

  const listening = voice.listening && !typeMode;
  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-3xl flex-col p-3 sm:p-5">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2"><Link href="/dashboard/interviews" aria-label="Back to interviews" className="mt-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link>
          <div><h1 className="text-lg font-bold text-slate-900">{session.targetRole} interview</h1><p className="text-xs text-slate-500">{session.targetCompany} · {String(session.interviewType).replace("_", " ").toLowerCase()} · {String(session.difficulty).toLowerCase()}</p></div></div>
        <div className="text-right"><p className="text-sm font-semibold text-slate-800">{Math.min(answeredCount + (phase === "answering" || phase === "bot" ? 1 : 0), total)} / {total}</p>
          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(answeredCount / total) * 100}%` }} /></div></div>
      </header>

      {ai && !ai.configured && (
        <p className="mb-2 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span><strong>Basic scoring is on.</strong> Without an AI key I can only check whether you covered the key points, not whether what you said is correct. For proper evaluation add a free Gemini key in <code>.env</code>, then test it in <Link href="/dashboard/settings" className="font-semibold underline">Settings</Link>.</span></p>
      )}

      {/* conversation */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4" role="log" aria-live="polite" aria-label="Interview conversation">
        {phase === "ready" && (
          <div className="mx-auto max-w-md rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white"><Bot className="h-6 w-6" /></span>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Ready when you are</h2>
            <p className="mt-1 text-sm text-slate-600">{total} questions. I will ask, you answer out loud, and I will react, ask a follow-up if needed, and score each answer.</p>
            <div className="mt-4 space-y-2 text-left text-sm text-slate-700">
              <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" checked={speakOn} onChange={(e) => setSpeakOn(e.target.checked)} />Interviewer speaks aloud</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" checked={!typeMode} disabled={!canVoice} onChange={(e) => setTypeMode(!e.target.checked)} />I answer with my voice {!canVoice && <span className="text-xs text-amber-700">(not supported in this browser)</span>}</label>
            </div>
            <p className="mt-3 text-xs text-slate-500">Use Chrome or Edge, turn the volume up, and click Allow when asked for the microphone.</p>
            <Button className="mt-4 w-full" onClick={() => { void begin(); }}><Volume2 className="h-4 w-4" />{answeredCount ? "Continue interview" : "Start interview"}</Button>
          </div>
        )}

        {msgs.map((m) => m.role === "note" ? (
          <p key={m.id} className="text-center text-xs text-slate-400">{m.text}</p>
        ) : m.role === "bot" ? (
          <div key={m.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><Bot className="h-4 w-4" /></span>
            <div className={cx("max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm", m.kind === "question" ? "bg-slate-100 font-medium text-slate-900" : m.kind === "followup" ? "bg-amber-50 text-slate-900 ring-1 ring-amber-200" : "bg-slate-50 text-slate-700")}>{m.text}</div>
          </div>
        ) : (
          <div key={m.id} className="flex flex-col items-end gap-1.5">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white">{m.text}</div>
            {m.ev && (
              <div className="max-w-[85%] self-end">
                <button onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
                  <span className={cx("rounded-full px-2.5 py-0.5 font-bold ring-1 ring-inset", tone(m.ev.score))}>Score {m.ev.score}/100</span>Feedback<ChevronDown className={cx("h-3.5 w-3.5 transition", open === m.id && "rotate-180")} /></button>
                {open === m.id && (
                  <div className="mt-1.5 space-y-1.5 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-700">
                    {m.ev.feedbackWhatWasCorrect && <p><span className="font-semibold text-emerald-700">Good:</span> {m.ev.feedbackWhatWasCorrect}</p>}
                    {m.ev.feedbackWhatWasMissing && <p><span className="font-semibold text-amber-700">Missing:</span> {m.ev.feedbackWhatWasMissing}</p>}
                    {m.ev.feedbackWhatWasIncorrect && <p><span className="font-semibold text-rose-700">Check:</span> {m.ev.feedbackWhatWasIncorrect}</p>}
                    {m.ev.suggestedAnswer && <p><span className="font-semibold text-slate-900">A strong answer:</span> {m.ev.suggestedAnswer}</p>}
                  </div>)}
              </div>)}
          </div>
        ))}

        {phase === "thinking" && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Thinking about your answer…</div>}
        {listening && voice.text && <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm italic text-blue-900">{voice.text}</div></div>}
        <div ref={endRef} />
      </div>

      {/* control dock */}
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
        {phase === "bot" && (
          <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm text-slate-600"><span className="flex items-end gap-0.5" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className="w-1 animate-pulse rounded bg-blue-600" style={{ height: 6 + ((i * 7) % 12), animationDelay: `${i * 120}ms` }} />)}</span>{voice.speaking ? "Interviewer is speaking…" : "Interviewer is typing…"}</p>
            {voice.speaking && <Button size="sm" variant="ghost" onClick={() => voice.stopSpeaking()}><VolumeX className="h-4 w-4" />Skip voice</Button>}</div>
        )}

        {phase === "answering" && !typeMode && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white", listening ? "animate-pulse bg-rose-500" : voice.blocked ? "bg-slate-400" : "bg-blue-600")}>{voice.blocked ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{voice.blocked ? "Microphone is blocked" : listening ? "Listening… just talk" : "Starting the microphone…"}</p>
                <p className="text-xs text-slate-500">{voice.blocked ? "Allow the microphone in your browser's site settings, or type instead." : "When you stop talking for a moment I will take it as your answer."}</p></div>
              <Button size="sm" onClick={() => { const t = voice.text.trim(); if (t.split(/\s+/).filter(Boolean).length < 2) toast("I have not heard your answer yet.", "info"); else voice.submitNow(); }} disabled={voice.blocked}><Square className="h-3.5 w-3.5" />I am done</Button>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2"><Button size="sm" variant="ghost" onClick={repeat}><RotateCcw className="h-4 w-4" />Repeat question</Button><Button size="sm" variant="ghost" onClick={skip}><SkipForward className="h-4 w-4" />Skip</Button><Button size="sm" variant="ghost" onClick={switchToTyping}><Keyboard className="h-4 w-4" />Type instead</Button></div>
          </div>
        )}

        {phase === "answering" && typeMode && (
          <div className="space-y-2">
            <label htmlFor="typed" className="sr-only">Your answer</label>
            <textarea id="typed" rows={3} value={typed} onChange={(e) => setTyped(e.target.value)} className={inputCls} placeholder="Type your answer… (Enter to send, Shift+Enter for a new line)" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (typed.trim()) sendTyped(); } }} />
            <div className="flex flex-wrap items-center gap-2"><Button size="sm" onClick={sendTyped} disabled={typed.trim().length < 2}>Send answer</Button>
              <Button size="sm" variant="ghost" onClick={repeat}><RotateCcw className="h-4 w-4" />Repeat</Button><Button size="sm" variant="ghost" onClick={skip}><SkipForward className="h-4 w-4" />Skip</Button>
              {canVoice && <Button size="sm" variant="ghost" onClick={switchToVoice}><Mic className="h-4 w-4" />Use my voice</Button>}</div>
          </div>
        )}

        {phase === "wrap" && (
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { void more(); }}><Plus className="h-4 w-4" />3 more questions</Button><Button onClick={() => { void finish(); }}>Finish and see my report</Button></div>
        )}
        {(phase === "ready" || phase === "thinking") && <p className="text-center text-xs text-slate-400">{phase === "ready" ? "Press Start to begin." : "One moment…"}</p>}
        {phase === "answering" && answeredCount > 0 && <div className="mt-2 text-right"><button onClick={() => { void finish(); }} className="text-xs font-medium text-slate-500 underline hover:text-slate-800">End interview and see report</button></div>}
      </div>
    </div>
  );
}
