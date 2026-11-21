// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useVoice } from "@/components/useVoice";

// ---- a fake browser speech API ----
let utterances: any[] = [];
let recs: any[] = [];
class FakeUtterance { text: string; voice: any; lang = ""; rate = 1; onstart: any; onend: any; onerror: any; constructor(t: string) { this.text = t; } }
class FakeRecognition {
  continuous = false; interimResults = false; lang = ""; onstart: any; onresult: any; onerror: any; onend: any; started = false;
  start() { this.started = true; recs.push(this); queueMicrotask(() => this.onstart?.()); }
  stop() { this.started = false; queueMicrotask(() => this.onend?.()); }
  abort() { this.started = false; }
}
const result = (text: string, isFinal: boolean, index = 0) => ({ resultIndex: index, results: Object.assign([Object.assign([{ transcript: text }], { isFinal })], { length: 1 }) });

beforeEach(() => {
  vi.useFakeTimers();
  utterances = []; recs = [];
  (window as any).SpeechSynthesisUtterance = FakeUtterance;
  (window as any).speechSynthesis = {
    speaking: false, getVoices: () => [{ name: "Google UK English", lang: "en-GB" }],
    cancel: vi.fn(),
    speak: (u: any) => { utterances.push(u); setTimeout(() => { u.onstart?.(); setTimeout(() => u.onend?.(), 10); }, 5); },
  };
  (window as any).webkitSpeechRecognition = FakeRecognition;
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("useVoice: the interviewer speaks", () => {
  it("splits long questions into chunks (Chrome cuts off long speech) and resolves when done", async () => {
    const { result: r } = renderHook(() => useVoice());
    const long = Array.from({ length: 8 }, (_, i) => `This is sentence number ${i + 1} of a fairly long interview question about system design.`).join(" ");
    let done = false;
    act(() => { r.current.speak(long).then(() => { done = true; }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(utterances.length).toBeGreaterThan(2);
    expect(utterances.every((u) => u.text.length <= 220)).toBe(true);
    expect(done).toBe(true);
  });
  it("stopSpeaking resolves the pending promise instead of hanging the interview", async () => {
    const { result: r } = renderHook(() => useVoice());
    let done = false;
    act(() => { r.current.speak("A short question that will be interrupted.").then(() => { done = true; }); });
    act(() => { r.current.stopSpeaking(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(done).toBe(true);
  });
  it("does not hang if the browser blocks audio and never starts speaking", async () => {
    (window as any).speechSynthesis.speak = () => { /* never fires onstart */ };
    const { result: r } = renderHook(() => useVoice());
    let done = false;
    act(() => { r.current.speak("Question one.").then(() => { done = true; }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(done).toBe(true);
  });
});

describe("useVoice: the candidate answers by voice", () => {
  it("submits the answer automatically after you stop talking, with the full transcript", async () => {
    const { result: r } = renderHook(() => useVoice());
    const onDone = vi.fn();
    act(() => { expect(r.current.listen({ silenceMs: 2000, minWords: 4, onDone })).toBe(true); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    const rec = recs[0];
    act(() => rec.onresult(result("A list is mutable and ordered", true)));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(onDone).not.toHaveBeenCalled();                         // still within the pause
    act(() => rec.onresult(result("while a tuple is immutable", true)));
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0][0]).toBe("A list is mutable and ordered while a tuple is immutable");
  });
  it("does not submit on a pause when too few words were heard", async () => {
    const { result: r } = renderHook(() => useVoice());
    const onDone = vi.fn();
    act(() => { r.current.listen({ silenceMs: 1000, minWords: 4, onDone }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    act(() => recs[0].onresult(result("um yes", true)));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(onDone).not.toHaveBeenCalled();
  });
  it("restarts the microphone when the browser ends the session during a silence", async () => {
    const { result: r } = renderHook(() => useVoice());
    act(() => { r.current.listen({ onDone: vi.fn() }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(recs).toHaveLength(1);
    act(() => recs[0].onend());                                    // Chrome drops the mic
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(recs).toHaveLength(2);
    expect(recs[1].started).toBe(true);
  });
  it("stops the interviewer before the microphone opens, and reports a blocked microphone", async () => {
    const { result: r } = renderHook(() => useVoice());
    act(() => { r.current.listen({ onDone: vi.fn() }); });
    expect((window as any).speechSynthesis.cancel).toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    act(() => recs[0].onerror({ error: "not-allowed" }));
    act(() => recs[0].onend());
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(r.current.blocked).toBe(true);
    expect(recs).toHaveLength(1);                                   // does not loop on a blocked mic
  });
  it("'I am done' submits what was heard right now", async () => {
    const { result: r } = renderHook(() => useVoice());
    const onDone = vi.fn();
    act(() => { r.current.listen({ onDone }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    act(() => recs[0].onresult(result("closures keep access to outer variables", true)));
    act(() => r.current.submitNow());
    expect(onDone).toHaveBeenCalledWith("closures keep access to outer variables");
  });
  it("reports no support instead of crashing when the browser has no speech recognition", () => {
    delete (window as any).webkitSpeechRecognition;
    const { result: r } = renderHook(() => useVoice());
    let ok = true; act(() => { ok = r.current.listen({ onDone: vi.fn() }); });
    expect(ok).toBe(false);
  });
});
