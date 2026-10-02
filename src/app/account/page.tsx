"use client";

import Link from "next/link";
import { PackageOpen, UserRound } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { useCart } from "@/components/CartContext";
import { inr } from "@/data/catalog";

export default function AccountPage() {
  const { orders } = useCart();
  return (
    <>
      <PageHero eyebrow="Account" title="Your orders" lede="Sign-in and saved details are coming soon. For now, orders placed in this browser appear here." crumbs={[{ label: "Account" }]} />
      <section className="container-x py-14 grid lg:grid-cols-[1fr_340px] gap-10">
        <div>
          <h2 className="font-display text-3xl">Order history</h2>
          {orders.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-ink/20 p-12 text-center">
              <PackageOpen className="mx-auto text-muted" size={36} />
              <p className="font-display text-2xl mt-3">No orders yet</p>
              <p className="text-muted mt-1">When you place an order, it will show up here.</p>
              <Link href="/shop" className="mt-6 inline-flex h-12 px-6 items-center rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors">Start shopping</Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="rounded-[24px] border border-line bg-white p-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.id}</p>
                    <p className="text-sm text-muted">{new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.lines.reduce((s, l) => s + l.qty, 0)} items</p>
                  </div>
                  <p className="font-semibold">{inr(o.total)}</p>
                  <Link href={`/order-confirmation?id=${o.id}`} className="text-sm underline underline-offset-4">View</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="self-start rounded-[28px] bg-paper-2 p-7">
          <UserRound className="text-accent" />
          <h3 className="font-display text-2xl mt-3">Accounts are coming</h3>
          <p className="text-muted mt-2 text-sm leading-relaxed">You can check out as a guest and track any order with its number.</p>
          <Link href="/track-order" className="mt-5 inline-flex h-11 px-5 items-center rounded-full border border-ink/20 text-sm font-medium hover:bg-white">Track an order</Link>
        </aside>
      </section>
    </>
  );
}
