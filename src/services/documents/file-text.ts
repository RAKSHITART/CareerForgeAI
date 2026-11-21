/** Extract plain text from an uploaded .txt / .md / .docx / .pdf file (server side only). */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function extractTextFromFile(buf: Buffer, filename: string): Promise<string> {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  let text = "";
  if (ext === "txt" || ext === "md") {
    text = buf.toString("utf8");
  } else if (ext === "docx") {
    const mammoth = await import("mammoth");
    text = (await mammoth.extractRawText({ buffer: buf })).value;
  } else if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
  } else {
    throw new Error("UNSUPPORTED_FILE");
  }
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim().slice(0, 60_000);
}
