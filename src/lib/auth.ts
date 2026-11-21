import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import prisma from "./prisma";

const COOKIE_NAME = "careerforge_session";

/** Required in production. A fixed dev-only fallback keeps local development frictionless. */
function jwtSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set (16+ characters) in production. Generate one with: openssl rand -hex 32");
  }
  return "dev-only-insecure-secret-do-not-use-in-production";
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  /** token version; bumped on password change so old sessions die */
  tv?: number;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: SessionUser): string {
  return jwt.sign({ id: user.id, email: user.email, name: user.name, tv: user.tv ?? 0 }, jwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as SessionUser;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const session = verifyToken(token);
    if (!session) return null;
    // the account must still exist and the session must not predate a password change
    const row = await prisma.user.findUnique({ where: { id: session.id }, select: { tokenVersion: true, email: true, name: true } });
    if (!row || row.tokenVersion !== (session.tv ?? 0)) return null;
    return { id: session.id, email: row.email, name: row.name, tv: row.tokenVersion };
  } catch {
    return null;
  }
}

export async function requireAuthUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}
