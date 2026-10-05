import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { SearchView } from "@/components/search/SearchView";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { getCategoryPage } from "@/modules/catalog";
import { PAGE_SIZE, buildQuery, canonicalParams, isIndexable, parseSearchParams, runSearch } from "@/modules/search";

const OMIT = ["cat"] as const;
const pathOf = (segments: string[]): string => segments.map(decodeURIComponent).join("/");

type Raw = Record<string, string | string[] | undefined>;

const rawKeyOf = (sp: Raw): string => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) u.append(k, x);
  return u.toString();
};

// generateMetadata and the page both need the same result; cache() dedupes it within one request.
const load = cache(async (path: string, rawKey: string) => {
  const u = new URLSearchParams(rawKey);
  const raw: Raw = {};
  for (const k of new Set(u.keys())) raw[k] = u.getAll(k).length > 1 ? u.getAll(k) : u.get(k)!;
  const params = parseSearchParams(raw, { cat: path });
  const [category, outcome] = await Promise.all([getCategoryPage(path), runSearch(params)]);
  return { params, category, outcome };
});

export async function generateMetadata({ params, searchParams }: PageProps<"/c/[...path]">): Promise<Metadata> {
  const path = pathOf((await params).path);
  const { params: sp, category, outcome } = await load(path, rawKeyOf(await searchParams));
  if (!category) return { title: "Category not found", robots: { index: false } };
  const canon = buildQuery(canonicalParams(sp), OMIT);
  const empty = outcome.total === 0 && category.children.length === 0;
  return {
    title: `${category.seoTitle ?? category.name}${sp.page > 1 ? ` - Page ${sp.page}` : ""}`,
    description: category.seoDesc ?? `Find ${category.name} from verified manufacturers and suppliers. Compare prices and MOQ, then send an inquiry.`,
    alternates: { canonical: `/c/${path}${canon ? `?${canon}` : ""}` },
    robots: empty || !isIndexable(sp) ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/c/[...path]">) {
  const path = pathOf((await params).path);
  const { params: sp, category, outcome } = await load(path, rawKeyOf(await searchParams));
  if (!category) notFound();

  const segs = category.path.split("/");
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Categories", path: "/categories" },
    ...category.chain.map((c, i) => ({ name: c.name, path: `/c/${segs.slice(0, i + 1).join("/")}` })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <Breadcrumbs items={crumbs} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: category.name,
          itemListElement: outcome.products.map((p, i) => ({ "@type": "ListItem", position: (sp.page - 1) * PAGE_SIZE + i + 1, url: absoluteUrl(`/p/${p.slug}`), name: p.title })),
        }}
      />
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">{category.name}</h1>
        <p className="text-sm text-muted">Compare products and suppliers in this category</p>
      </header>
      <SearchView outcome={outcome} params={sp} basePath={`/c/${path}`} omit={OMIT} />
    </div>
  );
}
