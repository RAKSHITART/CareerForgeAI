import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, setAuthCookie, signToken } from "@/lib/auth";
import { LoginSchema } from "@/lib/validations";
import { handleError, parseBody, tooMany } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// valid bcrypt hash of a random string, compared when the account does not exist so timing does not leak it
const DUMMY_HASH = "$2a$10$heGJXN3ilMvbil1OdjCw4uoLQSWCMw3lizGi3YEGB3/FpHw4FCGOe";

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, LoginSchema);
    if ("response" in body) return body.response;
    const { email, password } = body.data;

    const rl = rateLimit(`login:${clientIp(req)}:${email}`, 8, 15 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await comparePassword(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !ok) return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });

    setAuthCookie(signToken({ id: user.id, email: user.email, name: user.name, tv: user.tokenVersion }));
    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    return handleError(error, "Could not sign you in");
  }
}
