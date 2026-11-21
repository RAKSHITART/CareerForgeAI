/** Thin Gemini client shared by the JD extractor and the answer evaluator. */

const DEFAULT_MODEL = "gemini-flash-latest"; // override with GEMINI_MODEL; old 1.5 models are retired
let warned = false;

export function aiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}

/** Strip control characters, cap length. Untrusted text must only ever be passed as quoted data. */
export function sanitizeForPrompt(text: string, max = 12000): string {
  return (text || "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/```/g, "'''")
    .slice(0, max);
}

export async function callGeminiJSON(prompt: string, _temperature?: number): Promise<any | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }, // newer Gemini models reject sampling settings such as temperature
      }),
    });
    if (!res.ok) {
      if (!warned) {
        warned = true;
        console.warn(`[ai] Gemini request failed (HTTP ${res.status}) for model "${model}". Falling back to the built-in engine. Check GEMINI_MODEL / GEMINI_API_KEY.`);
      }
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text.replace(/^```json|```$/g, "").trim());
  } catch (err: any) {
    if (!warned) {
      warned = true;
      console.warn("[ai] Gemini unavailable, using built-in engine:", err?.name || err?.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function aiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/** One tiny request that tells the user exactly why AI scoring is or is not working. */
export async function testGemini(): Promise<{ ok: boolean; model: string; message: string }> {
  const model = aiModel();
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { ok: false, model, message: "No GEMINI_API_KEY is set in your .env file." };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: 'Reply with exactly: {"ok":true}' }] }], generationConfig: { responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return { ok: true, model, message: `Connected. Using model "${model}".` };
    const detail = await res.json().catch(() => ({}));
    const why = detail?.error?.message ? String(detail.error.message).slice(0, 180) : "";
    if (res.status === 400 && /API key/i.test(why)) return { ok: false, model, message: "Google rejected the API key. Create a new key at aistudio.google.com and paste it in .env." };
    if (res.status === 404) return { ok: false, model, message: `The model "${model}" was not found. Set GEMINI_MODEL=gemini-flash-latest in .env.` };
    if (res.status === 403) return { ok: false, model, message: "This key is not allowed to use the Gemini API. Check that the API is enabled for the key's project." };
    if (res.status === 429) return { ok: false, model, message: "Rate limit or free quota reached. Wait a minute and try again." };
    return { ok: false, model, message: `Google returned HTTP ${res.status}. ${why}`.trim() };
  } catch {
    return { ok: false, model, message: "Could not reach Google. Check your internet connection." };
  }
}
