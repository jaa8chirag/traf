import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, inr, type Product } from "@/data/catalog";
import { collections, bundles } from "@/data/extra";
import { Breadcrumb, Button } from "@/components/PageHero";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { Reviews } from "@/components/Reviews";
import { ArrowRight } from "lucide-react";

export const dynamicParams = false;
export const generateStaticParams = () => collections.map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = collections.find((x) => x.slug === slug);
  return { title: c ? `${c.name} collection — Tarf` : "Collection — Tarf" };
}

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const col = collections.find((c) => c.slug === slug);
  if (!col) notFound();
  const items = col.products.map(getProduct).filter((p): p is Product => !!p);
  const bundle = bundles.find((b) => b.collection === col.slug);
  const bundleItems = bundle?.products.map(getProduct).filter((p): p is Product => !!p) ?? [];
  const bundleTotal = bundleItems.reduce((s, p) => s + p.price, 0);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="container-x grid lg:grid-cols-2 gap-8 items-center py-10 lg:py-16">
          <div>
            <Breadcrumb items={[{ label: "Collections" }, { label: col.name }]} />
            <div className="h-6" />
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-ink">Collection · {col.name}</p>
            <h1 className="font-display mt-3 text-5xl sm:text-6xl lg:text-7xl leading-[1] font-medium">{col.headline}</h1>
            <p className="mt-5 text-lg text-muted max-w-lg leading-relaxed">{col.problem}</p>
            <div className="mt-8"><Button href="#set">Shop collection <ArrowRight size={18} /></Button></div>
          </div>
          <div className="relative aspect-[5/4] rounded-[36px] overflow-hidden shadow-[0_40px_80px_-30px_rgba(16,21,18,.4)]">
            <ProductVisual kind={col.kind} tone={col.tone} className="w-full h-full scale-110" />
          </div>
        </div>
      </section>

      <section id="set" className="container-x py-16 lg:py-24 scroll-mt-20">
        <h2 className="font-display text-4xl sm:text-5xl">The set</h2>
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">
          {items.map((p) => <ProductCard key={p.slug} p={p} />)}
        </div>
      </section>

      {bundle && (
        <section className="container-x pb-16 lg:pb-24">
          <div className="rounded-[32px] bg-ink text-paper p-8 sm:p-12 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <p className="text-[13px] uppercase tracking-[0.14em] text-accent font-semibold">Bundle</p>
              <h3 className="font-display text-4xl mt-2">{bundle.name}</h3>
              <p className="text-paper/70 mt-3">{bundleItems.map((p) => p.name).join(" + ")}</p>
            </div>
            <div className="lg:text-right">
              <p className="text-paper/60 line-through">{inr(bundleTotal)}</p>
              <p className="font-display text-4xl">{inr(bundleTotal - bundle.saving)}</p>
              <p className="text-sm text-accent mt-1">Save {inr(bundle.saving)}</p>
            </div>
          </div>
        </section>
      )}
      <Reviews />
    </>
  );
}
