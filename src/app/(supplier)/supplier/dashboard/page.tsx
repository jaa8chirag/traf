import type { Metadata } from "next";
import { Badge, Card, Stat } from "@/components/ui";
import { requireSupplier } from "@/modules/identity";

export const metadata: Metadata = { title: "Supplier dashboard", robots: { index: false } };

export default async function SupplierDashboard() {
  const { company } = await requireSupplier();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{company.companyName}</h1>
        <Badge tone="warning">Draft — not yet verified</Badge>
      </div>
      <Card>
        <p className="font-medium">Complete your company profile</p>
        <p className="mt-1 text-sm text-muted">
          Company info, licence upload and product listings arrive in CP-2. Your showroom address will be{" "}
          <span className="font-mono">/s/{company.companySlug}</span>.
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New inquiries" value={0} />
        <Stat label="Live products" value={0} />
        <Stat label="Open orders" value={0} />
        <Stat label="Matched sourcing requests" value={0} />
      </div>
    </div>
  );
}
