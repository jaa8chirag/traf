import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHero, Button } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = { title: "About — Tarf" };

const beliefs = [
  ["Clarity over clutter", "We say what a product does, who it's for and what it costs. No hype, no hidden detail."],
  ["Value, not cheapness", "We look for products that are fairly priced and built to be used, not just cheap to ship."],
  ["Trust is earned", "We only claim what we can stand behind, and we make help easy to reach."],
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About Tarf" title={<>Better everyday things, <em className="text-accent">simply explained.</em></>} lede="Tarf finds practical, well-made consumer products from makers around the world and brings them to India, with the explanations and support you'd want before spending your money." crumbs={[{ label: "About" }]} bg="bg-sand" />

      <section className="container-x py-16 lg:py-24 grid lg:grid-cols-12 gap-10">
        <h2 className="font-display text-4xl sm:text-5xl lg:col-span-5">Why we started</h2>
        <div className="lg:col-span-7 space-y-5 text-lg text-ink/80 leading-relaxed">
          <p>Good everyday products exist, but they&apos;re scattered across marketplaces, buried under noise and hard to judge from a thumbnail.</p>
          <p>Tarf is our answer: a focused catalogue where every product has a clear purpose, honest information and real support behind it. Selling directly lets us build a relationship with you, not just a transaction.</p>
        </div>
      </section>

      <section className="bg-ink text-paper py-16 lg:py-24">
        <div className="container-x">
          <h2 className="font-display text-4xl sm:text-5xl">What we believe</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {beliefs.map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.08}>
                <div className="border-t border-paper/20 pt-6">
                  <p className="font-display text-accent text-5xl">0{i + 1}</p>
                  <h3 className="font-display text-2xl mt-4">{t}</h3>
                  <p className="text-paper/65 mt-3 leading-relaxed">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="font-display text-4xl sm:text-5xl">Where we&apos;re headed</h2>
          <p className="mt-5 text-lg text-muted leading-relaxed max-w-lg">We&apos;re starting with tech and workspace essentials, and growing carefully into home, kitchen, pets and wellness, one well-chosen product at a time.</p>
        </div>
        <div className="lg:text-right"><Button href="/shop" variant="accent">Explore products <ArrowRight size={18} /></Button></div>
      </section>
    </>
  );
}
