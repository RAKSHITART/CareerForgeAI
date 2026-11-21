import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cheap first gate: no session cookie, no dashboard. The real check (signature, expiry, token version)
 * happens in every API route via requireAuthUser(), so a forged cookie never gets any data.
 */
export function middleware(req: NextRequest) {
  const hasSession = !!req.cookies.get("careerforge_session")?.value;
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/onboarding/:path*"] };
