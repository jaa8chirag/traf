import type { Metadata } from "next";
import Link from "next/link";
import { categories, products } from "@/data/catalog";
import { PageHero } from "@/components/PageHero";
import { ShopBrowser } from "@/components/ShopBrowser";

export const metadata: Metadata = { title: "Shop all — Tarf" };

export default function ShopPage() {
  return (
    <>
      <PageHero eyebrow="Shop" title={<>Everything, <em className="text-accent">carefully</em> chosen.</>} lede="Browse the full Tarf catalogue. Filter by price and availability, or start from a category." crumbs={[{ label: "Shop" }]}>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            c.live ? (
              <Link key={c.slug} href={`/shop/${c.slug}`} className="h-10 px-4 inline-flex items-center rounded-full bg-white border border-line text-sm font-medium hover:border-ink transition-colors">{c.name}</Link>
            ) : (
              <span key={c.slug} className="h-10 px-4 inline-flex items-center gap-2 rounded-full border border-dashed border-ink/20 text-sm text-muted">{c.name} <span className="text-[11px]">· soon</span></span>
            )
          ))}
        </div>
      </PageHero>
      <ShopBrowser products={products} />
    </>
  );
}
