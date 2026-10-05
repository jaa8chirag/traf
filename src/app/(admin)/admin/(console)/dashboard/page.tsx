import type { Metadata } from "next";
import { Card, EmptyState, Stat } from "@/components/ui";
import { requireStaff } from "@/modules/identity";
import { getDashboardCounts } from "@/modules/admin";

export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false, follow: false } };

export default async function AdminDashboard({ searchParams }: PageProps<"/admin/dashboard">) {
  await requireStaff();
  const sp = await searchParams;
  const counts = await getDashboardCounts();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {sp.denied && (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
          You do not have permission to open that page.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Members" value={counts.users} />
        <Stat label="Companies" value={counts.companies} />
        <Stat label="Awaiting verification" value={counts.awaitingVerification} />
      </div>
      <Card>
        <EmptyState title="Moderation queues appear here">Verification, product, RFQ and dispute queues arrive in later checkpoints.</EmptyState>
      </Card>
    </div>
  );
}
