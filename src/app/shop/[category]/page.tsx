import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { categories, products } from "@/data/catalog";
import { collections } from "@/data/extra";
import { PageHero } from "@/components/PageHero";
import { ShopBrowser } from "@/components/ShopBrowser";
import { FAQ } from "@/components/FAQ";

export const dynamicParams = false;
export const generateStaticParams = () => categories.filter((c) => c.live).map((c) => ({ category: c.slug }));

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const c = categories.find((x) => x.slug === category);
  return { title: c ? `${c.name} — Tarf` : "Shop — Tarf" };
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category && c.live);
  if (!cat) notFound();
  const list = products.filter((p) => p.category === cat.name);

  return (
    <>
      <PageHero
        eyebrow="Category"
        title={cat.name}
        lede={`${cat.blurb}. Everything here is selected for how well it works day to day.`}
        crumbs={[{ label: "Shop", href: "/shop" }, { label: cat.name }]}
        bg="bg-sage"
      >
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className="h-10 px-4 inline-flex items-center rounded-full bg-white/80 text-sm font-medium hover:bg-white">{c.name}</Link>
          ))}
        </div>
      </PageHero>
      <ShopBrowser products={list} />
      <FAQ />
    </>
  );
}
