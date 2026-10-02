"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play } from "lucide-react";
import { ProductVisual } from "./ProductVisual";
import { SectionHead } from "./SectionHead";

const steps = [
  { title: "Spot the problem", text: "Hunched shoulders, tangled cables, a dim desk. We start with how you actually live and work.", kind: "stand" as const, tone: "sage" as const },
  { title: "Compare what matters", text: "Specs, compatibility and what's included, laid out plainly, so you can decide without guessing.", kind: "charger" as const, tone: "ink" as const },
  { title: "See it in use", text: "Short demos and real-world photos show how it fits into your day before you add it to cart.", kind: "holder" as const, tone: "sand" as const },
];

export function Education() {
  const [i, setI] = useState(0);
  const s = steps[i];
  return (
    <section className="container-x py-20 lg:py-28" aria-labelledby="edu-h">
      <SectionHead id="edu-h" eyebrow="Product education" title="Understand it before you buy it." />
      <div className="mt-12 grid lg:grid-cols-12 gap-8 lg:gap-14 items-center">
        <div className="lg:col-span-5 order-2 lg:order-1">
          <ol className="space-y-3">
            {steps.map((st, idx) => (
              <li key={st.title}>
                <button
                  onClick={() => setI(idx)}
                  aria-current={i === idx}
                  className={`w-full text-left rounded-3xl p-5 sm:p-6 border transition-all duration-300 ${
                    i === idx ? "bg-white border-ink/15 shadow-[0_20px_40px_-24px_rgba(16,21,18,.35)]" : "border-transparent hover:bg-white/60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-display text-2xl w-10 h-10 grid place-items-center rounded-full shrink-0 transition-colors ${
                        i === idx ? "bg-accent text-white" : "bg-paper-2 text-ink/60"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <h3 className="font-display text-2xl">{st.title}</h3>
                  </div>
                  <AnimatePresence initial={false}>
                    {i === idx && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden text-muted pl-14 mt-2 leading-relaxed"
                      >
                        {st.text}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7 order-1 lg:order-2 relative aspect-[4/3] rounded-[32px] overflow-hidden bg-paper-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <ProductVisual kind={s.kind} tone={s.tone} className="w-full h-full" />
            </motion.div>
          </AnimatePresence>
          <button
            aria-label="Play product demo"
            className="absolute left-5 bottom-5 inline-flex items-center gap-3 rounded-full bg-white/90 backdrop-blur pl-2 pr-5 h-12 font-medium hover:bg-white transition-colors"
          >
            <span className="grid place-items-center w-8 h-8 rounded-full bg-accent text-white">
              <Play size={13} fill="currentColor" />
            </span>
            Watch the 30-sec demo
          </button>
        </div>
      </div>
    </section>
  );
}
