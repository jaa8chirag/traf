"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  codeSchema,
  createSession,
  destroySession,
  homeFor,
  emailSchema,
  intentSchema,
  purposeSchema,
  readSessionToken,
  requestOtp,
  sessionFromToken,
  setSessionCookie,
  verifyOtp,
  type Intent,
  type OtpPurpose,
} from "@/modules/identity";
import { t } from "@/lib/i18n/t";
import { safeNext } from "@/lib/safe-next";

export interface AuthFormState {
  step: "email" | "code";
  email: string;
  error?: string;
}

function parsePurpose(formData: FormData): OtpPurpose {
  return purposeSchema.catch("login").parse(formData.get("purpose"));
}

function parseIntent(formData: FormData): Intent {
  return intentSchema.catch("buyer").parse(formData.get("intent") ?? undefined);
}

export async function requestCodeAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { step: "email", email: "", error: t("auth.error.generic") };
  try {
    const result = await requestOtp(email.data, parsePurpose(formData));
    if (!result.ok) return { step: "email", email: email.data, error: t("auth.error.tooMany") };
  } catch {
    return { step: "email", email: email.data, error: t("auth.error.generic") };
  }
  return { step: "code", email: email.data };
}

export async function verifyCodeAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const emailParsed = emailSchema.safeParse(formData.get("email"));
  const code = codeSchema.safeParse(formData.get("code"));
  if (!emailParsed.success || !code.success) {
    return { step: "code", email: "", error: t("auth.error.invalidCode") };
  }
  const prev = { step: "code" as const, email: emailParsed.data };

  const purpose = parsePurpose(formData);
  const intent = parseIntent(formData);
  const result = await verifyOtp(prev.email, code.data, purpose, intent);
  if (!result.ok) return { ...prev, error: t("auth.error.invalidCode") };

  const h = await headers();
  const { token, expiresAt } = await createSession(result.userId, {
    userAgent: h.get("user-agent"),
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  await setSessionCookie(token, expiresAt);

  if (purpose === "admin_login") redirect("/admin/dashboard");
  const session = await sessionFromToken(token);
  redirect(safeNext(formData.get("next")) ?? (session ? homeFor(session.access) : "/buyer/dashboard"));
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionToken();
  if (token) await destroySession(token);
  await clearSessionCookie();
  redirect("/login");
}
