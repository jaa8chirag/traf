"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "./CartContext";
import { getProduct, inr, products } from "@/data/catalog";
import { ProductCard } from "./ProductCard";

export function Confirmation() {
  const id = useSearchParams().get("id");
  const { orders } = useCart();
  const order = orders.find((o) => o.id === id);

  if (!order)
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-4xl">We couldn&apos;t find that order</h1>
        <p className="text-muted mt-2">Open it from your account, or contact us if you need help.</p>
        <Link href="/account" className="mt-6 inline-flex h-12 px-6 items-center rounded-full bg-ink text-paper font-medium">Go to account</Link>
      </div>
    );

  return (
    <>
      <section className="container-x py-14 lg:py-20 max-w-3xl text-center">
        <CheckCircle2 className="mx-auto text-accent" size={64} strokeWidth={1.5} />
        <h1 className="font-display text-5xl sm:text-6xl mt-5">Thank you, {order.name.split(" ")[0]}!</h1>
        <p className="text-lg text-muted mt-3">Your order is confirmed. A confirmation will be sent to your email.</p>
        <p className="mt-6 inline-block rounded-full bg-sage px-5 py-2 font-semibold">Order {order.id}</p>

        <div className="mt-10 rounded-[28px] border border-line bg-white p-6 text-left">
          <ul className="divide-y divide-line">
            {order.lines.map((l) => {
              const p = getProduct(l.slug);
              return <li key={l.slug} className="flex justify-between py-3"><span>{p?.name} <span className="text-muted">× {l.qty}</span></span><span>{p ? inr(p.price * l.qty) : ""}</span></li>;
            })}
          </ul>
          <p className="flex justify-between border-t border-line pt-4 font-semibold text-lg"><span>Total</span><span>{inr(order.total)}</span></p>
          <p className="text-sm text-muted mt-3">Delivering to {order.city}. Delivery estimate will be shared once your order ships.</p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/track-order" className="h-14 px-8 inline-flex items-center rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors">Track order</Link>
          <Link href="/help" className="h-14 px-8 inline-flex items-center rounded-full border border-ink/20 font-medium hover:bg-white">Get help</Link>
        </div>
      </section>
      <section className="bg-paper-2 py-16">
        <div className="container-x">
          <h2 className="font-display text-3xl sm:text-4xl">You might also like</h2>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-10">
            {products.filter((p) => !order.lines.some((l) => l.slug === p.slug)).slice(0, 3).map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        </div>
      </section>
    </>
  );
}
