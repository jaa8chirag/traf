// Integration test against the local dev Postgres (docker compose up -d postgres; db:migrate; db:seed).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const sent: Array<{ to: string; text: string }> = [];
vi.mock("@/lib/providers/notifier", () => ({
  notifier: () => ({
    send: async (m: { to: string; text: string }) => {
      sent.push(m);
      return { providerRef: "test" };
    },
  }),
}));

const { prisma } = await import("@/lib/db");
const svc = await import("./service");
const { can } = await import("./rbac");

const run = Date.now().toString(36);
const buyerEmail = `buyer-${run}@test.tarf`;
const supplierEmail = `supplier-${run}@test.tarf`;
const lastCode = (to: string): string => {
  const msg = [...sent].reverse().find((m) => m.to === to);
  const code = msg?.text.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error("no code sent");
  return code;
};

beforeAll(() => {
  process.env.AUTH_SECRET ??= "test-secret-test-secret";
});

afterAll(async () => {
  const emails = [buyerEmail, supplierEmail];
  await prisma.otpCode.deleteMany({ where: { identifier: { in: emails } } });
  await prisma.company.deleteMany({ where: { owner: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});

describe("email OTP auth", () => {
  it("rejects a wrong code and counts the attempt", async () => {
    await svc.requestOtp(buyerEmail, "login");
    const bad = lastCode(buyerEmail) === "000000" ? "111111" : "000000";
    expect(await svc.verifyOtp(buyerEmail, bad, "login", "buyer")).toEqual({ ok: false, reason: "invalid" });
  });

  it("creates a buyer on first valid code and the code is single-use", async () => {
    await svc.requestOtp(buyerEmail, "login");
    const code = lastCode(buyerEmail);
    const first = await svc.verifyOtp(buyerEmail, code, "login", "buyer");
    expect(first).toMatchObject({ ok: true, isNewUser: true });
    expect(await svc.verifyOtp(buyerEmail, code, "login", "buyer")).toEqual({ ok: false, reason: "invalid" });

    if (!first.ok) throw new Error("unreachable");
    const { token } = await svc.createSession(first.userId);
    const session = await svc.sessionFromToken(token);
    expect(session?.access.isBuyer).toBe(true);
    expect(session?.access.staff).toBeNull();
    expect(session && can(session.access, "supplier.verify")).toBe(false);
    await svc.destroySession(token);
    expect(await svc.sessionFromToken(token)).toBeNull();
  });

  it("supplier intent creates a DRAFT company with owner permissions", async () => {
    await svc.requestOtp(supplierEmail, "login");
    const res = await svc.verifyOtp(supplierEmail, lastCode(supplierEmail), "login", "supplier");
    if (!res.ok) throw new Error("expected ok");
    const { token } = await svc.createSession(res.userId);
    const session = await svc.sessionFromToken(token);
    const company = session?.access.companies[0];
    expect(company?.roleKey).toBe("supplier_owner");
    expect(session && company && can(session.access, "product.manage", { companyId: company.companyId })).toBe(true);
    const row = await prisma.company.findUnique({ where: { id: company?.companyId } });
    expect(row?.status).toBe("DRAFT");
  });

  it("locks the code after too many bad attempts", async () => {
    await svc.requestOtp(buyerEmail, "login");
    const good = lastCode(buyerEmail);
    const bad = good === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i++) await svc.verifyOtp(buyerEmail, bad, "login", "buyer");
    expect(await svc.verifyOtp(buyerEmail, good, "login", "buyer")).toEqual({ ok: false, reason: "invalid" });
  });

  it("admin login sends nothing and fails for non-staff accounts", async () => {
    const before = sent.length;
    expect(await svc.requestOtp(buyerEmail, "admin_login")).toEqual({ ok: true });
    expect(sent.length).toBe(before);
    expect(await svc.verifyOtp(buyerEmail, "123456", "admin_login", "buyer")).toEqual({ ok: false, reason: "invalid" });
  });

  it("admin login works for the seeded super-admin", async () => {
    const admin = process.env.SEED_ADMIN_EMAIL ?? "admin@tarf.test";
    await svc.requestOtp(admin, "admin_login");
    const res = await svc.verifyOtp(admin, lastCode(admin), "admin_login", "buyer");
    if (!res.ok) throw new Error("expected ok");
    const { token } = await svc.createSession(res.userId);
    const session = await svc.sessionFromToken(token);
    expect(session?.access.staff?.roleKey).toBe("super_admin");
    await svc.destroySession(token);
    await prisma.otpCode.deleteMany({ where: { identifier: admin } });
  });

  it("rate-limits OTP requests per identifier", async () => {
    const email = `rl-${run}@test.tarf`;
    for (let i = 0; i < 5; i++) expect(await svc.requestOtp(email, "login")).toEqual({ ok: true });
    expect(await svc.requestOtp(email, "login")).toEqual({ ok: false, reason: "rate_limited" });
    await prisma.otpCode.deleteMany({ where: { identifier: email } });
  });
});
