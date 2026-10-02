import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/PageHero";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata: Metadata = { title: "Checkout — Tarf" };

export default function CheckoutPage() {
  return (
    <>
      <PageHero title="Checkout" crumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <Suspense fallback={<div className="container-x py-24 text-muted">Loading…</div>}>
        <CheckoutForm />
      </Suspense>
    </>
  );
}
