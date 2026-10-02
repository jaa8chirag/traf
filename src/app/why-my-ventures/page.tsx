import type { Metadata } from "next";
import { Check, X, ArrowRight } from "lucide-react";
import { PageHero, Button } from "@/components/PageHero";
import { WhyTarf } from "@/components/WhyTarf";

export const metadata: Metadata = { title: "Why Tarf" };

const rows = [
  ["Clear specs & what's in the box", true, false],
  ["Fewer, better-chosen products", true, false],
  ["Honest pricing, no fake sales", true, false],
  ["Easy tracking, returns & support", true, false],
  ["Real-use photos and demos", true, false],
] as const;

export default function WhyPage() {
  return (
    <>
      <PageHero eyebrow="Why Tarf" title={<>Online shopping shouldn&apos;t feel like <em className="text-accent">guesswork.</em></>} lede="Too many listings, too little information. We built Tarf to fix the part where you have to hope for the best." crumbs={[{ label: "Why Tarf" }]} bg="bg-sage" />

      <section className="container-x py-16 lg:py-24 grid lg:grid-cols-2 gap-12">
        <div>
          <h2 className="font-display text-4xl sm:text-5xl">The problem</h2>
          <p className="mt-5 text-lg text-ink/80 leading-relaxed">Search for any everyday product and you&apos;ll find hundreds of near-identical listings: vague photos, copied descriptions and no one to ask. Quality is a gamble.</p>
          <h2 className="font-display text-4xl sm:text-5xl mt-12">Our approach</h2>
          <p className="mt-5 text-lg text-ink/80 leading-relaxed">We start from real everyday needs, choose a small number of products that solve them well, and explain each one clearly before you buy.</p>
        </div>
        <div className="rounded-[32px] border border-line bg-white overflow-hidden self-start">
          <div className="grid grid-cols-[1fr_90px_90px] bg-paper-2 text-sm font-semibold p-4">
            <span /> <span className="text-center text-accent-ink">Tarf</span> <span className="text-center text-muted">Typical listing</span>
          </div>
          {rows.map(([t, a, b]) => (
            <div key={t} className="grid grid-cols-[1fr_90px_90px] items-center p-4 border-t border-line">
              <span>{t}</span>
              <span className="grid place-items-center">{a ? <Check className="text-accent" strokeWidth={3} size={20} /> : <X className="text-muted" size={18} />}</span>
              <span className="grid place-items-center">{b ? <Check size={20} /> : <X className="text-muted" size={18} />}</span>
            </div>
          ))}
        </div>
      </section>

      <WhyTarf />

      <section className="container-x py-16 lg:py-24 text-center">
        <h2 className="font-display text-4xl sm:text-6xl max-w-3xl mx-auto leading-tight">Ready to shop with <em className="text-accent">confidence?</em></h2>
        <div className="mt-8"><Button href="/shop">Shop with confidence <ArrowRight size={18} /></Button></div>
      </section>
    </>
  );
}
