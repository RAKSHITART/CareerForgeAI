import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clearAuthCookie, comparePassword, requireAuthUser } from "@/lib/auth";
import { DeleteAccountSchema } from "@/lib/validations";
import { handleError, parseBody, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export async function DELETE(req: Request) {
  try {
    const session = await requireAuthUser();
    const rl = rateLimit(`delacct:${session.id}`, 5, 15 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const body = await parseBody(req, DeleteAccountSchema);
    if ("response" in body) return body.response;

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user || !(await comparePassword(body.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Password is incorrect", fieldErrors: { password: "Incorrect password" } }, { status: 400 });
    }
    await prisma.user.delete({ where: { id: user.id } });
    clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "Could not delete the account");
  }
}
