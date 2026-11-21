import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, hashPassword, requireAuthUser, setAuthCookie, signToken } from "@/lib/auth";
import { ChangePasswordSchema } from "@/lib/validations";
import { handleError, parseBody, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await requireAuthUser();
    const rl = rateLimit(`chpw:${session.id}`, 5, 15 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const body = await parseBody(req, ChangePasswordSchema);
    if ("response" in body) return body.response;

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user || !(await comparePassword(body.data.currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Your current password is incorrect", fieldErrors: { currentPassword: "Incorrect password" } }, { status: 400 });
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.data.newPassword), tokenVersion: { increment: 1 } },
    });
    // keep THIS browser signed in; every other session is now invalid
    setAuthCookie(signToken({ id: updated.id, email: updated.email, name: updated.name, tv: updated.tokenVersion }));
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Could not change the password");
  }
}
