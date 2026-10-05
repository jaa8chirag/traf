import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { googleAuthUrl, googleEnabled, intentSchema } from "@/modules/identity";
import { safeNext } from "@/lib/safe-next";

const STATE_COOKIE = "tarf_oauth";

export function GET(request: NextRequest): NextResponse {
  if (!googleEnabled()) return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 501 });

  const params = request.nextUrl.searchParams;
  const intent = intentSchema.catch("buyer").parse(params.get("intent") ?? undefined);
  const nonce = randomBytes(16).toString("base64url");
  const next = safeNext(params.get("next")) ?? "";

  const res = NextResponse.redirect(googleAuthUrl(nonce));
  // nonce|intent|next, bound to this browser; verified in the callback (CSRF protection).
  res.cookies.set(STATE_COOKIE, `${nonce}|${intent}|${encodeURIComponent(next)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
