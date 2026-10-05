import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { ProductCard, TrustBadges } from "@/components/public/Cards";
import { ProductGallery } from "@/components/public/ProductGallery";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import { currencySymbol, formatMoq, formatPriceRange } from "@/lib/money";
import { absoluteUrl } from "@/lib/seo";
import { getProductPage } from "@/modules/catalog";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductPage(slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const price = formatPriceRange(p.currency, p.priceMin?.toString() ?? null, p.priceMax?.toString() ?? null);
  const description = (p.summary || p.description || `${p.title} from ${p.company.name}`).slice(0, 155);
  const image = p.media.find((m) => m.type === "IMAGE")?.url;
  return {
    title: `${p.title} - ${p.company.name}`,
    description: `${description}${price ? ` ${price}.` : ""}`.slice(0, 160),
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { type: "website", title: p.title, description, url: absoluteUrl(`/p/${p.slug}`), images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const p = await getProductPage(slug);
  if (!p) notFound();

  const price = formatPriceRange(p.currency, p.priceMin?.toString() ?? null, p.priceMax?.toString() ?? null);
  const segs = p.category.path.split("/");
  const crumbs = [
    { name: "Home", path: "/" },
    ...p.chain.map((c, i) => ({ name: c.name, path: `/c/${segs.slice(0, i + 1).join("/")}` })),
    { name: p.title, path: `/p/${p.slug}` },
  ];
  const images = p.media.filter((m) => m.type === "IMAGE").map((m) => m.url);
  const login = `/login?next=${encodeURIComponent(`/p/${p.slug}`)}`;

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.summary || p.description || undefined,
    image: images.length ? images : undefined,
    category: p.category.name,
    brand: { "@type": "Organization", name: p.company.name },
    ...(p.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(p.ratingAvg), reviewCount: p.ratingCount } } : {}),
    ...(p.priceMin
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: p.currency,
            lowPrice: p.priceMin.toString(),
            highPrice: (p.priceMax ?? p.priceMin).toString(),
            offerCount: Math.max(1, p.priceTiers.length),
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: p.company.name, url: absoluteUrl(`/s/${p.company.slug}`) },
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8">
      <JsonLd data={productLd} />
      <Breadcrumbs items={crumbs} />

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery media={p.media} title={p.title} />
        <div className="space-y-5">
          <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">{p.title}</h1>
          <div className="flex flex-wrap gap-2">
            {p.supportsEscrow && <Badge tone="success">Secured Trading</Badge>}
            {p.supportsSample && <Badge tone="info">Samples available</Badge>}
            {p.topTag && <Badge tone="warning">{p.topTag}</Badge>}
            {p.certifications.map((c) => <Badge key={c.id}>{c.name}</Badge>)}
          </div>

          <Card className="space-y-3">
            <p className="text-3xl font-semibold">{price ?? "Contact for price"}</p>
            {p.priceTiers.length > 0 && (
              <table className="w-full text-sm">
                <caption className="sr-only">Volume pricing</caption>
                <thead><tr className="text-left text-muted"><th className="pb-1 font-medium">Quantity</th><th className="pb-1 font-medium">Unit price</th></tr></thead>
                <tbody>
                  {p.priceTiers.map((t) => (
                    <tr key={t.id} className="border-t border-line">
                      <td className="py-1.5">{t.minQty.toLocaleString("en-US")}{t.maxQty ? ` – ${t.maxQty.toLocaleString("en-US")}` : "+"} {p.moqUnit}</td>
                      <td className="py-1.5 font-medium">{currencySymbol(p.currency)} {t.unitPrice.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted">Min. order</dt><dd>{formatMoq(p.moq, p.moqUnit)}</dd>
              {p.leadTimeDays !== null && (<><dt className="text-muted">Lead time</dt><dd>{p.leadTimeDays} days</dd></>)}
              {p.samplePrice && (<><dt className="text-muted">Sample price</dt><dd>{currencySymbol(p.currency)} {p.samplePrice.toString()}</dd></>)}
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
              <ButtonLink href={login} size="lg">Send inquiry</ButtonLink>
              {p.supportsEscrow && <ButtonLink href={login} variant="secondary" size="lg">Start order</ButtonLink>}
            </div>
          </Card>

          <Card className="space-y-2 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted">Supplier</p>
            <Link href={`/s/${p.company.slug}`} className="text-base font-medium hover:underline">{p.company.name}</Link>
            <TrustBadges tier={p.company.tier} audited={p.company.audited} />
            <p className="text-muted">
              {[p.company.city, p.company.province, p.company.country].filter(Boolean).join(", ")} · {BUSINESS_TYPE_LABEL[p.company.businessType]}
              {p.company.yearFounded ? ` · Since ${p.company.yearFounded}` : ""}
            </p>
            {p.company.responseTimeMins !== null && <p className="text-muted">Typically replies within {Math.max(1, Math.round(p.company.responseTimeMins / 60))} h</p>}
          </Card>
        </div>
      </div>

      {p.specs.length > 0 && (
        <section aria-labelledby="specs" className="space-y-3">
          <h2 id="specs" className="text-xl font-semibold">Specifications</h2>
          <dl className="grid gap-x-8 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
            {p.specs.map((s) => (
              <div key={s.label} className="flex gap-3 border-b border-line py-2 text-sm last:border-b-0">
                <dt className="w-40 shrink-0 text-muted">{s.label}</dt>
                <dd>{s.value}{s.unit ? ` ${s.unit}` : ""}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {p.description && (
        <section aria-labelledby="desc" className="space-y-3">
          <h2 id="desc" className="text-xl font-semibold">Description</h2>
          <p className="max-w-3xl whitespace-pre-line leading-relaxed text-ink-2">{p.description}</p>
        </section>
      )}

      {p.related.length > 0 && (
        <section aria-labelledby="related" className="space-y-4">
          <h2 id="related" className="text-xl font-semibold">Related products</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {p.related.slice(0, 4).map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
