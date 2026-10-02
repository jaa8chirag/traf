import { Star } from "lucide-react";
import { reviews } from "@/data/catalog";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

export function Reviews() {
  return (
    <section className="bg-paper-2 py-20 lg:py-28" aria-labelledby="rev-h">
      <div className="container-x">
        <SectionHead id="rev-h" eyebrow="Proof" title="Real use, in their words." link={{ href: "/reviews", label: "Read all reviews" }} />
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <Reveal key={r.name} delay={i * 0.08}>
              <figure className="h-full bg-white rounded-[28px] p-7 flex flex-col border border-line hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} size={16} className={k < r.rating ? "fill-accent text-accent" : "text-line"} />
                  ))}
                </div>
                <blockquote className="font-display text-[22px] leading-snug mt-5 flex-1">“{r.text}”</blockquote>
                <figcaption className="mt-7 pt-5 border-t border-line flex items-center gap-3">
                  <span className="grid place-items-center w-10 h-10 rounded-full bg-sage font-semibold">{r.name[0]}</span>
                  <div className="text-sm leading-tight">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-muted">{r.role}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted text-right">Bought<br />{r.product}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
