"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { faqs } from "@/data/catalog";
import { SectionHead } from "./SectionHead";

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="container-x py-20 lg:py-28 grid lg:grid-cols-12 gap-10" aria-labelledby="faq-h">
      <div className="lg:col-span-5">
        <SectionHead id="faq-h" eyebrow="Good to know" title="Questions, answered." />
        <p className="mt-5 text-muted max-w-sm">
          Can&apos;t find it? Our <Link href="/help" className="underline underline-offset-4 text-ink">Help centre</Link> or{" "}
          <Link href="/contact" className="underline underline-offset-4 text-ink">support team</Link> will sort you out.
        </p>
      </div>
      <div className="lg:col-span-7 border-t border-ink/15">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="border-b border-ink/15">
              <h3>
                <button
                  className="w-full flex items-center justify-between gap-6 py-6 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-display text-2xl">{f.q}</span>
                  <span className={`shrink-0 grid place-items-center w-10 h-10 rounded-full border border-ink/20 transition-all duration-300 ${isOpen ? "bg-ink text-paper rotate-45" : ""}`}>
                    <Plus size={18} />
                  </span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="pb-6 pr-16 text-muted leading-relaxed">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
