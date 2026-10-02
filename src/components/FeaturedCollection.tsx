import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { inr, products } from "@/data/catalog";
import { ProductVisual } from "./ProductVisual";
import { Reveal } from "./Reveal";


export function FeaturedCollection() {
  const set = products.filter((p) => ["aero-laptop-stand", "tidy-cable-box", "halo-desk-lamp"].includes(p.slug));
  const bundle = set.reduce((s, p) => s + p.price, 0);

  return (
    <section className="container-x py-20 lg:py-28" aria-labelledby="coll-h">
      <div className="grid lg:grid-cols-2 rounded-[36px] overflow-hidden bg-sage">
        <Reveal className="relative min-h-[360px] lg:min-h-[600px]">
          <ProductVisual kind="stand" tone="sage" className="absolute inset-0 w-full h-full scale-125 origin-center" />
          <div className="absolute left-5 bottom-5 right-5 flex gap-3">
            {set.map((p) => (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className="flex-1 min-w-0 bg-white/90 backdrop-blur rounded-2xl p-2 flex items-center gap-2 hover:bg-white transition-colors"
              >
                <ProductVisual kind={p.kind} tone={p.tone} className="w-10 h-10 rounded-lg shrink-0" />
                <span className="text-xs font-medium truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        </Reveal>

        <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-ink">Featured collection</p>
          <h2 id="coll-h" className="font-display mt-3 text-4xl sm:text-5xl lg:text-6xl leading-[1.02] font-medium">
            The desk that <em className="text-accent-ink">doesn&apos;t hurt.</em>
          </h2>
          <p className="mt-5 text-lg text-ink/70 max-w-md leading-relaxed">
            Long days at a laptop shouldn&apos;t cost you your neck. Raise the screen, clear the cables, and light it
            properly — three pieces that work together.
          </p>
          <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
            {set.map((p) => (
              <li key={p.slug} className="flex items-center justify-between py-3.5">
                <span className="font-medium">{p.name}</span>
                <span className="text-ink/70">{inr(p.price)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between py-3.5 font-semibold">
              <span>Complete set</span>
              <span>{inr(bundle)}</span>
            </li>
          </ul>
          <div className="mt-8">
            <Link
              href="/collections/workspace"
              className="group inline-flex items-center gap-2 h-14 pl-7 pr-3 rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors"
            >
              Shop collection
              <span className="grid place-items-center w-9 h-9 rounded-full bg-paper text-ink">
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
