import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { SupplierCard } from "@/components/public/Cards";
import { EmptyState, Pagination } from "@/components/ui";
import { listSuppliers } from "@/modules/catalog";

export const revalidate = 300;

const pageParam = (v: string | string[] | undefined): number => Math.max(1, Math.floor(Number(typeof v === "string" ? v : 1)) || 1);

export async function generateMetadata({ searchParams }: PageProps<"/suppliers">): Promise<Metadata> {
  const page = pageParam((await searchParams).page);
  return {
    title: `Verified suppliers & manufacturers${page > 1 ? ` - Page ${page}` : ""}`,
    description: "Browse verified manufacturers and trading companies. Compare audited, Gold and Diamond members.",
    alternates: { canonical: page > 1 ? `/suppliers?page=${page}` : "/suppliers" },
  };
}

export default async function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  const page = pageParam((await searchParams).page);
  const result = await listSuppliers({ page });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Suppliers", path: "/suppliers" }]} />
      <h1 className="text-3xl font-semibold">Verified suppliers</h1>
      <h2 className="sr-only">Supplier list</h2>
      {result.items.length === 0 ? (
        <EmptyState title="No suppliers yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{result.items.map((s) => <SupplierCard key={s.id} s={s} />)}</div>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => `/suppliers${n > 1 ? `?page=${n}` : ""}`} />
    </div>
  );
}
