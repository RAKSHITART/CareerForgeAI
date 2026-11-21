import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { handleError, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { aiEnabled, aiModel, testGemini } from "@/services/ai/gemini";

/** Is live AI configured? (no network call) */
export async function GET() {
  try {
    await requireAuthUser();
    return NextResponse.json({ configured: aiEnabled(), model: aiModel() });
  } catch (error) {
    return handleError(error, "Could not read the AI status");
  }
}

/** Makes one real request and explains the result, so a wrong key or model name is obvious. */
export async function POST() {
  try {
    const user = await requireAuthUser();
    const rl = rateLimit(`aitest:${user.id}`, 10, 10 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);
    return NextResponse.json(await testGemini());
  } catch (error) {
    return handleError(error, "Could not test the AI connection");
  }
}
