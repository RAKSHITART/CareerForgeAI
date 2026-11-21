import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, setAuthCookie, signToken } from "@/lib/auth";
import { RegisterSchema } from "@/lib/validations";
import { handleError, parseBody, tooMany } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfter);

    const body = await parseBody(req, RegisterSchema);
    if ("response" in body) return body.response;
    const { name, email, password } = body.data;

    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "An account with this email already exists. Try signing in instead.", fieldErrors: { email: "Already registered" } }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        name,
        isVerified: true,
        profile: { create: { fullName: name, email } },
        notifications: {
          create: {
            title: "Welcome to CareerForge AI",
            message: "Complete the profile wizard to unlock evidence-based resume tailoring and mock interviews.",
            type: "SYSTEM",
          },
        },
      },
    });

    setAuthCookie(signToken({ id: user.id, email: user.email, name: user.name, tv: user.tokenVersion }));
    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    return handleError(error, "Could not create your account");
  }
}
