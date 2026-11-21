import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES, extractTextFromFile } from "@/services/documents/file-text";
import { parseAndCompareResume } from "@/services/documents/resume-parser";

/** Accepts a resume file (multipart "file") or pasted text (JSON {text}), compares it with the profile. */
export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const rl = rateLimit(`upload:${user.id}`, 30, 60 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    let text = "";
    const type = req.headers.get("content-type") || "";
    if (type.includes("multipart/form-data")) {
      const file = (await req.formData()).get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
      if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "File is too large (max 2 MB)" }, { status: 400 });
      try { text = await extractTextFromFile(Buffer.from(await file.arrayBuffer()), file.name); }
      catch (e: any) {
        if (e?.message === "UNSUPPORTED_FILE") return NextResponse.json({ error: "Unsupported file type. Use .pdf, .docx or .txt" }, { status: 415 });
        return NextResponse.json({ error: "Could not read that file. Try another format or paste the text." }, { status: 422 });
      }
    } else {
      const body = await req.json().catch(() => ({}));
      text = typeof body?.text === "string" ? body.text.slice(0, 60_000) : "";
    }
    if (text.trim().length < 30) return NextResponse.json({ error: "Not enough text to analyse (at least 30 characters)" }, { status: 400 });

    const skills = await prisma.candidateSkill.findMany({ where: { profile: { userId: user.id } }, select: { name: true, proficiencyLevel: true } });
    return NextResponse.json({ report: parseAndCompareResume(text, skills), characters: text.length });
  } catch (error) {
    return handleError(error, "Could not analyse the resume");
  }
}
