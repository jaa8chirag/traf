"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, SearchX, Truck, RotateCcw, ShieldCheck, CreditCard, Package } from "lucide-react";
import { helpTopics } from "@/data/extra";

const icons = { orders: Package, shipping: Truck, returns: RotateCcw, warranty: ShieldCheck, payments: CreditCard } as const;

export function HelpCenter() {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    return helpTopics
      .filter((t) => topic === "all" || t.id === topic)
      .map((t) => ({ ...t, items: t.items.filter((i) => !s || (i.q + i.a).toLowerCase().includes(s)) }))
      .filter((t) => t.items.length);
  }, [q, topic]);

  return (
    <div className="container-x py-12 lg:py-16">
      <div className="flex items-center gap-3 bg-white border border-line focus-within:border-ink rounded-full px-5 h-14 max-w-2xl">
        <Search size={20} className="text-muted" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles" aria-label="Search help" className="flex-1 bg-transparent outline-none" />
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Help topics">
        {[{ id: "all", title: "All topics" }, ...helpTopics].map((t) => {
          const Icon = icons[t.id as keyof typeof icons];
          return (
            <button key={t.id} role="tab" aria-selected={topic === t.id} onClick={() => setTopic(t.id)}
              className={`h-11 px-4 rounded-full border text-sm font-medium inline-flex items-center gap-2 transition-colors ${topic === t.id ? "bg-ink text-paper border-ink" : "bg-white border-line hover:border-ink"}`}>
              {Icon && <Icon size={16} />} {t.title}
            </button>
          );
        })}
      </div>

      <div className="mt-10 space-y-12 max-w-3xl">
        {groups.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-ink/20 py-14 text-center">
            <SearchX className="mx-auto text-muted" size={32} />
            <p className="font-display text-2xl mt-3">No answers found</p>
            <p className="text-muted mt-1">Try different words, or <Link href="/contact" className="underline underline-offset-4 text-ink">contact us</Link>.</p>
          </div>
        )}
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`h-${g.id}`}>
            <h2 id={`h-${g.id}`} className="font-display text-3xl">{g.title}</h2>
            <div className="mt-4 border-t border-ink/15">
              {g.items.map((i) => {
                const k = g.id + i.q;
                const isOpen = open === k;
                return (
                  <div key={k} className="border-b border-ink/15">
                    <h3>
                      <button className="w-full flex items-center justify-between gap-4 py-5 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : k)}>
                        <span className="text-lg font-medium">{i.q}</span>
                        <Plus size={20} className={`shrink-0 transition-transform ${isOpen ? "rotate-45" : ""}`} />
                      </button>
                    </h3>
                    {isOpen && <p className="pb-5 pr-10 text-muted leading-relaxed">{i.a}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-[28px] bg-sage p-8 sm:p-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl">Still need help?</h2>
          <p className="text-ink/70 mt-1">Our support team will get back to you.</p>
        </div>
        <Link href="/contact" className="h-13 py-3.5 px-7 rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors">Contact support</Link>
      </div>
    </div>
  );
}
