"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Info, ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";
import { ProductVisual } from "./ProductVisual";
import { getProduct, inr, type Product } from "@/data/catalog";
import { promos } from "@/data/extra";

const input = "w-full h-13 py-3.5 px-4 rounded-2xl border bg-white outline-none focus:border-ink transition-colors";
const shipping = [
  { id: "standard", label: "Standard delivery", note: "Estimate confirmed once logistics partner is connected", price: 0 },
  { id: "express", label: "Express delivery", note: "Faster dispatch", price: 99 },
];

export function CheckoutForm() {
  const { lines, subtotal, clear, placeOrder } = useCart();
  const router = useRouter();
  const sp = useSearchParams();
  const promo = (sp.get("promo") ?? "").toUpperCase();
  const rate = promos[promo] ?? 0;

  const [f, setF] = useState({ email: "", phone: "", name: "", address: "", city: "", state: "", pin: "" });
  const [ship, setShip] = useState("standard");
  const [pay, setPay] = useState("upi");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const shipPrice = shipping.find((s) => s.id === ship)!.price;
  const discount = Math.round(subtotal * rate);
  const total = subtotal - discount + shipPrice;

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: "" });
  };

  if (lines.length === 0)
    return (
      <div className="container-x py-24 text-center">
        <ShoppingBag className="mx-auto text-muted" size={40} />
        <h2 className="font-display text-3xl mt-4">Nothing to check out</h2>
        <Link href="/shop" className="mt-6 inline-flex h-12 px-6 items-center rounded-full bg-ink text-paper font-medium">Shop products</Link>
      </div>
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = "Enter a valid email.";
    if (!/^[6-9]\d{9}$/.test(f.phone)) er.phone = "Enter a 10-digit mobile number.";
    if (f.name.trim().length < 2) er.name = "Enter the recipient's name.";
    if (f.address.trim().length < 6) er.address = "Enter your full address.";
    if (!f.city.trim()) er.city = "Enter your city.";
    if (!f.state.trim()) er.state = "Enter your state.";
    if (!/^[1-9]\d{5}$/.test(f.pin)) er.pin = "Enter a valid 6-digit pincode.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    // TODO: create order + payment session with the chosen gateway
    setTimeout(() => {
      const o = placeOrder({ lines, total, name: f.name, city: f.city });
      clear();
      router.push(`/order-confirmation?id=${o.id}`);
    }, 1000);
  };

  const field = ({ k, label, type = "text", mode, span }: { k: keyof typeof f; label: string; type?: string; mode?: "numeric" | "tel"; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <label htmlFor={k} className="block text-sm font-medium mb-1.5">{label}</label>
      <input id={k} type={type} inputMode={mode} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={`e-${k}`} className={`${input} ${errors[k] ? "border-accent" : "border-line"}`} />
      {errors[k] && <p id={`e-${k}`} className="text-sm text-accent-ink mt-1.5">{errors[k]}</p>}
    </div>
  );

  const radio = (active: boolean) => `flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${active ? "border-ink bg-white" : "border-line hover:border-ink/40"}`;

  return (
    <form onSubmit={submit} noValidate className="container-x py-12 grid lg:grid-cols-[1fr_400px] gap-12">
      <div className="space-y-12">
        <section>
          <h2 className="font-display text-3xl">Contact</h2>
          <div className="mt-5 grid sm:grid-cols-2 gap-5">{field({ k: "email", label: "Email", type: "email" })}{field({ k: "phone", label: "Mobile number", type: "tel", mode: "tel" })}</div>
        </section>
        <section>
          <h2 className="font-display text-3xl">Delivery address</h2>
          <div className="mt-5 grid sm:grid-cols-2 gap-5">
            {field({ k: "name", label: "Full name", span: true })}
            {field({ k: "address", label: "Address", span: true })}
            {field({ k: "city", label: "City" })}{field({ k: "state", label: "State" })}
            {field({ k: "pin", label: "Pincode", mode: "numeric" })}
          </div>
        </section>
        <section>
          <h2 className="font-display text-3xl">Delivery method</h2>
          <div className="mt-5 space-y-3">
            {shipping.map((s) => (
              <label key={s.id} className={radio(ship === s.id)}>
                <input type="radio" name="ship" checked={ship === s.id} onChange={() => setShip(s.id)} className="mt-1 accent-[var(--accent)]" />
                <span className="flex-1"><span className="font-medium block">{s.label}</span><span className="text-sm text-muted">{s.note}</span></span>
                <span className="font-medium">{s.price ? inr(s.price) : "Free"}</span>
              </label>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-display text-3xl">Payment</h2>
          <div className="mt-5 space-y-3">
            {[["upi", "UPI"], ["card", "Credit / debit card"], ["netbanking", "Net banking"], ["cod", "Cash on delivery"]].map(([id, l]) => (
              <label key={id} className={radio(pay === id)}>
                <input type="radio" name="pay" checked={pay === id} onChange={() => setPay(id)} className="mt-1 accent-[var(--accent)]" />
                <span className="font-medium">{l}</span>
              </label>
            ))}
          </div>
          <p className="mt-4 flex gap-2 rounded-2xl bg-sand p-4 text-sm"><Info size={18} className="shrink-0 mt-0.5" /> Demo checkout: no payment is taken yet. The payment gateway is connected in the commerce phase.</p>
        </section>
      </div>

      <aside className="self-start lg:sticky lg:top-24 rounded-[28px] bg-paper-2 p-7">
        <h2 className="font-display text-2xl">Order summary</h2>
        <ul className="mt-5 space-y-4">
          {lines.map((l) => {
            const p = getProduct(l.slug) as Product;
            return (
              <li key={l.slug} className="flex items-center gap-3">
                <span className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  <ProductVisual kind={p.kind} tone={p.tone} className="w-full h-full" />
                  <span className="absolute -top-0 -right-0 bg-ink text-paper text-[11px] w-5 h-5 grid place-items-center rounded-bl-lg">{l.qty}</span>
                </span>
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                <span className="text-sm">{inr(p.price * l.qty)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-6 space-y-3 text-[15px] border-t border-ink/15 pt-5">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{inr(subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount ({promo})</dt><dd>−{inr(discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{shipPrice ? inr(shipPrice) : "Free"}</dd></div>
          <div className="flex justify-between border-t border-ink/15 pt-4 text-lg font-semibold"><dt>Total</dt><dd>{inr(total)}</dd></div>
        </dl>
        <button disabled={busy} className="mt-6 h-14 w-full inline-flex items-center justify-center gap-2 rounded-full bg-accent text-white font-medium hover:bg-ink transition-colors disabled:opacity-70">
          {busy ? <><Loader2 size={18} className="animate-spin" /> Placing order…</> : "Place order"}
        </button>
        <p className="text-xs text-muted mt-4 text-center">By placing your order you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/refund-policy" className="underline">Refund Policy</Link>.</p>
      </aside>
    </form>
  );
}
