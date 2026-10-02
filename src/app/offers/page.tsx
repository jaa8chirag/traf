import type { Metadata } from "next";
import { ArrowRight, Tag, Ticket } from "lucide-react";
import { products, getProduct, inr, type Product } from "@/data/catalog";
import { bundles } from "@/data/extra";
import { PageHero, Button } from "@/components/PageHero";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = { title: "Offers & bundles — Tarf" };

export default function OffersPage() {
  const onSale = products.filter((p) => p.compareAt);
  return (
    <>
      <PageHero eyebrow="Offers" title={<>Better value, <em className="text-accent">no noise.</em></>} lede="Honest savings on products we'd recommend anyway: bundles that work together and a few well-priced picks." crumbs={[{ label: "Offers" }]} bg="bg-blush">
        <Button href="#bundles">Shop bundles <ArrowRight size={18} /></Button>
      </PageHero>

      <section id="bundles" className="container-x py-16 lg:py-24 scroll-mt-20">
        <h2 className="font-display text-4xl sm:text-5xl">Bundles</h2>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {bundles.map((b, i) => {
            const items = b.products.map(getProduct).filter((p): p is Product => !!p);
            const total = items.reduce((s, p) => s + p.price, 0);
            return (
              <Reveal key={b.slug} delay={i * 0.1}>
                <div className="rounded-[32px] border border-line bg-white overflow-hidden h-full flex flex-col">
                  <div className="grid grid-cols-3">
                    {items.slice(0, 3).map((p) => <ProductVisual key={p.slug} kind={p.kind} tone={p.tone} className="aspect-square w-full" />)}
                  </div>
                  <div className="p-7 flex-1 flex flex-col">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-ink"><Tag size={14} /> Bundle · Save {inr(b.saving)}</span>
                    <h3 className="font-display text-3xl mt-2">{b.name}</h3>
                    <p className="text-muted mt-2">{items.map((p) => p.name).join(" + ")}</p>
                    <div className="mt-auto pt-6 flex items-end justify-between">
                      <p><span className="text-muted line-through mr-2">{inr(total)}</span><span className="text-2xl font-semibold">{inr(total - b.saving)}</span></p>
                      <Button href={`/collections/${b.collection}`} variant="dark">View set</Button>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="bg-paper-2 py-16 lg:py-24">
        <div className="container-x">
          <h2 className="font-display text-4xl sm:text-5xl">Active offers</h2>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-10">
            {onSale.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24 grid lg:grid-cols-2 gap-10">
        <div>
          <span className="grid place-items-center w-12 h-12 rounded-2xl bg-sage"><Ticket size={22} /></span>
          <h2 className="font-display text-4xl mt-5">Using a coupon</h2>
          <ol className="mt-6 space-y-4 text-lg text-ink/80">
            <li><b className="font-semibold">1.</b> Add products to your cart.</li>
            <li><b className="font-semibold">2.</b> Enter your code in the &ldquo;Promo code&rdquo; box.</li>
            <li><b className="font-semibold">3.</b> See the discount applied before you pay.</li>
          </ol>
        </div>
        <div className="rounded-[28px] border border-line p-7 self-start">
          <h3 className="font-display text-2xl">Terms</h3>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted">
            <li>One coupon per order; coupons can&apos;t be combined with bundle pricing.</li>
            <li>Offers can change or end without notice.</li>
            <li>Discounts apply to product value, not shipping.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
