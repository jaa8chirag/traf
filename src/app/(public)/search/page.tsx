import type { Metadata } from "next";
import { ProductCard, SupplierCard } from "@/components/public/Cards";
import { EmptyState, Pagination } from "@/components/ui";
import { listProducts, listSuppliers } from "@/modules/catalog";

// Interim Postgres-backed search. CP-4 replaces it with the Meilisearch index, facets and tabs.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

const one = (v: string | string[] | undefined): string => (typeof v === "string" ? v : "");

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const tab = one(sp.tab) === "suppliers" ? "suppliers" : "products";
  const page = Math.max(1, Math.floor(Number(one(sp.page))) || 1);

  const [products, suppliers] = q
    ? await Promise.all([listProducts({ q, page: tab === "products" ? page : 1 }), listSuppliers({ q, page: tab === "suppliers" ? page : 1 })])
    : [null, null];
  const href = (t: string, n = 1) => `/search?q=${encodeURIComponent(q)}${t === "suppliers" ? "&tab=suppliers" : ""}${n > 1 ? `&page=${n}` : ""}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">{q ? `Results for “${q}”` : "Search"}</h1>
      {!q ? (
        <EmptyState title="Type something to search">Search products by name, or find a supplier.</EmptyState>
      ) : (
        <>
          <nav aria-label="Result type" className="flex gap-2 text-sm">
            <a href={href("products")} aria-current={tab === "products"} className={`rounded-full px-4 py-1.5 ${tab === "products" ? "bg-ink text-paper" : "border border-line"}`}>Products ({products?.total})</a>
            <a href={href("suppliers")} aria-current={tab === "suppliers"} className={`rounded-full px-4 py-1.5 ${tab === "suppliers" ? "bg-ink text-paper" : "border border-line"}`}>Suppliers ({suppliers?.total})</a>
          </nav>
          <h2 className="sr-only">Results</h2>
          {tab === "products" ? (
            products && products.items.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
            ) : (
              <EmptyState title="No products found">Try a different keyword.</EmptyState>
            )
          ) : suppliers && suppliers.items.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{suppliers.items.map((s) => <SupplierCard key={s.id} s={s} />)}</div>
          ) : (
            <EmptyState title="No suppliers found" />
          )}
          <Pagination page={(tab === "products" ? products : suppliers)?.page ?? 1} pageCount={(tab === "products" ? products : suppliers)?.pageCount ?? 1} hrefFor={(n) => href(tab, n)} />
        </>
      )}
    </div>
  );
}
