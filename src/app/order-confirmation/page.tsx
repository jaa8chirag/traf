import type { Metadata } from "next";
import { Suspense } from "react";
import { Confirmation } from "@/components/Confirmation";

export const metadata: Metadata = { title: "Order confirmed — Tarf" };

export default function Page() {
  return (
    <Suspense fallback={<div className="container-x py-24 text-muted">Loading…</div>}>
      <Confirmation />
    </Suspense>
  );
}
