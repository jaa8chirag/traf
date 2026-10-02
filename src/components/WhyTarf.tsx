import Link from "next/link";
import { Compass, ShieldCheck, Gem, Headset, ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

const pillars = [
  { icon: Compass, title: "Curated, not crowded", text: "A focused catalogue built around real everyday problems. Fewer products, each with a reason to be here." },
  { icon: ShieldCheck, title: "Quality you can verify", text: "Clear specs, honest materials and what's in the box. We only publish claims we can stand behind." },
  { icon: Gem, title: "Value, not cheapness", text: "Fair pricing for products that last. No inflated discounts or marketplace noise." },
  { icon: Headset, title: "Help that answers", text: "Tracking, returns and support are easy to find and easy to use — before and after you buy." },
];

export function WhyTarf() {
  return (
    <section id="how-we-choose" className="bg-ink text-paper py-20 lg:py-28 relative overflow-hidden scroll-mt-16">
      <div
        aria-hidden
        className="absolute -left-40 top-20 w-[520px] h-[520px] rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(closest-side, #ff5a1f, transparent)" }}
      />
      <div className="container-x relative">
        <SectionHead light eyebrow="Why Tarf" title="Trust is the product we sell first." />
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-paper/10 rounded-[28px] overflow-hidden border border-paper/10">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="bg-ink p-7 lg:p-8 group hover:bg-ink-2 transition-colors">
              <span className="grid place-items-center w-12 h-12 rounded-2xl bg-paper/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                <p.icon size={22} />
              </span>
              <h3 className="font-display text-2xl mt-8">{p.title}</h3>
              <p className="mt-3 text-paper/65 leading-relaxed text-[15px]">{p.text}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10">
          <Link href="/why-my-ventures" className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-accent text-white font-medium hover:bg-paper hover:text-ink transition-colors">
            Shop with confidence
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
