"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X, SearchX } from "lucide-react";
import type { Product } from "@/data/catalog";
import { ProductCard } from "./ProductCard";

type Sort = "featured" | "low" | "high" | "rating";
const prices = [
  { id: "all", label: "Any price", test: () => true },
  { id: "u1000", label: "Under ₹1,000", test: (n: number) => n < 1000 },
  { id: "1-2", label: "₹1,000 – ₹2,000", test: (n: number) => n >= 1000 && n <= 2000 },
  { id: "o2000", label: "Over ₹2,000", test: (n: number) => n > 2000 },
];

export function ShopBrowser({
  products,
  query,
  emptyHint,
}: {
  products: Product[];
  query?: string;
  emptyHint?: string;
}) {
  const [sort, setSort] = useState<Sort>("featured");
  const [price, setPrice] = useState("all");
  const [stock, setStock] = useState(false);
  const [sheet, setSheet] = useState(false);

  const list = useMemo(() => {
    const t = prices.find((p) => p.id === price)!.test;
    const out = products.filter((p) => t(p.price) && (!stock || p.inStock));
    if (sort === "low") out.sort((a, b) => a.price - b.price);
    if (sort === "high") out.sort((a, b) => b.price - a.price);
    if (sort === "rating") out.sort((a, b) => b.rating - a.rating);
    return out;
  }, [products, sort, price, stock]);

  const active = (price !== "all" ? 1 : 0) + (stock ? 1 : 0);
  const reset = () => (setPrice("all"), setStock(false));

  const filters = (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-sm font-semibold mb-3">Price</legend>
        <div className="space-y-1">
          {prices.map((p) => (
            <label key={p.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <input type="radio" name="price" checked={price === p.id} onChange={() => setPrice(p.id)} className="accent-[var(--accent)] w-4 h-4" />
              <span className="text-[15px]">{p.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} className="accent-[var(--accent)] w-4 h-4" />
        <span className="text-[15px]">In stock only</span>
      </label>
      {active > 0 && (
        <button onClick={reset} className="text-sm underline underline-offset-4">Clear filters</button>
      )}
    </div>
  );

  return (
    <div className="container-x py-10 lg:py-14">
      <div className="flex items-center justify-between gap-4 pb-6 border-b border-line">
        <p className="text-muted" aria-live="polite">
          {list.length} {list.length === 1 ? "product" : "products"}
          {query ? <> for “<span className="text-ink">{query}</span>”</> : null}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSheet(true)}
            className="lg:hidden inline-flex items-center gap-2 h-11 px-4 rounded-full border border-line bg-white text-sm font-medium"
          >
            <SlidersHorizontal size={16} /> Filters{active > 0 && ` (${active})`}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only sm:not-sr-only text-muted">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-11 rounded-full border border-line bg-white px-4 text-sm font-medium outline-none focus-visible:border-ink"
            >
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-10 grid lg:grid-cols-[220px_1fr] gap-10">
        <aside className="hidden lg:block sticky top-24 self-start" aria-label="Filters">{filters}</aside>
        {list.length > 0 ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-10">
            {list.map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-ink/20 py-20 px-6 text-center">
            <SearchX className="mx-auto text-muted" size={36} />
            <h2 className="font-display text-3xl mt-4">Nothing matches that</h2>
            <p className="text-muted mt-2 max-w-sm mx-auto">{emptyHint ?? "Try removing a filter or browsing everything."}</p>
            <div className="mt-6 flex justify-center gap-3">
              {active > 0 && <button onClick={reset} className="h-11 px-5 rounded-full border border-ink/20 font-medium">Clear filters</button>}
              <Link href="/shop" className="h-11 px-5 rounded-full bg-ink text-paper font-medium inline-flex items-center">Shop all</Link>
            </div>
          </div>
        )}
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setSheet(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-paper rounded-t-[28px] p-6 pb-8 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl">Filters</h2>
              <button onClick={() => setSheet(false)} aria-label="Close filters" className="p-2 -mr-2"><X /></button>
            </div>
            {filters}
            <button onClick={() => setSheet(false)} className="mt-8 w-full h-13 py-3.5 rounded-full bg-ink text-paper font-medium">
              Show {list.length} {list.length === 1 ? "product" : "products"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
