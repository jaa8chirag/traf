"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { products } from "@/data/catalog";
import { ProductCard } from "./ProductCard";
import { SectionHead } from "./SectionHead";

const tabs = [
  { id: "best", label: "Best sellers" },
  { id: "new", label: "New arrivals" },
] as const;

export function ProductRail() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("best");
  const list = products.filter((p) => p.collection === tab);

  return (
    <section className="bg-paper-2 py-20 lg:py-28" aria-labelledby="rail-h">
      <div className="container-x">
        <SectionHead id="rail-h" eyebrow="The edit" title="Things people reach for every day." link={{ href: "/shop", label: "Shop all" }} />

        <div role="tablist" aria-label="Product lists" className="mt-8 inline-flex p-1 rounded-full bg-white border border-line">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className="relative px-5 h-10 rounded-full text-sm font-medium"
            >
              {tab === t.id && (
                <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", damping: 30, stiffness: 400 }} />
              )}
              <span className={`relative ${tab === t.id ? "text-paper" : "text-ink/70"}`}>{t.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-10"
          >
            {list.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
