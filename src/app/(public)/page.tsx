import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductCard, SupplierCard } from "@/components/public/Cards";
import { ButtonLink } from "@/components/ui";
import { absoluteUrl, siteUrl } from "@/lib/seo";
import { getMenuTree, listFeaturedSuppliers, listProducts, listRecommendedProducts } from "@/modules/catalog";
import { listBanners } from "@/modules/cms";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Tarf — Source from verified manufacturers & suppliers" },
  description: "Find verified manufacturers, compare MOQ and prices, send inquiries and pay with escrow-protected Secured Trading.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [menu, banners, recommended, suppliers, secured] = await Promise.all([
    getMenuTree(),
    listBanners("HOME_HERO"),
    listRecommendedProducts(8),
    listFeaturedSuppliers(6),
    listProducts({ escrowOnly: true, pageSize: 4 }),
  ]);
  const [hero, ...rest] = banners;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Tarf",
          url: siteUrl(),
          potentialAction: { "@type": "SearchAction", target: `${absoluteUrl("/search")}?q={search_term_string}`, "query-input": "required name=search_term_string" },
        }}
      />
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element -- CMS-managed banner, host varies
          <img src={hero.imageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30" />
        )}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {hero?.title ?? "Source directly from verified manufacturers"}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-paper/80">Compare MOQs and prices, message suppliers, and pay with escrow-protected Secured Trading.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={hero?.linkUrl ?? "/categories"} size="lg" variant="accent">
              Browse categories
            </ButtonLink>
            <ButtonLink href="/register?as=supplier" size="lg" variant="inverse">
              Sell on Tarf
            </ButtonLink>
          </div>
        </div>
      </section>

      {rest.length > 0 && (
        <section aria-label="Promotions" className="mx-auto grid max-w-7xl gap-4 px-4 pt-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((b) => (
            <Link key={b.id} href={b.linkUrl ?? "/"} className="block overflow-hidden rounded-2xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- CMS-managed banner */}
              <img src={b.imageUrl} alt={b.title ?? ""} className="h-36 w-full object-cover" />
            </Link>
          ))}
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-12" aria-labelledby="cats">
        <div className="flex items-end justify-between">
          <h2 id="cats" className="text-2xl font-semibold">Browse by category</h2>
          <Link href="/categories" className="text-sm font-medium underline">All categories</Link>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {menu.slice(0, 12).map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-white p-4">
              <Link href={`/c/${c.path}`} className="font-medium hover:underline">{c.name}</Link>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{c.children.slice(0, 3).map((s) => s.name).join(", ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12" aria-labelledby="rec">
        <h2 id="rec" className="text-2xl font-semibold">Recommended products</h2>
        {recommended.length === 0 ? (
          <p className="mt-4 text-muted">Products from verified suppliers will appear here.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {recommended.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
          </div>
        )}
      </section>

      {secured.items.length > 0 && (
        <section className="mt-12 bg-sage/60 py-10" aria-labelledby="sec">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="sec" className="text-2xl font-semibold">Secured Trading</h2>
                <p className="text-sm text-ink-2">Pay into escrow. Funds release only when you confirm receipt.</p>
              </div>
              <Link href="/secured-trading" className="text-sm font-medium underline">See all</Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {secured.items.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-12" aria-labelledby="sup">
        <div className="flex items-end justify-between">
          <h2 id="sup" className="text-2xl font-semibold">Featured suppliers</h2>
          <Link href="/suppliers" className="text-sm font-medium underline">All suppliers</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => <SupplierCard key={s.id} s={s} />)}
        </div>
      </section>
    </>
  );
}
