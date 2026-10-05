import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { can, type CompanyAccess } from "./rbac";
import type { CurrentSession } from "./service";

export async function requireUser(next: string): Promise<CurrentSession> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

export async function requireBuyer(): Promise<CurrentSession> {
  const session = await requireUser("/buyer/dashboard");
  if (!session.access.isBuyer) redirect("/register?as=buyer");
  return session;
}

export async function requireSupplier(): Promise<{ session: CurrentSession; company: CompanyAccess }> {
  const session = await requireUser("/supplier/dashboard");
  const company = session.access.companies[0];
  if (!company) redirect("/register?as=supplier");
  return { session, company };
}

/** Staff gate for /admin. Unauthenticated or non-staff users go to the admin login. */
export async function requireStaff(permission?: string): Promise<CurrentSession> {
  const session = await getSession();
  if (!session?.access.staff) redirect("/admin/login");
  if (permission && !can(session.access, permission)) redirect("/admin/dashboard?denied=1");
  return session;
}
