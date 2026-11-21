"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceError = "blocked" | "network" | "no-mic" | "unresponsive";

export interface ListenOptions {
  /** ms of silence after you stop talking before the answer is submitted */
  silenceMs?: number;
  /** ignore pauses until at least this many words were heard */
  minWords?: number;
  onDone: (text: string) => void;
  /** called once when listening cannot work (blocked mic, no internet for the speech service, no audio) */
  onError?: (kind: VoiceError) => void;
}

/** split into short chunks: Chrome silently stops long utterances after ~15 seconds */
function chunk(text: string, max = 170): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).trim().length > max && cur) { out.push(cur.trim()); cur = s; } else cur = (cur + " " + s).trim();
  }
  if (cur) out.push(cur.trim());
  return out;
}

/**
 * Speech for an interview: the interviewer speaks (speak) and the candidate answers by voice (listen).
 * Everything resolves or stops cleanly, the mic is never open while the interviewer talks, and a mic
 * that the browser drops after a silence is restarted automatically.
 */
export function useVoice() {
  const [caps, setCaps] = useState({ speak: false, listen: false });
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);

  const speakToken = useRef(0);
  const recRef = useRef<any>(null);
  const wantRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const timerRef = useRef<any>(null);
  const optsRef = useRef<ListenOptions | null>(null);
  const quickFails = useRef(0);   // sessions that ended almost immediately, in a row

  useEffect(() => {
    const w = window as any;
    setCaps({ speak: "speechSynthesis" in window, listen: !!(w.SpeechRecognition || w.webkitSpeechRecognition) });
    // voices load asynchronously in Chrome; touching the list early makes them available
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  const pickVoice = () => {
    const vs = window.speechSynthesis.getVoices();
    return vs.find((v) => /^en-(IN|GB|US)/i.test(v.lang) && /natural|google|online|microsoft/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  };

  const stopSpeaking = useCallback(() => {
    speakToken.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  /** Speaks the text and resolves when finished, interrupted, or if speech is unavailable. */
  const speak = useCallback((t: string) => new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !t.trim()) { resolve(); return; }
    const id = ++speakToken.current;
    window.speechSynthesis.cancel();
    const parts = chunk(t);
    let i = 0;
    const finish = () => { if (id === speakToken.current) setSpeaking(false); resolve(); };
    const next = () => {
      if (id !== speakToken.current) { resolve(); return; }
      if (i >= parts.length) { finish(); return; }
      const u = new SpeechSynthesisUtterance(parts[i++]);
      const v = pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
      u.rate = 0.97;
      let started = false;
      u.onstart = () => { started = true; if (id === speakToken.current) setSpeaking(true); };
      u.onend = next;
      u.onerror = () => { if (id === speakToken.current) next(); else resolve(); };
      window.speechSynthesis.speak(u);
      // if the browser never starts this chunk (blocked audio), do not hang the interview
      setTimeout(() => { if (id === speakToken.current && !started && !window.speechSynthesis.speaking) { speakToken.current++; setSpeaking(false); resolve(); } }, 3500);
    };
    next();
  }), []);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

  const currentText = () => (finalRef.current + " " + interimRef.current).replace(/\s+/g, " ").trim();

  const finish = useCallback(() => {
    const o = optsRef.current;
    wantRef.current = false;
    clearTimer();
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    const t = currentText();
    finalRef.current = ""; interimRef.current = ""; setText(""); setListening(false);
    optsRef.current = null;
    o?.onDone(t);
  }, []);

  const armTimer = useCallback(() => {
    clearTimer();
    const o = optsRef.current; if (!o) return;
    timerRef.current = setTimeout(() => {
      const words = currentText().split(/\s+/).filter(Boolean).length;
      if (wantRef.current && words >= (o.minWords ?? 4)) finish();
    }, o.silenceMs ?? 2800);
  }, [finish]);

  /** Listening cannot work: stop cleanly, remember why, and tell the caller once. */
  const fail = useCallback((kind: VoiceError) => {
    const o = optsRef.current;
    wantRef.current = false; clearTimer();
    try { recRef.current?.abort?.(); } catch { /* ignore */ }
    setListening(false); setError(kind); if (kind === "blocked") setBlocked(true);
    optsRef.current = null;
    o?.onError?.(kind);
  }, []);

  /** Starts listening. Returns false when this browser has no speech recognition. */
  const listen = useCallback((opts: ListenOptions): boolean => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return false;
    stopSpeaking(); // the mic must never hear the interviewer
    try { recRef.current?.abort?.(); } catch { /* ignore */ }
    optsRef.current = opts; wantRef.current = true; finalRef.current = ""; interimRef.current = ""; quickFails.current = 0;
    setText(""); setBlocked(false); setError(null);
    // "listening" is what the person sees. It stays on while the browser restarts its session behind the
    // scenes, so the screen no longer flickers between states.
    setListening(true);

    const start = () => {
      const rec = new SR();
      const startedAt = Date.now();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = /^en/i.test(navigator.language) ? navigator.language : "en-US";
      rec.onresult = (ev: any) => {
        quickFails.current = 0;
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) finalRef.current += " " + r[0].transcript; else interim += " " + r[0].transcript;
        }
        interimRef.current = interim;
        const next = currentText();
        setText((prev) => (prev === next ? prev : next));
        armTimer();
      };
      rec.onerror = (ev: any) => {
        const e = ev?.error;
        if (e === "not-allowed" || e === "service-not-allowed") fail("blocked");
        else if (e === "network") fail("network");
        else if (e === "audio-capture") fail("no-mic");
        // "no-speech" and "aborted" are normal: the session ends and is restarted below
      };
      rec.onend = () => {
        recRef.current = null;
        if (!wantRef.current) return;
        // a session that dies within ~1.5s over and over means no audio is arriving at all
        if (Date.now() - startedAt < 1500) quickFails.current++; else quickFails.current = 0;
        if (quickFails.current >= 6) { fail("unresponsive"); return; }
        setTimeout(() => { if (wantRef.current && !recRef.current) start(); }, 250 + quickFails.current * 250);
      };
      recRef.current = rec;
      try { rec.start(); } catch { recRef.current = null; }
    };
    start();
    return true;
  }, [armTimer, fail, stopSpeaking]);

  /** Stop listening without submitting; returns what was heard so far. */
  const stopListening = useCallback((): string => {
    wantRef.current = false; clearTimer();
    try { recRef.current?.stop(); } catch { /* ignore */ }
    const t = currentText();
    finalRef.current = ""; interimRef.current = ""; setText(""); optsRef.current = null; setListening(false);
    return t;
  }, []);

  /** "I'm done": submit what was heard right now. */
  const submitNow = useCallback(() => { if (optsRef.current) finish(); }, [finish]);

  useEffect(() => () => {
    wantRef.current = false; clearTimer();
    try { recRef.current?.abort?.(); } catch { /* ignore */ }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return { canSpeak: caps.speak, canListen: caps.listen, speaking, listening, text, blocked, error, speak, stopSpeaking, listen, stopListening, submitNow };
}
