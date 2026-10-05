import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { BUSINESS_TYPE_LABEL, TIER_LABEL } from "@/lib/labels";
import { formatMoq, formatPriceRange } from "@/lib/money";
import type { ProductCardData, SupplierCardData } from "@/modules/catalog";

export function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div aria-hidden className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sage to-sand text-3xl font-semibold text-ink/40">
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function TrustBadges({ tier, audited }: { tier: "FREE" | "GOLD" | "DIAMOND"; audited: boolean }) {
  const tierLabel = TIER_LABEL[tier];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone="success">Verified</Badge>
      {tierLabel && <Badge tone="accent">{tierLabel}</Badge>}
      {audited && <Badge tone="info">Audited</Badge>}
    </span>
  );
}

export function ProductCard({ p, priority = false }: { p: ProductCardData; priority?: boolean }) {
  const price = formatPriceRange(p.currency, p.priceMin, p.priceMax);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <Link href={`/p/${p.slug}`} className="relative block aspect-square overflow-hidden bg-paper-2" aria-label={p.title}>
        {p.imageUrl ? (
          <Image src={p.imageUrl} alt={p.title} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" className="object-cover transition-transform duration-300 group-hover:scale-105" priority={priority} />
        ) : (
          <ImagePlaceholder label={p.title} />
        )}
        {p.hasVideo && <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs text-paper">▶ Video</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          <Link href={`/p/${p.slug}`} className="hover:underline">{p.title}</Link>
        </h3>
        <p className="text-base font-semibold">{price ?? <span className="text-sm font-normal text-muted">Contact for price</span>}</p>
        <p className="text-xs text-muted">MOQ: {formatMoq(p.moq, p.moqUnit)}</p>
        {p.certifications.length > 0 && <p className="text-xs text-muted">{p.certifications.join(" · ")}</p>}
        {p.ratingCount > 0 && (
          <p className="text-xs">
            <span aria-hidden>★</span> {p.ratingAvg.toFixed(1)} <span className="text-muted">({p.ratingCount})</span>
            {p.topTag && <Badge className="ml-2" tone="warning">{p.topTag}</Badge>}
          </p>
        )}
        <div className="mt-auto space-y-1.5 border-t border-line pt-3 text-xs">
          <Link href={`/s/${p.supplier.slug}`} className="block truncate font-medium hover:underline">{p.supplier.name}</Link>
          <TrustBadges tier={p.supplier.tier} audited={p.supplier.audited} />
          <p className="truncate text-muted">{p.supplier.location} · {BUSINESS_TYPE_LABEL[p.supplier.businessType]}</p>
        </div>
        <Link
          href={`/login?next=${encodeURIComponent(`/p/${p.slug}`)}`}
          className="mt-1 inline-flex h-9 items-center justify-center rounded-full border border-ink text-sm font-medium hover:bg-ink hover:text-paper"
        >
          Send inquiry
        </Link>
      </div>
    </article>
  );
}

export function SupplierCard({ s }: { s: SupplierCardData }) {
  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-white p-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-paper-2">
        {s.logoUrl ? <Image src={s.logoUrl} alt="" fill sizes="64px" className="object-contain" /> : <ImagePlaceholder label={s.name} />}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 text-sm">
        <h3 className="truncate text-base font-medium">
          <Link href={`/s/${s.slug}`} className="hover:underline">{s.name}</Link>
        </h3>
        <TrustBadges tier={s.tier} audited={s.audited} />
        <p className="text-xs text-muted">{BUSINESS_TYPE_LABEL[s.businessType]}{s.rd.length ? ` · ${s.rd.join("/")}` : ""} · {s.location}</p>
        <p className="text-xs">{s.productCount} product{s.productCount === 1 ? "" : "s"}{s.ratingCount > 0 ? ` · ★ ${s.ratingAvg.toFixed(1)} (${s.ratingCount})` : ""}</p>
      </div>
    </article>
  );
}
