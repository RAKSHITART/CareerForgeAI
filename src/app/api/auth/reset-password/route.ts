import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { ResetPasswordSchema } from "@/lib/validations";
import { handleError, parseBody, tooMany } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const body = await parseBody(req, ResetPasswordSchema);
    if ("response" in body) return body.response;
    const { token, newPassword } = body.data;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
    ]);
    return NextResponse.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (error) {
    return handleError(error, "Could not reset the password");
  }
}
