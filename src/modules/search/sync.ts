// DB -> search index synchronisation. Handlers are idempotent: they always re-read current DB state.
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { searchProvider, type SearchDoc } from "@/lib/providers/search";
import { ancestorPaths, buildProductDoc, buildSupplierDoc, type ProductSource, type SupplierSource } from "./documents";
import { productSettings, supplierSettings } from "./settings";

const BATCH = 200;

const productInclude = {
  category: { select: { name: true, path: true } },
  company: { select: { id: true, slug: true, name: true, tier: true, audited: true, city: true, province: true, country: true, businessType: true, rd: true, status: true } },
  media: { where: { type: "IMAGE" }, orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
  certifications: { where: { state: "APPROVED" }, select: { name: true } },
  attributes: { include: { attribute: { select: { key: true, type: true, options: true } } } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const isVisible = (p: ProductRow): boolean => p.status === "LIVE" && p.company.status === "VERIFIED";

function toSource(p: ProductRow): ProductSource {
  return {
    id: p.id, slug: p.slug, title: p.title, summary: p.summary, keywords: p.keywords, currency: p.currency,
    priceMin: p.priceMin?.toString() ?? null, priceMax: p.priceMax?.toString() ?? null,
    moq: p.moq, moqUnit: p.moqUnit, supportsSample: p.supportsSample, supportsEscrow: p.supportsEscrow, hasVideo: p.hasVideo,
    ratingAvg: Number(p.ratingAvg), ratingCount: p.ratingCount, topTag: p.topTag, publishedAt: p.publishedAt,
    imageKey: p.media[0]?.url ?? null,
    category: p.category,
    certifications: p.certifications.map((c) => c.name),
    attributes: p.attributes.map((a) => ({
      key: a.attribute.key,
      type: a.attribute.type,
      text: a.valueText,
      number: a.valueNumber?.toString() ?? null,
      bool: a.valueBool,
      json: Array.isArray(a.valueJson) ? (a.valueJson as string[]) : null,
      optionLabels: Array.isArray(a.attribute.options)
        ? Object.fromEntries((a.attribute.options as Array<{ value: string; label: string }>).map((o) => [o.value, o.label]))
        : undefined,
    })),
    company: { id: p.company.id, slug: p.company.slug, name: p.company.name, tier: p.company.tier, audited: p.company.audited, city: p.company.city, province: p.company.province, country: p.company.country, businessType: p.company.businessType, rd: p.company.rd },
  };
}

/** Distinct filterable attribute keys across all categories (these become index filter fields). */
export async function filterableAttributeKeys(): Promise<string[]> {
  const rows = await prisma.attributeDefinition.findMany({ where: { isFilterable: true }, distinct: ["key"], select: { key: true } });
  return rows.map((r) => r.key).sort();
}

export async function configureIndexes(): Promise<void> {
  const sp = searchProvider();
  await sp.configure("products", productSettings(await filterableAttributeKeys()));
  await sp.configure("suppliers", supplierSettings());
}

/** Upsert visible products, remove everything else (hidden, unlisted, deleted). */
export async function syncProducts(ids: string[]): Promise<{ indexed: number; removed: number }> {
  const sp = searchProvider();
  let indexed = 0;
  let removed = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const rows = await prisma.product.findMany({ where: { id: { in: chunk } }, include: productInclude });
    const visible = rows.filter(isVisible);
    const visibleIds = new Set(visible.map((r) => r.id));
    const gone = chunk.filter((id) => !visibleIds.has(id));
    await sp.upsert("products", visible.map((r) => buildProductDoc(toSource(r)) as SearchDoc));
    await sp.remove("products", gone);
    indexed += visible.length;
    removed += gone.length;
  }
  return { indexed, removed };
}

/* ───────── Suppliers ───────── */

async function supplierSources(companyIds: string[]): Promise<SupplierSource[]> {
  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds }, status: "VERIFIED" },
    include: { supplierProfile: { select: { mainProducts: true } }, certifications: { where: { state: "APPROVED" }, select: { name: true } } },
  });
  if (!companies.length) return [];
  const ids = companies.map((c) => c.id);
  const grouped = await prisma.product.groupBy({
    by: ["companyId", "categoryId", "supportsEscrow"],
    where: { companyId: { in: ids }, status: "LIVE" },
    _count: { _all: true },
  });
  const categories = await prisma.category.findMany({ where: { id: { in: [...new Set(grouped.map((g) => g.categoryId))] } }, select: { id: true, path: true } });
  const pathById = new Map(categories.map((c) => [c.id, c.path]));

  return companies.map((c) => {
    const mine = grouped.filter((g) => g.companyId === c.id);
    return {
      id: c.id, slug: c.slug, name: c.name, logoKey: c.logoUrl, city: c.city, province: c.province, country: c.country,
      businessType: c.businessType, rd: c.rd, tier: c.tier, audited: c.audited, ratingAvg: Number(c.ratingAvg), ratingCount: c.ratingCount,
      yearFounded: c.yearFounded, productCount: mine.reduce((n, g) => n + g._count._all, 0),
      mainProducts: c.supplierProfile?.mainProducts ?? [],
      certifications: [...new Set(c.certifications.map((x) => x.name))],
      categoryPaths: [...new Set(mine.flatMap((g) => ancestorPaths(pathById.get(g.categoryId) ?? "")).filter(Boolean))],
      supportsEscrow: mine.some((g) => g.supportsEscrow),
    };
  });
}

/** Refresh only the supplier document(s); removes suppliers that are no longer VERIFIED. */
export async function syncSupplierDocs(companyIds: string[]): Promise<void> {
  const sp = searchProvider();
  const sources = await supplierSources(companyIds);
  const live = new Set(sources.map((s) => s.id));
  await sp.upsert("suppliers", sources.map((s) => buildSupplierDoc(s) as SearchDoc));
  await sp.remove("suppliers", companyIds.filter((id) => !live.has(id)));
}

/** Supplier changed (verified/rejected/tier/audit...): refresh its doc and all of its products. */
export async function syncCompany(companyId: string): Promise<void> {
  await syncSupplierDocs([companyId]);
  const products = await prisma.product.findMany({ where: { companyId }, select: { id: true } });
  await syncProducts(products.map((p) => p.id));
}

/* ───────── Full rebuild (zero-downtime swap) ───────── */

async function* productBatches(): AsyncGenerator<SearchDoc[]> {
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.product.findMany({
      where: { status: "LIVE", company: { status: "VERIFIED" } },
      include: productInclude,
      orderBy: { id: "asc" },
      take: 500,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (!rows.length) return;
    cursor = rows[rows.length - 1].id;
    yield rows.map((r) => buildProductDoc(toSource(r)) as SearchDoc);
  }
}

async function* supplierBatches(): AsyncGenerator<SearchDoc[]> {
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.company.findMany({ where: { status: "VERIFIED" }, select: { id: true }, orderBy: { id: "asc" }, take: BATCH, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
    if (!rows.length) return;
    cursor = rows[rows.length - 1].id;
    yield (await supplierSources(rows.map((r) => r.id))).map((s) => buildSupplierDoc(s) as SearchDoc);
  }
}

/** Rebuild both indexes from the database and swap them in atomically. Idempotent. */
export async function rebuildAll(): Promise<{ products: number; suppliers: number }> {
  const sp = searchProvider();
  const keys = await filterableAttributeKeys();
  const products = await sp.rebuild("products", productSettings(keys), productBatches());
  const suppliers = await sp.rebuild("suppliers", supplierSettings(), supplierBatches());
  return { products, suppliers };
}

/* ───────── Event handler (used by the worker) ───────── */

export async function handleSearchEvent(type: string, aggregateId: string): Promise<void> {
  if (type.startsWith("product.")) {
    await syncProducts([aggregateId]);
    const p = await prisma.product.findUnique({ where: { id: aggregateId }, select: { companyId: true } });
    if (p) await syncSupplierDocs([p.companyId]);
  } else if (type.startsWith("supplier.")) {
    await syncCompany(aggregateId);
  } else if (type === "attribute.changed") {
    await configureIndexes();
  }
}
