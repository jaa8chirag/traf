import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/modules/identity";
import { listPendingCompanies } from "@/modules/supplier";

export const metadata: Metadata = { title: "Supplier verification", robots: { index: false, follow: false } };

export default async function SuppliersQueue({ searchParams }: PageProps<"/admin/suppliers">) {
  const session = await requireStaff("supplier.verify");
  const sp = await searchParams;
  const rows = (await listPendingCompanies(session)) ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Supplier verification</h1>
      {typeof sp.done === "string" && <p role="status" className="rounded-xl bg-success-bg px-4 py-3 text-sm text-success">Supplier {sp.done}.</p>}
      {rows.length === 0 ? (
        <EmptyState title="Queue is empty">No suppliers are waiting for verification.</EmptyState>
      ) : (
        <Table>
          <thead><tr><Th>Company</Th><Th>Owner</Th><Th>Location</Th><Th>Submitted</Th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <Td><Link href={`/admin/suppliers/${c.id}`} className="font-medium underline">{c.name}</Link></Td>
                <Td>{c.owner.email}</Td>
                <Td>{[c.city, c.province, c.country].filter(Boolean).join(", ")}</Td>
                <Td>{c.updatedAt.toLocaleDateString("en-IN")}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
