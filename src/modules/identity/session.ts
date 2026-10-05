import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { sessionFromToken, type CurrentSession } from "./service";

export const SESSION_COOKIE = "tarf_session";

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Current session for this request (deduped per render via React cache). */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const token = await readSessionToken();
  return token ? sessionFromToken(token) : null;
});
