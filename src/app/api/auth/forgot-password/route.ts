import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { ForgotPasswordSchema } from "@/lib/validations";
import { handleError, parseBody, tooMany } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mailer";

const GENERIC = "If an account exists for that email, a reset link has been sent. It expires in 30 minutes.";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, ForgotPasswordSchema);
    if ("response" in body) return body.response;
    const { email } = body.data;

    const rl = rateLimit(`forgot:${clientIp(req)}:${email}`, 5, 60 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const user = await prisma.user.findUnique({ where: { email } });
    let devResetLink: string | undefined;

    if (user) {
      const raw = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } }),
      ]);
      const origin = process.env.APP_URL || req.headers.get("origin") || new URL(req.url).origin;
      const link = `${origin}/reset-password?token=${raw}`;
      const { sent } = await sendMail(user.email, "Reset your CareerForge AI password", `Hi ${user.name},\n\nUse this link to choose a new password (valid for 30 minutes):\n${link}\n\nIf you did not ask for this, ignore this email.`);
      // Without SMTP configured (local development only) show the link so the flow can be tested.
      if (!sent && process.env.NODE_ENV !== "production") devResetLink = link;
    }
    return NextResponse.json({ message: GENERIC, ...(devResetLink ? { devResetLink } : {}) });
  } catch (error) {
    return handleError(error, "Could not start the password reset");
  }
}
