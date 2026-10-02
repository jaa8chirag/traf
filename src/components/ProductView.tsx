"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Minus, Plus, Check, Truck, ShieldCheck, RotateCcw, MapPin } from "lucide-react";
import { inr, type Product, type Tone } from "@/data/catalog";
import { ProductVisual } from "./ProductVisual";
import { useCart } from "./CartContext";

interface Detail {
  desc: string;
  highlights: string[];
  specs: [string, string][];
  includes: string[];
}

const angles: Tone[] = ["sage", "sand", "sky", "blush"];

export function ProductView({ p, d }: { p: Product; d: Detail }) {
  const { add } = useCart();
  const router = useRouter();
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [pin, setPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const tone: Tone = img === 0 ? p.tone : angles[img];
  const off = p.compareAt ? Math.round((1 - p.price / p.compareAt) * 100) : 0;

  const addToCart = () => {
    add(p.slug, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };
  const buyNow = () => {
    add(p.slug, qty);
    router.push("/checkout");
  };
  const checkPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(
      /^[1-9]\d{5}$/.test(pin)
        ? { ok: true, t: "Great, we can deliver to this pincode. Exact delivery dates are confirmed at checkout." }
        : { ok: false, t: "Enter a valid 6-digit pincode." },
    );
  };

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
        <div className="lg:sticky lg:top-24 self-start">
          <div className="relative aspect-square rounded-[32px] overflow-hidden bg-paper-2">
            <ProductVisual kind={p.kind} tone={tone} className="w-full h-full" />
            {p.badge && <span className="absolute top-4 left-4 rounded-full bg-ink text-paper text-xs font-semibold px-3 py-1.5">{p.badge}</span>}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {angles.map((a, i) => (
              <button
                key={i}
                onClick={() => setImg(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={img === i}
                className={`aspect-square rounded-2xl overflow-hidden border-2 transition-colors ${img === i ? "border-ink" : "border-transparent hover:border-ink/30"}`}
              >
                <ProductVisual kind={p.kind} tone={i === 0 ? p.tone : a} className="w-full h-full" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted">{p.category}</p>
          <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mt-2">{p.name}</h1>
          <p className="text-lg text-muted mt-2">{p.tagline}</p>
          <a href="#reviews" className="mt-4 inline-flex items-center gap-2 text-sm">
            <span className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className={i < Math.round(p.rating) ? "fill-accent text-accent" : "text-line"} />)}</span>
            <span className="font-medium">{p.rating.toFixed(1)}</span>
            <span className="text-muted underline underline-offset-4">{p.reviews} reviews</span>
          </a>

          <p className="mt-6 flex items-baseline gap-3">
            <span className="text-4xl font-semibold">{inr(p.price)}</span>
            {p.compareAt && <><span className="text-lg text-muted line-through">{inr(p.compareAt)}</span><span className="text-sm font-semibold text-accent-ink bg-blush rounded-full px-2.5 py-1">{off}% off</span></>}
          </p>
          <p className="text-xs text-muted mt-1">Inclusive of all taxes</p>

          <p className="mt-6 text-ink/80 leading-relaxed">{d.desc}</p>
          <ul className="mt-5 space-y-2">
            {d.highlights.map((h) => <li key={h} className="flex items-center gap-3"><Check size={16} className="text-accent shrink-0" strokeWidth={3} />{h}</li>)}
          </ul>

          <div className="mt-8 flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${p.inStock ? "bg-emerald-600" : "bg-muted"}`} />
            <span className="font-medium">{p.inStock ? "In stock" : "Currently unavailable"}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="inline-flex items-center h-14 rounded-full border border-ink/20 bg-white" role="group" aria-label="Quantity">
              <button className="w-12 h-full grid place-items-center disabled:opacity-30" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><Minus size={16} /></button>
              <span className="w-8 text-center font-medium" aria-live="polite">{qty}</span>
              <button className="w-12 h-full grid place-items-center disabled:opacity-30" aria-label="Increase quantity" disabled={qty >= 10} onClick={() => setQty(qty + 1)}><Plus size={16} /></button>
            </div>
            <button
              disabled={!p.inStock}
              onClick={addToCart}
              className={`flex-1 min-w-[160px] h-14 rounded-full font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${added ? "bg-sage text-ink" : "bg-ink text-paper hover:bg-accent"}`}
            >
              {added ? "Added to cart ✓" : "Add to cart"}
            </button>
            <button disabled={!p.inStock} onClick={buyNow} className="flex-1 min-w-[140px] h-14 rounded-full font-medium bg-accent text-white hover:bg-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Buy now
            </button>
          </div>

          <form onSubmit={checkPin} className="mt-6 flex gap-2 max-w-sm">
            <label className="sr-only" htmlFor="pin">Delivery pincode</label>
            <div className="flex-1 flex items-center gap-2 h-12 px-4 rounded-full border border-line bg-white focus-within:border-ink">
              <MapPin size={16} className="text-muted" />
              <input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="Delivery pincode" className="w-full outline-none bg-transparent text-sm" />
            </div>
            <button className="h-12 px-5 rounded-full border border-ink/20 text-sm font-medium hover:bg-white">Check</button>
          </form>
          {pinMsg && <p role="status" className={`mt-2 text-sm ${pinMsg.ok ? "text-emerald-700" : "text-accent-ink"}`}>{pinMsg.t}</p>}

          <ul className="mt-8 grid grid-cols-3 gap-3 text-center text-xs sm:text-sm">
            {[[Truck, "Tracked delivery"], [ShieldCheck, "Warranty included"], [RotateCcw, "Easy returns"]].map(([I, t]) => {
              const Icon = I as typeof Truck;
              return <li key={t as string} className="rounded-2xl bg-paper-2 py-4 px-2"><Icon className="mx-auto mb-2 text-accent" size={22} />{t as string}</li>;
            })}
          </ul>

          <div className="mt-10 divide-y divide-line border-y border-line">
            <details open className="group py-4"><summary className="cursor-pointer font-display text-xl list-none flex justify-between">Specifications <Plus size={18} className="group-open:rotate-45 transition-transform mt-1" /></summary>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-[15px]">{d.specs.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>)}</dl>
            </details>
            <details className="group py-4"><summary className="cursor-pointer font-display text-xl list-none flex justify-between">What&apos;s in the box <Plus size={18} className="group-open:rotate-45 transition-transform mt-1" /></summary>
              <ul className="mt-4 list-disc pl-5 space-y-1 text-[15px]">{d.includes.map((i) => <li key={i}>{i}</li>)}</ul>
            </details>
            <details className="group py-4"><summary className="cursor-pointer font-display text-xl list-none flex justify-between">Shipping &amp; returns <Plus size={18} className="group-open:rotate-45 transition-transform mt-1" /></summary>
              <p className="mt-4 text-[15px] text-muted leading-relaxed">Delivery estimates are shown at checkout. Returns and warranty terms are covered in our Refund Policy and Help centre.</p>
            </details>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-line px-4 py-3 flex items-center gap-3">
        <div className="leading-tight"><p className="text-xs text-muted truncate max-w-[110px]">{p.name}</p><p className="font-semibold">{inr(p.price)}</p></div>
        <button disabled={!p.inStock} onClick={addToCart} className="ml-auto h-12 px-8 rounded-full bg-ink text-paper font-medium disabled:opacity-40">{added ? "Added ✓" : "Add to cart"}</button>
      </div>
    </>
  );
}
