import type { Metadata } from "next";
import { Star } from "lucide-react";
import { reviews, products } from "@/data/catalog";
import { PageHero, Button } from "@/components/PageHero";

export const metadata: Metadata = { title: "Reviews — Tarf" };

export default function ReviewsPage() {
  const total = products.reduce((s, p) => s + p.reviews, 0);
  const avg = products.reduce((s, p) => s + p.rating * p.reviews, 0) / total;
  const list = [...reviews, ...reviews];

  return (
    <>
      <PageHero eyebrow="Reviews" title={<>What customers <em className="text-accent">say.</em></>} lede="Honest feedback from people using Tarf products every day. Sample reviews shown until live verified-purchase reviews are connected." crumbs={[{ label: "Reviews" }]} />
      <section className="container-x py-14 grid lg:grid-cols-[320px_1fr] gap-10">
        <aside className="self-start rounded-[28px] border border-line bg-white p-7 lg:sticky lg:top-24">
          <p className="font-display text-6xl">{avg.toFixed(1)}</p>
          <div className="flex gap-0.5 mt-2">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={18} className="fill-accent text-accent" />)}</div>
          <p className="text-sm text-muted mt-2">Sample ratings across {total} reviews</p>
        </aside>
        <div className="space-y-4">
          {list.map((r, i) => (
            <figure key={i} className="rounded-[24px] border border-line bg-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={15} className={k < r.rating ? "fill-accent text-accent" : "text-line"} />)}</div>
                <span className="text-xs font-medium bg-sage rounded-full px-2.5 py-1">Sample review</span>
              </div>
              <blockquote className="mt-4 text-lg leading-relaxed">“{r.text}”</blockquote>
              <figcaption className="mt-4 text-sm text-muted"><b className="text-ink">{r.name}</b> · {r.role} · {r.product}</figcaption>
            </figure>
          ))}
          <div className="pt-4"><Button href="/shop">Shop reviewed products</Button></div>
        </div>
      </section>
    </>
  );
}
