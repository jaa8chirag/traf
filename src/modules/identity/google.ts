import "server-only";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { findOrCreateUser } from "./service";
import type { Intent } from "./schemas";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const googleEnabled = (): boolean => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET);
const redirectUri = (): string => `${env().NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

export function googleAuthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: env().GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${p.toString()}`;
}

interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export async function completeGoogleLogin(
  code: string,
  intent: Intent,
): Promise<{ ok: true; userId: string } | { ok: false }> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env().GOOGLE_CLIENT_ID ?? "",
      client_secret: env().GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return { ok: false };
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return { ok: false };

  const infoRes = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${tokens.access_token}` } });
  if (!infoRes.ok) return { ok: false };
  const profile = (await infoRes.json()) as GoogleProfile;
  if (!profile.email_verified) return { ok: false };

  const result = await findOrCreateUser(profile.email.toLowerCase(), intent, true, {
    name: profile.name,
    image: profile.picture,
  });
  if (!result.ok) return { ok: false };
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: profile.sub } },
    update: {},
    create: { userId: result.userId, provider: "google", providerAccountId: profile.sub },
  });
  return { ok: true, userId: result.userId };
}
