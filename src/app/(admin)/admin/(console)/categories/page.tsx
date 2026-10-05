import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { getCategoryChain, listChildCategories } from "@/modules/catalog";
import { requireStaff } from "@/modules/identity";

export const metadata: Metadata = { title: "Categories", robots: { index: false, follow: false } };

export default async function CategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireStaff("category.manage");
  const sp = await searchParams;
  const parent = typeof sp.parent === "string" && /^[a-z0-9]{10,40}$/i.test(sp.parent) ? sp.parent : null;
  const [chain, children] = await Promise.all([parent ? getCategoryChain(parent) : [], listChildCategories(parent)]);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-1 text-sm text-muted">
        <Link href="/admin/categories" className="underline">All</Link>
        {chain.map((c) => (
          <span key={c.id}>› <Link href={`/admin/categories?parent=${c.id}`} className="underline">{c.name}</Link></span>
        ))}
      </nav>
      {parent && (
        <Link href={`/admin/categories/${parent}`} className="inline-block rounded-full border border-line bg-white px-4 py-2 text-sm hover:bg-paper-2">
          Edit attributes for “{chain[chain.length - 1]?.name}”
        </Link>
      )}
      {children.length === 0 ? (
        <EmptyState title="No sub-categories" />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {children.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              {c.isLeaf ? <span>{c.name}</span> : <Link href={`/admin/categories?parent=${c.id}`} className="font-medium underline">{c.name}</Link>}
              <Link href={`/admin/categories/${c.id}`} className="text-muted hover:text-ink">Attributes</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
