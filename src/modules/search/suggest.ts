import "server-only";
import { prisma } from "@/lib/db";
import { searchProvider, type SearchQuery } from "@/lib/providers/search";

export interface Suggestions {
  products: Array<{ title: string; slug: string }>;
  suppliers: Array<{ name: string; slug: string }>;
  categories: Array<{ name: string; path: string }>;
}

/** Typeahead: a few products/suppliers from the engine plus matching category names from Postgres. */
export async function suggest(raw: string): Promise<Suggestions> {
  const q = raw.trim().slice(0, 60);
  const none: Suggestions = { products: [], suppliers: [], categories: [] };
  if (q.length < 2) return none;
  const base: Omit<SearchQuery, "pageSize"> = { q, filter: [], facets: [], sort: [], page: 1 };
  try {
    const [products, suppliers, categories] = await Promise.all([
      searchProvider().query("products", { ...base, pageSize: 5 }),
      searchProvider().query("suppliers", { ...base, pageSize: 3 }),
      prisma.category.findMany({ where: { isActive: true, name: { contains: q, mode: "insensitive" } }, orderBy: [{ level: "asc" }, { name: "asc" }], take: 4, select: { name: true, path: true } }),
    ]);
    return {
      products: products.hits.map((h) => ({ title: String(h.title), slug: String(h.slug) })),
      suppliers: suppliers.hits.map((h) => ({ name: String(h.name), slug: String(h.slug) })),
      categories,
    };
  } catch {
    return none;
  }
}
