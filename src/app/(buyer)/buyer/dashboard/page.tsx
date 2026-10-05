import type { Metadata } from "next";
import { Card, EmptyState, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "Buyer dashboard", robots: { index: false } };

export default function BuyerDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Unread messages" value={0} />
        <Stat label="Open sourcing requests" value={0} />
        <Stat label="Active orders" value={0} />
        <Stat label="Sample requests" value={0} />
      </div>
      <Card>
        <EmptyState title="Your activity will appear here">Inquiries, quotes and orders arrive in the next checkpoints.</EmptyState>
      </Card>
    </div>
  );
}
