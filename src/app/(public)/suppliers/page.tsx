import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { SearchView } from "@/components/search/SearchView";
import { buildQuery, canonicalParams, isIndexable, parseSearchParams, runSearch } from "@/modules/search";

const FORCED = { tab: "suppliers" } as const;
const OMIT = ["tab", "cat"] as const;

export async function generateMetadata({ searchParams }: PageProps<"/suppliers">): Promise<Metadata> {
  const params = parseSearchParams(await searchParams, FORCED);
  const canon = buildQuery(canonicalParams({ ...params, cat: null }), OMIT);
  return {
    title: `Verified suppliers & manufacturers${params.page > 1 ? ` - Page ${params.page}` : ""}`,
    description: "Browse verified manufacturers and trading companies. Compare audited, Gold and Diamond members.",
    alternates: { canonical: `/suppliers${canon ? `?${canon}` : ""}` },
    robots: isIndexable(params) ? undefined : { index: false, follow: true },
  };
}

export default async function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  const params = parseSearchParams(await searchParams, FORCED);
  const outcome = await runSearch(params);
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Suppliers", path: "/suppliers" }]} />
      <h1 className="text-3xl font-semibold">Verified suppliers</h1>
      <SearchView outcome={outcome} params={params} basePath="/suppliers" omit={OMIT} tabs={["suppliers"]} />
    </div>
  );
}
