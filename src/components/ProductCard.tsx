"use client";

import Link from "next/link";
import { useState } from "react";
import { Star, Plus, Check, Loader2 } from "lucide-react";
import { inr, type Product } from "@/data/catalog";
import { ProductVisual } from "./ProductVisual";
import { useCart } from "./CartContext";


export function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  const [state, setState] = useState<"idle" | "loading" | "added">("idle");

  const onAdd = () => {
    if (!p.inStock || state !== "idle") return;
    setState("loading");
    setTimeout(() => {
      add(p.slug);
      setState("added");
      setTimeout(() => setState("idle"), 1600);
    }, 450);
  };

  const off = p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0;

  return (
    <article className="group">
      <div className="relative rounded-[24px] overflow-hidden aspect-square bg-paper-2">
        <Link href={`/products/${p.slug}`} aria-label={`View ${p.name}`} className="block w-full h-full">
          <ProductVisual
            kind={p.kind}
            tone={p.tone}
            className={`w-full h-full transition-transform duration-700 group-hover:scale-[1.07] ${p.inStock ? "" : "opacity-60 saturate-50"}`}
          />
        </Link>
        <div className="absolute top-3 left-3 flex gap-1.5">
          {p.badge && (
            <span className="rounded-full bg-ink text-paper text-[11px] font-semibold px-2.5 py-1">{p.badge}</span>
          )}
          {!p.inStock && (
            <span className="rounded-full bg-white text-ink text-[11px] font-semibold px-2.5 py-1">Sold out</span>
          )}
        </div>
        <button
          onClick={onAdd}
          disabled={!p.inStock}
          aria-label={p.inStock ? `Add ${p.name} to cart` : `${p.name} is unavailable`}
          className={`absolute bottom-3 right-3 h-11 rounded-full flex items-center gap-2 px-3.5 text-sm font-medium shadow-lg transition-all duration-300
            disabled:opacity-0
            ${state === "added" ? "bg-sage text-ink" : "bg-white text-ink hover:bg-accent hover:text-white"}
            lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:translate-y-0`}
        >
          {state === "loading" ? <Loader2 size={18} className="animate-spin" /> : state === "added" ? <Check size={18} /> : <Plus size={18} />}
          <span>{state === "added" ? "Added" : state === "loading" ? "Adding" : "Add"}</span>
        </button>
      </div>

      <div className="pt-4 px-1">
        <div className="flex items-center gap-1.5 text-[13px] text-muted">
          <Star size={13} className="fill-accent text-accent" aria-hidden />
          <span className="font-medium text-ink">{p.rating.toFixed(1)}</span>
          <span>({p.reviews})</span>
        </div>
        <h3 className="mt-1.5 font-display text-xl leading-tight">
          <Link href={`/products/${p.slug}`} className="hover:text-accent-ink transition-colors">
            {p.name}
          </Link>
        </h3>
        <p className="text-sm text-muted mt-0.5">{p.tagline}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-semibold text-lg">{inr(p.price)}</span>
          {p.compareAt && (
            <>
              <span className="text-sm text-muted line-through">{inr(p.compareAt)}</span>
              <span className="text-xs font-semibold text-accent-ink">{off}% off</span>
            </>
          )}
        </p>
      </div>
    </article>
  );
}
