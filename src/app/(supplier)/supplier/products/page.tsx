import type { Metadata } from "next";
import Link from "next/link";
import { deleteProductAction } from "@/app/(supplier)/supplier/actions";
import { Badge, Button, ButtonLink, EmptyState, Pagination, Table, Td, Th } from "@/components/ui";
import { listCompanyProducts } from "@/modules/catalog";
import { requireSupplier } from "@/modules/identity";

export const metadata: Metadata = { title: "Products", robots: { index: false } };

const tone = { DRAFT: "neutral", PENDING_REVIEW: "info", LIVE: "success", REJECTED: "danger", UNLISTED: "warning" } as const;

export default async function ProductsPage({ searchParams }: PageProps<"/supplier/products">) {
  const { session, company } = await requireSupplier();
  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const data = await listCompanyProducts(session, company.companyId, page);
  if (!data) return null;
  const saved = typeof sp.saved === "string" ? sp.saved : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex gap-2">
          <ButtonLink href="/supplier/products/import" variant="secondary">Bulk upload (CSV)</ButtonLink>
          <ButtonLink href="/supplier/products/new">Add product</ButtonLink>
        </div>
      </div>
      {saved && (
        <p role="status" className="rounded-xl bg-success-bg px-4 py-3 text-sm text-success">
          {saved === "PENDING_REVIEW" ? "Submitted for review." : "Draft saved."}
        </p>
      )}
      {data.items.length === 0 ? (
        <EmptyState title="No products yet">Add your first product, or upload many at once with a CSV.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr><Th>Product</Th><Th>Category</Th><Th>MOQ</Th><Th>Price</Th><Th>Status</Th><Th><span className="sr-only">Actions</span></Th></tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/supplier/products/${p.id}`} className="font-medium underline">{p.title}</Link>
                  {p.status === "REJECTED" && p.moderationNote && <p className="text-xs text-danger">{p.moderationNote}</p>}
                </Td>
                <Td>{p.category.name}</Td>
                <Td>{p.moq} {p.moqUnit}</Td>
                <Td>{p.priceMin ? `${p.currency} ${p.priceMin.toString()}${p.priceMax && !p.priceMax.equals(p.priceMin) ? `–${p.priceMax.toString()}` : ""}` : "—"}</Td>
                <Td><Badge tone={tone[p.status]}>{p.status.replace("_", " ").toLowerCase()}</Badge></Td>
                <Td>
                  {(p.status === "DRAFT" || p.status === "REJECTED") && (
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm">Delete</Button>
                    </form>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageCount={data.pageCount} hrefFor={(n) => `/supplier/products?page=${n}`} />
    </div>
  );
}
