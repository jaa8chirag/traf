"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, Tag } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { PageHero } from "@/components/PageHero";
import { ProductVisual } from "@/components/ProductVisual";
import { ProductCard } from "@/components/ProductCard";
import { getProduct, inr, products, type Product } from "@/data/catalog";
import { promos } from "@/data/extra";

export default function CartPage() {
  const { lines, subtotal, setQty, remove } = useCart();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const rate = applied ? promos[applied] : 0;
  const discount = Math.round(subtotal * rate);
  const total = subtotal - discount;

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (promos[c]) { setApplied(c); setMsg({ ok: true, t: `${c} applied.` }); }
    else { setApplied(null); setMsg({ ok: false, t: "That code isn't valid." }); }
  };

  if (lines.length === 0)
    return (
      <>
        <PageHero title="Your cart" crumbs={[{ label: "Cart" }]} />
        <section className="container-x py-16 text-center">
          <ShoppingBag className="mx-auto text-muted" size={44} />
          <h2 className="font-display text-4xl mt-4">Your cart is empty</h2>
          <p className="text-muted mt-2">Here are a few places to start.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="h-12 px-6 inline-flex items-center rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors">Shop all</Link>
            <Link href="/collections/workspace" className="h-12 px-6 inline-flex items-center rounded-full border border-ink/20 font-medium hover:bg-white">Workspace collection</Link>
          </div>
          <div className="mt-16 text-left grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-10">
            {products.filter((p) => p.badge === "Bestseller" || p.collection === "best").slice(0, 3).map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        </section>
      </>
    );

  return (
    <>
      <PageHero title="Your cart" crumbs={[{ label: "Cart" }]} />
      <section className="container-x py-12 grid lg:grid-cols-[1fr_400px] gap-10">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((l) => {
            const p = getProduct(l.slug) as Product;
            return (
              <li key={l.slug} className="flex gap-4 sm:gap-6 py-6">
                <Link href={`/products/${p.slug}`} className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0">
                  <ProductVisual kind={p.kind} tone={p.tone} className="w-full h-full" />
                </Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link href={`/products/${p.slug}`} className="font-display text-xl hover:text-accent-ink">{p.name}</Link>
                      <p className="text-sm text-muted">{p.tagline}</p>
                    </div>
                    <p className="font-semibold">{inr(p.price * l.qty)}</p>
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="inline-flex items-center h-10 rounded-full border border-ink/20 bg-white" role="group" aria-label={`Quantity for ${p.name}`}>
                      <button className="w-10 h-full grid place-items-center" aria-label="Decrease quantity" onClick={() => setQty(l.slug, l.qty - 1)}><Minus size={14} /></button>
                      <span className="w-6 text-center text-sm font-medium">{l.qty}</span>
                      <button className="w-10 h-full grid place-items-center disabled:opacity-30" aria-label="Increase quantity" disabled={l.qty >= 10} onClick={() => setQty(l.slug, l.qty + 1)}><Plus size={14} /></button>
                    </div>
                    <button onClick={() => remove(l.slug)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent-ink"><Trash2 size={15} /> Remove</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="self-start lg:sticky lg:top-24 rounded-[28px] bg-paper-2 p-7">
          <h2 className="font-display text-2xl">Order summary</h2>
          <form onSubmit={apply} className="mt-5">
            <label htmlFor="promo" className="text-sm font-medium flex items-center gap-1.5"><Tag size={14} /> Promo code</label>
            <div className="mt-2 flex gap-2">
              <input id="promo" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" className="flex-1 min-w-0 h-12 px-4 rounded-full border border-line bg-white outline-none focus:border-ink uppercase" />
              <button className="h-12 px-5 rounded-full border border-ink/20 text-sm font-medium hover:bg-white">Apply</button>
            </div>
            {msg && <p role="status" className={`text-sm mt-2 ${msg.ok ? "text-emerald-700" : "text-accent-ink"}`}>{msg.t}</p>}
          </form>
          <dl className="mt-6 space-y-3 text-[15px]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{inr(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>−{inr(discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="text-muted">Calculated at checkout</dd></div>
            <div className="flex justify-between border-t border-ink/15 pt-4 text-lg font-semibold"><dt>Total</dt><dd>{inr(total)}</dd></div>
          </dl>
          <Link href={applied ? `/checkout?promo=${applied}` : "/checkout"} className="mt-6 h-14 w-full inline-flex items-center justify-center rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors">Proceed to checkout</Link>
          <Link href="/shop" className="mt-3 block text-center text-sm underline underline-offset-4">Continue shopping</Link>
        </aside>
      </section>
    </>
  );
}
