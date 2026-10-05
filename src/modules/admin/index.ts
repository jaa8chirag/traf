import "server-only";
import { prisma } from "@/lib/db";

export interface DashboardCounts {
  users: number;
  companies: number;
  awaitingVerification: number;
}

/** Callers must have passed requireStaff() first. */
export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [users, companies, awaitingVerification] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.company.count({ where: { status: "PENDING_VERIFICATION" } }),
  ]);
  return { users, companies, awaitingVerification };
}
