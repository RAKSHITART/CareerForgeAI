import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { handleError, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES, extractTextFromFile } from "@/services/documents/file-text";

/** Turns an uploaded .txt / .docx / .pdf into plain text for the paste box. Nothing is stored. */
export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const rl = rateLimit(`upload:${user.id}`, 30, 60 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "File is too large (max 2 MB)" }, { status: 400 });

    try {
      const text = await extractTextFromFile(Buffer.from(await file.arrayBuffer()), file.name);
      if (!text) return NextResponse.json({ error: "No readable text found. If this is a scanned PDF, paste the text instead." }, { status: 422 });
      return NextResponse.json({ text });
    } catch (e: any) {
      if (e?.message === "UNSUPPORTED_FILE") return NextResponse.json({ error: "Unsupported file type. Use .pdf, .docx or .txt" }, { status: 415 });
      return NextResponse.json({ error: "Could not read that file. Try another format or paste the text." }, { status: 422 });
    }
  } catch (error) {
    return handleError(error, "Upload failed");
  }
}
