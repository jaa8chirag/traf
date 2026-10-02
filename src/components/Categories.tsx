import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/data/catalog";
import { ProductVisual } from "./ProductVisual";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

export function Categories() {
  return (
    <section className="container-x py-20 lg:py-28" aria-labelledby="cat-h">
      <SectionHead id="cat-h" eyebrow="Shop by need" title="Start with the problem you're solving." link={{ href: "/shop", label: "All products" }} />
      <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {categories.map((c, i) => (
          <Reveal key={c.slug} delay={i * 0.07}>
            <Link
              href={c.live ? `/shop/${c.slug}` : "#notify"}
              className="group relative block rounded-[28px] overflow-hidden aspect-[3/4] bg-paper-2"
            >
              <ProductVisual
                kind={c.kind}
                tone={c.tone}
                className={`absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-110 ${c.live ? "" : "saturate-[.6]"}`}
              />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-black/55 via-black/20 to-transparent text-white pt-20">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl leading-tight">{c.name}</h3>
                    <p className="text-xs sm:text-sm text-white/80 mt-1 line-clamp-2">{c.blurb}</p>
                  </div>
                  <span className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-white text-ink group-hover:bg-accent group-hover:text-white transition-colors">
                    <ArrowUpRight size={18} />
                  </span>
                </div>
              </div>
              {!c.live && (
                <span className="absolute top-3 left-3 rounded-full bg-ink/80 text-paper text-[11px] font-medium px-2.5 py-1 backdrop-blur">
                  Coming soon
                </span>
              )}
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
