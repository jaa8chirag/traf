import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { ProductCard, TrustBadges } from "@/components/public/Cards";
import { JsonLd } from "@/components/seo/JsonLd";
import { EmptyState, Pagination } from "@/components/ui";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import { absoluteUrl } from "@/lib/seo";
import { getSupplierPage, listProducts } from "@/modules/catalog";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const s = await getSupplierPage((await params).slug);
  if (!s) return { title: "Supplier not found", robots: { index: false } };
  return {
    title: `${s.name} - ${BUSINESS_TYPE_LABEL[s.businessType]} in ${s.location}`,
    description: (s.description ?? `${s.name} on Tarf: verified ${BUSINESS_TYPE_LABEL[s.businessType].toLowerCase()}.`).slice(0, 160),
    alternates: { canonical: `/s/${s.slug}` },
  };
}

// Minimal showroom home; CP-5 adds templates, groups, audit report, reviews and contact.
export default async function ShowroomHome({ params, searchParams }: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);
  const s = await getSupplierPage(slug);
  if (!s) notFound();
  const products = await listProducts({ companyId: s.id, page });
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: s.name,
          url: absoluteUrl(`/s/${s.slug}`),
          logo: s.logoUrl ?? undefined,
          description: s.description ?? undefined,
          foundingDate: s.yearFounded ? String(s.yearFounded) : undefined,
          address: { "@type": "PostalAddress", addressLocality: s.location },
        }}
      />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Suppliers", path: "/suppliers" }, { name: s.name, path: `/s/${s.slug}` }]} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{s.name}</h1>
        <TrustBadges tier={s.tier} audited={s.audited} />
        <p className="text-sm text-muted">{BUSINESS_TYPE_LABEL[s.businessType]} · {s.location}{s.yearFounded ? ` · Since ${s.yearFounded}` : ""}</p>
        {s.description && <p className="max-w-3xl pt-2 text-ink-2">{s.description}</p>}
      </header>
      <section aria-labelledby="prods" className="space-y-4">
        <h2 id="prods" className="text-xl font-semibold">Products ({products.total})</h2>
        {products.items.length === 0 ? <EmptyState title="No products listed yet" /> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
        <Pagination page={products.page} pageCount={products.pageCount} hrefFor={(n) => `/s/${s.slug}${n > 1 ? `?page=${n}` : ""}`} />
      </section>
    </div>
  );
}
