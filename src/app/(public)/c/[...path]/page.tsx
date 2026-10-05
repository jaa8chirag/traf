import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { ProductCard } from "@/components/public/Cards";
import { JsonLd } from "@/components/seo/JsonLd";
import { EmptyState, Pagination } from "@/components/ui";
import { absoluteUrl } from "@/lib/seo";
import { getCategoryPage, listProducts, type ProductSort } from "@/modules/catalog";

export const revalidate = 300;

const pageParam = (v: string | string[] | undefined): number => Math.max(1, Math.floor(Number(typeof v === "string" ? v : 1)) || 1);
const sortParam = (v: string | string[] | undefined): ProductSort => (v === "newest" ? "newest" : "recommended");
const pathOf = (segments: string[]): string => segments.map(decodeURIComponent).join("/");
const hrefFor = (path: string, page: number, sort: ProductSort): string => {
  const q = new URLSearchParams();
  if (page > 1) q.set("page", String(page));
  if (sort !== "recommended") q.set("sort", sort);
  const s = q.toString();
  return `/c/${path}${s ? `?${s}` : ""}`;
};

export async function generateMetadata({ params, searchParams }: PageProps<"/c/[...path]">): Promise<Metadata> {
  const path = pathOf((await params).path);
  const sp = await searchParams;
  const cat = await getCategoryPage(path);
  if (!cat) return { title: "Category not found", robots: { index: false } };
  const page = pageParam(sp.page);
  const { total } = await listProducts({ categoryPath: path, pageSize: 1 });
  return {
    title: `${cat.seoTitle ?? cat.name}${page > 1 ? ` - Page ${page}` : ""}`,
    description: cat.seoDesc ?? `Find ${cat.name} from verified manufacturers and suppliers. Compare prices and MOQ, then send an inquiry.`,
    // Sorted variants point at the default sort; empty categories stay out of the index.
    alternates: { canonical: hrefFor(path, page, "recommended") },
    robots: total === 0 && cat.children.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/c/[...path]">) {
  const path = pathOf((await params).path);
  const sp = await searchParams;
  const cat = await getCategoryPage(path);
  if (!cat) notFound();
  const page = pageParam(sp.page);
  const sort = sortParam(sp.sort);
  const result = await listProducts({ categoryPath: path, page, sort });

  // Rebuild crumb paths from the stored slug path (chain order = path order).
  const segs = cat.path.split("/");
  const crumbItems = [
    { name: "Home", path: "/" },
    { name: "Categories", path: "/categories" },
    ...cat.chain.map((c, i) => ({ name: c.name, path: `/c/${segs.slice(0, i + 1).join("/")}` })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <Breadcrumbs items={crumbItems} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: cat.name,
          itemListElement: result.items.map((p, i) => ({ "@type": "ListItem", position: (page - 1) * 24 + i + 1, url: absoluteUrl(`/p/${p.slug}`), name: p.title })),
        }}
      />
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">{cat.name}</h1>
        <p className="text-sm text-muted">{result.total} product{result.total === 1 ? "" : "s"} from verified suppliers</p>
      </header>

      {cat.children.length > 0 && (
        <nav aria-label="Sub-categories">
          <ul className="flex flex-wrap gap-2">
            {cat.children.map((c) => (
              <li key={c.id}><Link href={`/c/${c.path}`} className="inline-block rounded-full border border-line bg-white px-4 py-1.5 text-sm hover:border-ink">{c.name}</Link></li>
            ))}
          </ul>
        </nav>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Sort by</span>
        <span className="flex gap-1" role="group" aria-label="Sort">
          {(["recommended", "newest"] as const).map((s) => (
            <Link key={s} href={hrefFor(path, 1, s)} aria-current={sort === s} className={`rounded-full px-3 py-1 ${sort === s ? "bg-ink text-paper" : "hover:bg-paper-2"}`}>
              {s === "recommended" ? "Recommended" : "Newest"}
            </Link>
          ))}
        </span>
      </div>

      <h2 className="sr-only">Products</h2>
      {result.items.length === 0 ? (
        <EmptyState title="No products in this category yet">Try a sub-category, or browse <Link href="/categories" className="underline">all categories</Link>.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {result.items.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
        </div>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => hrefFor(path, n, sort)} />
    </div>
  );
}
