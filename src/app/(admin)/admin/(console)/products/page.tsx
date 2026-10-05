import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Table, Td, Th } from "@/components/ui";
import { listPendingProducts } from "@/modules/catalog";
import { requireStaff } from "@/modules/identity";

export const metadata: Metadata = { title: "Product moderation", robots: { index: false, follow: false } };

export default async function ProductQueue({ searchParams }: PageProps<"/admin/products">) {
  const session = await requireStaff("product.moderate");
  const sp = await searchParams;
  const rows = (await listPendingProducts(session)) ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Product moderation</h1>
      {typeof sp.done === "string" && <p role="status" className="rounded-xl bg-success-bg px-4 py-3 text-sm text-success">Product {sp.done}.</p>}
      {rows.length === 0 ? (
        <EmptyState title="Queue is empty">No products are waiting for review.</EmptyState>
      ) : (
        <Table>
          <thead><tr><Th>Product</Th><Th>Supplier</Th><Th>Category</Th><Th>Submitted</Th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <Td><Link href={`/admin/products/${p.id}`} className="font-medium underline">{p.title}</Link></Td>
                <Td>{p.company.name}</Td>
                <Td>{p.category.name}</Td>
                <Td>{p.updatedAt.toLocaleDateString("en-IN")}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
