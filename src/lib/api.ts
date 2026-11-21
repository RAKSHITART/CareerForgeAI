import { NextResponse } from "next/server";
import { ZodError, ZodTypeAny, z } from "zod";

/** Turn a ZodError into { error: "first message", fieldErrors: { "skills.0.name": "..." } } */
export function validationResponse(err: ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  const first = err.issues[0];
  const where = first?.path?.length ? `${first.path.join(" › ")}: ` : "";
  return NextResponse.json({ error: `${where}${first?.message || "Invalid input"}`, fieldErrors }, { status: 400 });
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<{ data: z.output<S> } | { response: NextResponse }> {
  let json: unknown;
  try { json = await req.json(); } catch { return { response: NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }) }; }
  const r = schema.safeParse(json);
  if (!r.success) return { response: validationResponse(r.error) };
  return { data: r.data };
}

/** Map thrown errors to the right HTTP response. UNAUTHORIZED is 401, never 500. */
export function handleError(error: unknown, fallback = "Something went wrong") {
  const e = error as any;
  if (e?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (e instanceof ZodError) return validationResponse(e);
  if (e?.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
  console.error(`[api] ${fallback}:`, e?.message || e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { error: `Too many requests. Try again in ${Math.ceil(retryAfterSec)} seconds.` },
    { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterSec)) } }
  );
}

export const safeJson = <T,>(s: string | null | undefined, fallback: T): T => {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
};
