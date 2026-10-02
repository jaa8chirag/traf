"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, PackageSearch, Package, Truck, Home, ClipboardCheck } from "lucide-react";
import { useCart, type Order } from "./CartContext";

const steps = [
  { icon: ClipboardCheck, t: "Order confirmed", d: "We've received your order." },
  { icon: Package, t: "Packed", d: "Your items are being packed." },
  { icon: Truck, t: "Shipped", d: "On its way to you." },
  { icon: Home, t: "Delivered", d: "Enjoy!" },
];

export function OrderTimeline({ order }: { order: Order }) {
  // Only the first step is real until fulfilment is connected.
  const done = 1;
  return (
    <div className="rounded-[28px] border border-line bg-white p-6 sm:p-8">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="text-sm text-muted">Order</p>
          <p className="font-display text-3xl">{order.id}</p>
        </div>
        <p className="text-sm text-muted">Placed {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
      </div>
      <ol className="mt-8 space-y-0">
        {steps.map((s, i) => {
          const on = i < done;
          return (
            <li key={s.t} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={`grid place-items-center w-10 h-10 rounded-full ${on ? "bg-accent text-white" : "bg-paper-2 text-muted"}`}>{on ? <Check size={18} /> : <s.icon size={18} />}</span>
                {i < steps.length - 1 && <span className={`w-0.5 flex-1 min-h-8 ${on ? "bg-accent" : "bg-line"}`} />}
              </div>
              <div className="pb-6"><p className={`font-semibold ${on ? "" : "text-muted"}`}>{s.t}</p><p className="text-sm text-muted">{s.d}</p></div>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-muted border-t border-line pt-4">Shipment updates will appear here once courier tracking is connected. <Link href="/contact" className="underline underline-offset-4 text-ink">Need help?</Link></p>
    </div>
  );
}

export function TrackOrder() {
  const { orders } = useCart();
  const [id, setId] = useState("");
  const [result, setResult] = useState<Order | null | undefined>(undefined);

  return (
    <div className="container-x py-14 lg:py-20 max-w-3xl">
      <form onSubmit={(e) => { e.preventDefault(); setResult(orders.find((o) => o.id.toLowerCase() === id.trim().toLowerCase()) ?? null); }} className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="oid" className="sr-only">Order number</label>
        <input id="oid" value={id} onChange={(e) => { setId(e.target.value); setResult(undefined); }} placeholder="Order number, e.g. TRF-123456" className="flex-1 h-14 px-6 rounded-full border border-line bg-white outline-none focus:border-ink" />
        <button className="h-14 px-8 rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors">Track order</button>
      </form>
      <div className="mt-8" aria-live="polite">
        {result && <OrderTimeline order={result} />}
        {result === null && (
          <div className="rounded-[28px] border border-dashed border-ink/20 p-10 text-center">
            <PackageSearch className="mx-auto text-muted" size={34} />
            <p className="font-display text-2xl mt-3">We couldn&apos;t find that order</p>
            <p className="text-muted mt-1">Check the number in your confirmation, or <Link href="/contact" className="underline underline-offset-4 text-ink">contact support</Link>.</p>
          </div>
        )}
      </div>
    </div>
  );
}
