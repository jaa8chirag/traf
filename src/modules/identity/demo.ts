// OPT-IN demo sign-in for showing the product to a client without email infrastructure.
// Disabled unless DEMO_LOGIN_CODE is set. When enabled, ONLY the listed emails accept that fixed code.
// Never enable on a site that holds real customer data; remove the env vars after the demo.
import { timingSafeEqual } from "node:crypto";

export interface DemoConfig {
  code?: string;
  /** Comma-separated emails; defaults to the three seeded demo accounts. */
  emails?: string;
}

const DEFAULT_EMAILS = ["buyer@demo.tarf.test", "sunrise@demo.tarf.test", "admin@tarf.test"];

export function demoEmails(cfg: DemoConfig): string[] {
  if (!cfg.code) return [];
  const list = cfg.emails?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list?.length ? list : DEFAULT_EMAILS;
}

export const isDemoEmail = (cfg: DemoConfig, email: string): boolean => demoEmails(cfg).includes(email.toLowerCase());

export function isDemoLogin(cfg: DemoConfig, email: string, code: string): boolean {
  if (!cfg.code || cfg.code.length < 6 || !isDemoEmail(cfg, email)) return false;
  const a = Buffer.from(cfg.code);
  const b = Buffer.from(code);
  return a.length === b.length && timingSafeEqual(a, b);
}
