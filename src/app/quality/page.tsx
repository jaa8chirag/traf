import type { Metadata } from "next";
import { PackageCheck, Search, Boxes, RotateCcw, LifeBuoy, Sparkles, ArrowRight } from "lucide-react";
import { PageHero, Button } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { FAQ } from "@/components/FAQ";

export const metadata: Metadata = { title: "Quality & Trust — Tarf" };

const steps = [
  { icon: Search, t: "Source", d: "We shortlist products against a real need, then compare makers on materials, build and price." },
  { icon: Sparkles, t: "Test", d: "Sample units are tried in everyday use before a product is listed." },
  { icon: PackageCheck, t: "Check", d: "Units are inspected before dispatch, so what arrives matches what we described." },
  { icon: Boxes, t: "Pack", d: "Protective packaging designed to arrive intact, with what's-in-the-box clearly listed." },
  { icon: RotateCcw, t: "Stand behind", d: "Clear returns and warranty terms, shown before you buy." },
  { icon: LifeBuoy, t: "Support", d: "A real team to help with setup, tracking or problems." },
];

export default function QualityPage() {
  return (
    <>
      <PageHero eyebrow="Quality & Trust" title={<>Our quality promise, <em className="text-accent">in the open.</em></>} lede="How a product earns a place at Tarf, and what we do if it doesn't live up to it." crumbs={[{ label: "Quality & Trust" }]} bg="bg-sky" />

      <section className="container-x py-16 lg:py-24">
        <h2 className="font-display text-4xl sm:text-5xl">From maker to your door</h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={(i % 3) * 0.07}>
              <div className="h-full rounded-[28px] border border-line bg-white p-7">
                <div className="flex items-center justify-between">
                  <span className="grid place-items-center w-12 h-12 rounded-2xl bg-sage"><s.icon size={22} /></span>
                  <span className="font-display text-3xl text-ink/20">0{i + 1}</span>
                </div>
                <h3 className="font-display text-2xl mt-6">{s.t}</h3>
                <p className="text-muted mt-2 leading-relaxed">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted max-w-2xl">We only show certifications and test results on a product page when they&apos;re verified for that specific product.</p>
      </section>

      <section className="bg-ink text-paper py-16">
        <div className="container-x flex flex-wrap items-center justify-between gap-6">
          <h2 className="font-display text-3xl sm:text-4xl max-w-xl">Returns and warranty, summarised.</h2>
          <div className="flex gap-3 flex-wrap">
            <Button href="/refund-policy" variant="ghost"><span className="text-paper">Refund policy</span></Button>
            <Button href="/shop" variant="accent">View products <ArrowRight size={18} /></Button>
          </div>
        </div>
      </section>
      <FAQ />
    </>
  );
}
