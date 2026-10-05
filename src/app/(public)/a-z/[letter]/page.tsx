import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { LETTERS, listCategoriesByLetter, listSuppliers, normalizeLetter } from "@/modules/catalog";

export const revalidate = 600;

export function generateStaticParams() {
  return ["0-9", ...LETTERS].map((letter) => ({ letter }));
}

export async function generateMetadata({ params }: PageProps<"/a-z/[letter]">): Promise<Metadata> {
  const letter = normalizeLetter(decodeURIComponent((await params).letter));
  if (!letter) return { title: "Not found", robots: { index: false } };
  return {
    title: `Categories and suppliers starting with ${letter}`,
    description: `Browse product categories and verified suppliers beginning with ${letter}.`,
    alternates: { canonical: `/a-z/${letter}` },
  };
}

export default async function AzLetterPage({ params }: PageProps<"/a-z/[letter]">) {
  const letter = normalizeLetter(decodeURIComponent((await params).letter));
  if (!letter) notFound();
  const [categories, suppliers] = await Promise.all([listCategoriesByLetter(letter), listSuppliers({ letter, pageSize: 60 })]);
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "A–Z index", path: "/a-z" }, { name: letter, path: `/a-z/${letter}` }]} />
      <h1 className="text-3xl font-semibold">{letter}</h1>
      <section aria-labelledby="az-cats" className="space-y-2">
        <h2 id="az-cats" className="text-xl font-semibold">Categories</h2>
        {categories.length === 0 ? <p className="text-muted">None.</p> : (
          <ul className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => <li key={c.path}><Link href={`/c/${c.path}`} className="hover:underline">{c.name}</Link></li>)}
          </ul>
        )}
      </section>
      <section aria-labelledby="az-sup" className="space-y-2">
        <h2 id="az-sup" className="text-xl font-semibold">Suppliers</h2>
        {suppliers.items.length === 0 ? <p className="text-muted">None.</p> : (
          <ul className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.items.map((s) => <li key={s.id}><Link href={`/s/${s.slug}`} className="hover:underline">{s.name}</Link></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
