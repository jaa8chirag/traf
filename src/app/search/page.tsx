import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { products } from "@/data/catalog";
import { PageHero } from "@/components/PageHero";
import { ShopBrowser } from "@/components/ShopBrowser";

export const metadata: Metadata = { title: "Search — Tarf" };

const suggestions = ["laptop stand", "charger", "lamp", "cable", "phone holder"];

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const raw = sp.q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = terms.length
    ? products.filter((p) => {
        const hay = `${p.name} ${p.tagline} ${p.category} ${p.kind}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
    : [];

  return (
    <>
      <PageHero eyebrow="Search" title={q ? <>Results for “{q}”</> : "What are you looking for?"} crumbs={[{ label: "Search" }]}>
        <form action="/search" role="search" className="flex items-center gap-2 max-w-xl bg-white border border-line focus-within:border-ink rounded-full pl-5 p-1.5">
          <Search size={20} className="text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Search products" aria-label="Search products" className="flex-1 h-11 bg-transparent outline-none" />
          <button className="h-11 px-6 rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors">Search</button>
        </form>
        <p className="mt-5 text-sm text-muted flex flex-wrap items-center gap-2">
          Try:
          {suggestions.map((s) => (
            <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="rounded-full border border-line bg-white px-3 py-1 text-ink hover:border-ink transition-colors">{s}</Link>
          ))}
        </p>
      </PageHero>
      {q ? (
        <ShopBrowser products={results} query={q} emptyHint="Check the spelling or try a broader word like “charger” or “stand”." />
      ) : (
        <div className="container-x py-16 text-muted">Type something above, or pick a suggestion to get started.</div>
      )}
    </>
  );
}
