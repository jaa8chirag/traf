import type { Metadata } from "next";
import { SearchView } from "@/components/search/SearchView";
import { parseSearchParams, runSearch } from "@/modules/search";

// Search results are never indexed; indexable listings live on category pages.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = parseSearchParams(await searchParams);
  const outcome = await runSearch(params);
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">{params.q ? `Results for “${params.q}”` : "Search products and suppliers"}</h1>
      <SearchView outcome={outcome} params={params} basePath="/search" />
    </div>
  );
}
