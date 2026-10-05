import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { emit } from "@/lib/events/outbox";
import { notifier } from "@/lib/providers/notifier";
import type { Access, CompanyAccess } from "./rbac";
import { isDemoEmail, isDemoLogin, type DemoConfig } from "./demo";
import type { Intent, OtpPurpose } from "./schemas";

const OTP_REQUESTS_PER_WINDOW = 5;

const demoConfig = (): DemoConfig => ({ code: env().DEMO_LOGIN_CODE, emails: env().DEMO_LOGIN_EMAILS });

const hashCode = (identifier: string, code: string): string =>
  createHmac("sha256", env().AUTH_SECRET).update(`${identifier}:${code}`).digest("hex");

export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

export type RequestOtpResult = { ok: true } | { ok: false; reason: "rate_limited" };

/**
 * Issue a one-time code. Always reports success for unknown/non-staff admin emails
 * (no account enumeration) but only actually sends when the request is legitimate.
 */
export async function requestOtp(email: string, purpose: OtpPurpose): Promise<RequestOtpResult> {
  // Demo accounts use the fixed demo code: nothing to send or store.
  if (isDemoEmail(demoConfig(), email)) return { ok: true };

  const windowStart = new Date(Date.now() - env().OTP_TTL_MINUTES * 60_000);
  const recent = await prisma.otpCode.count({
    where: { identifier: email, createdAt: { gte: windowStart } },
  });
  if (recent >= OTP_REQUESTS_PER_WINDOW) return { ok: false, reason: "rate_limited" };

  if (purpose === "admin_login") {
    const staff = await prisma.staffMember.findFirst({
      where: { active: true, user: { email, status: "ACTIVE" } },
      select: { id: true },
    });
    if (!staff) return { ok: true };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.create({
    data: {
      identifier: email,
      purpose,
      codeHash: hashCode(email, code),
      expiresAt: new Date(Date.now() + env().OTP_TTL_MINUTES * 60_000),
    },
  });
  await notifier().send({
    channel: "email",
    to: email,
    subject: "Your Tarf sign-in code",
    text: `Your Tarf code is ${code}. It expires in ${env().OTP_TTL_MINUTES} minutes. If you did not request it, ignore this email.`,
    locale: "en",
  });
  return { ok: true };
}

export type VerifyOtpResult =
  | { ok: true; userId: string; isNewUser: boolean }
  | { ok: false; reason: "invalid" };

export async function verifyOtp(
  email: string,
  code: string,
  purpose: OtpPurpose,
  intent: Intent,
): Promise<VerifyOtpResult> {
  if (isDemoLogin(demoConfig(), email, code)) return completeLogin(email, purpose, intent);

  const otp = await prisma.otpCode.findFirst({
    where: { identifier: email, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= env().OTP_MAX_ATTEMPTS) return { ok: false, reason: "invalid" };

  if (!safeEqual(otp.codeHash, hashCode(email, code))) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: "invalid" };
  }

  // Single-use: only one concurrent verifier can flip consumedAt.
  const claimed = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false, reason: "invalid" };

  return completeLogin(email, purpose, intent);
}

async function completeLogin(email: string, purpose: OtpPurpose, intent: Intent): Promise<VerifyOtpResult> {
  if (purpose === "admin_login") {
    const user = await prisma.user.findUnique({ where: { email }, include: { staff: true } });
    if (!user || user.status !== "ACTIVE" || !user.staff?.active) return { ok: false, reason: "invalid" };
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { ok: true, userId: user.id, isNewUser: false };
  }
  return findOrCreateUser(email, intent, true);
}

/** Shared by OTP and Google sign-in. Applies the buyer/supplier intent on first use. */
export async function findOrCreateUser(
  email: string,
  intent: Intent,
  emailVerified: boolean,
  profile?: { name?: string | null; image?: string | null },
): Promise<VerifyOtpResult> {
  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email } });
    const isNewUser = !user;
    if (user && user.status !== "ACTIVE") return { ok: false as const, reason: "invalid" as const };
    if (!user) {
      user = await tx.user.create({
        data: {
          email,
          name: profile?.name ?? null,
          image: profile?.image ?? null,
          emailVerified: emailVerified ? new Date() : null,
        },
      });
      await emit(tx, "user.registered", user.id, { intent });
    }
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    if (intent === "supplier") {
      const membership = await tx.subAccount.findFirst({ where: { userId: user.id } });
      if (!membership) {
        const role = await tx.role.findUniqueOrThrow({ where: { key: "supplier_owner" } });
        const company = await tx.company.create({
          data: {
            ownerId: user.id,
            slug: `co-${randomBytes(4).toString("hex")}`,
            name: "My company",
            supplierProfile: { create: {} },
          },
        });
        await tx.subAccount.create({
          data: { companyId: company.id, userId: user.id, roleId: role.id, status: "ACTIVE" },
        });
      }
    } else {
      await tx.buyerProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    }
    return { ok: true as const, userId: user.id, isNewUser };
  });
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env().SESSION_TTL_DAYS * 86_400_000);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: meta.userAgent, ip: meta.ip },
  });
  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export interface CurrentSession {
  user: SessionUser;
  access: Access;
}

export async function sessionFromToken(token: string): Promise<CurrentSession | null> {
  const row = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          buyerProfile: { select: { id: true } },
          staff: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
          subAccounts: {
            where: { status: "ACTIVE" },
            include: {
              company: { select: { id: true, slug: true, name: true } },
              role: { include: { permissions: { include: { permission: true } } } },
            },
          },
        },
      },
    },
  });
  if (!row || row.expiresAt <= new Date() || row.user.status !== "ACTIVE") return null;

  const { user } = row;
  const companies: CompanyAccess[] = user.subAccounts.map((s) => ({
    companyId: s.company.id,
    companySlug: s.company.slug,
    companyName: s.company.name,
    roleKey: s.role.key,
    permissions: new Set(s.role.permissions.map((p) => p.permission.key)),
  }));
  return {
    user: { id: user.id, email: user.email, name: user.name },
    access: {
      isBuyer: user.buyerProfile !== null,
      companies,
      staff: user.staff?.active
        ? {
            roleKey: user.staff.role.key,
            permissions: new Set(user.staff.role.permissions.map((p) => p.permission.key)),
          }
        : null,
    },
  };
}
