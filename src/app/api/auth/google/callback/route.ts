import { NextResponse, type NextRequest } from "next/server";
import {
  completeGoogleLogin,
  createSession,
  homeFor,
  googleEnabled,
  intentSchema,
  sessionFromToken,
  setSessionCookie,
} from "@/modules/identity";
import { safeNext } from "@/lib/safe-next";

const STATE_COOKIE = "tarf_oauth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const fail = () => NextResponse.redirect(new URL("/login?error=google", request.url));
  if (!googleEnabled()) return fail();

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const [nonce, intentRaw, nextRaw] = (request.cookies.get(STATE_COOKIE)?.value ?? "").split("|");
  if (!code || !state || !nonce || state !== nonce) return fail();

  const intent = intentSchema.catch("buyer").parse(intentRaw);
  const result = await completeGoogleLogin(code, intent);
  if (!result.ok) return fail();

  const { token, expiresAt } = await createSession(result.userId, {
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  await setSessionCookie(token, expiresAt);

  const next = safeNext(decodeURIComponent(nextRaw ?? ""));
  const session = await sessionFromToken(token);
  const res = NextResponse.redirect(new URL(next ?? (session ? homeFor(session.access) : "/buyer/dashboard"), request.url));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
