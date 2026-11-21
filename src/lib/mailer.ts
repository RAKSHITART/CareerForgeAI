import nodemailer from "nodemailer";

/**
 * Sends email through SMTP when SMTP_HOST is configured. Without SMTP it logs the message to the
 * server console (development) and reports sent:false so the caller can show the link on screen.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<{ sent: boolean }> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`\n[mail:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { sent: false };
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@careerforge.local", to, subject, text });
  return { sent: true };
}
