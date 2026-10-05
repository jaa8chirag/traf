import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { LETTERS } from "@/modules/catalog";

export const metadata: Metadata = {
  title: "A–Z index of categories and suppliers",
  description: "Find any product category or supplier alphabetically.",
  alternates: { canonical: "/a-z" },
};

export default function AzIndex() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "A–Z index", path: "/a-z" }]} />
      <h1 className="text-3xl font-semibold">A–Z index</h1>
      <ul className="flex flex-wrap gap-2">
        {["0-9", ...LETTERS].map((l) => (
          <li key={l}><Link href={`/a-z/${l}`} className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-white px-3 font-medium hover:border-ink">{l}</Link></li>
        ))}
      </ul>
    </div>
  );
}
