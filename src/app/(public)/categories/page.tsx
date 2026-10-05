import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { getMenuTree } from "@/modules/catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "All product categories",
  description: "Browse every product category on Tarf, from electronics and machinery to textiles and food.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const menu = await getMenuTree();
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Categories", path: "/categories" }]} />
      <h1 className="text-3xl font-semibold">All categories</h1>
      <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((c) => (
          <section key={c.id}>
            <h2 className="text-lg font-semibold"><Link href={`/c/${c.path}`} className="hover:underline">{c.name}</Link></h2>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {c.children.map((s) => <li key={s.id}><Link href={`/c/${s.path}`} className="hover:text-ink hover:underline">{s.name}</Link></li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
