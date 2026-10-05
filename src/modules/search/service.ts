import "server-only";
import { prisma } from "@/lib/db";
import { searchProvider, type SearchDoc, type SearchQuery, type SearchResult } from "@/lib/providers/search";
import { storage } from "@/lib/providers/storage";
import { BUSINESS_TYPE_LABEL } from "@/lib/labels";
import { getEffectiveAttributes, listProducts, listSuppliers, type ProductCardData, type SupplierCardData } from "@/modules/catalog";
import { attrField } from "./documents";
import { PAGE_SIZE, buildFilters, sortFor, type FacetGroup, type MultiGroup, type SearchParams } from "./query";
import { PRODUCT_FACET_FIELDS, SUPPLIER_FACET_FIELDS } from "./settings";

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface FacetBlock {
  id: string;
  label: string;
  /** How a click is applied by the UI. */
  group: MultiGroup | "audited" | "sample" | `attr:${string}`;
  options: FacetOption[];
}

export interface SearchOutcome {
  tab: SearchParams["tab"];
  products: ProductCardData[];
  suppliers: SupplierCardData[];
  total: number;
  page: number;
  pageCount: number;
  facets: FacetBlock[];
  subcategories: Array<{ path: string; name: string; count: number }>;
  tabCounts: { products: number; suppliers: number; secured: number };
  /** True when the search engine was unreachable and a reduced Postgres search answered. */
  degraded: boolean;
  processingMs: number;
}

const TIER_LABEL: Record<string, string> = { FREE: "Free member", GOLD: "Gold", DIAMOND: "Diamond" };
const RD_LABEL: Record<string, string> = { OEM: "OEM", ODM: "ODM", OWN_BRAND: "Own brand" };

const MULTI_FIELD: Record<MultiGroup, string> = { biz: "businessType", rd: "rd", tier: "tier", loc: "province", cert: "certifications" };

function cardFromDoc(d: SearchDoc): ProductCardData {
  const s = (k: string) => String(d[k] ?? "");
  const n = (k: string) => Number(d[k] ?? 0);
  const price = (k: string) => (d[k] === null || d[k] === undefined ? null : String(d[k]));
  return {
    id: d.id, slug: s("slug"), title: s("title"), summary: s("summary") || null,
    imageUrl: d.imageKey ? storage().publicUrl(String(d.imageKey)) : null,
    hasVideo: Boolean(d.hasVideo), currency: s("currency"), priceMin: price("priceMin"), priceMax: price("priceMax"),
    moq: n("moq"), moqUnit: s("moqUnit"), supportsSample: Boolean(d.supportsSample), supportsEscrow: Boolean(d.supportsEscrow),
    ratingAvg: n("ratingAvg"), ratingCount: n("ratingCount"), topTag: s("topTag") || null,
    certifications: (d.certifications as string[] | undefined)?.slice(0, 3) ?? [],
    category: { name: s("categoryName"), path: s("categoryPath") },
    supplier: {
      name: s("supplierName"), slug: s("supplierSlug"), tier: s("tier") as ProductCardData["supplier"]["tier"], audited: Boolean(d.audited),
      location: [s("city"), s("province"), s("country")].filter(Boolean).join(", "), businessType: s("businessType"),
    },
  };
}

function supplierFromDoc(d: SearchDoc): SupplierCardData {
  const s = (k: string) => String(d[k] ?? "");
  return {
    id: d.id, slug: s("slug"), name: s("name"), logoUrl: d.logoKey ? storage().publicUrl(String(d.logoKey)) : null,
    location: [s("city"), s("province"), s("country")].filter(Boolean).join(", "), businessType: s("businessType"),
    rd: (d.rd as string[] | undefined) ?? [], tier: s("tier") as SupplierCardData["tier"], audited: Boolean(d.audited),
    ratingAvg: Number(d.ratingAvg ?? 0), ratingCount: Number(d.ratingCount ?? 0), productCount: Number(d.productCount ?? 0),
    mainProducts: (d.mainProducts as string[] | undefined) ?? [],
  };
}

const toOptions = (counts: Record<string, number> | undefined, selected: string[], label: (v: string) => string): FacetOption[] =>
  Object.entries(counts ?? {})
    .map(([value, count]) => ({ value, label: label(value), count, selected: selected.includes(value) }))
    .concat(selected.filter((v) => !(counts && v in counts)).map((v) => ({ value: v, label: label(v), count: 0, selected: true })))
    .sort((a, b) => Number(b.selected) - Number(a.selected) || b.count - a.count || a.label.localeCompare(b.label));

async function runEngine(p: SearchParams): Promise<Omit<SearchOutcome, "degraded">> {
  const sp = searchProvider();
  const index = p.tab === "suppliers" ? "suppliers" : "products";
  const isProducts = index === "products";

  // Dynamic attribute facets only make sense once a category narrows the schema.
  const attrDefs = isProducts && p.cat ? (await getCategoryAttrs(p.cat)) : [];
  const facetFields = [...(isProducts ? PRODUCT_FACET_FIELDS : SUPPLIER_FACET_FIELDS), ...attrDefs.map((d) => attrField(d.key))];

  const base = { q: p.q, sort: sortFor(p) };
  const main: SearchQuery = { ...base, filter: buildFilters(p), facets: facetFields, page: p.page, pageSize: PAGE_SIZE };

  // Disjunctive facets: a group that has a selection is counted WITHOUT its own filter, so users still see alternatives.
  const disjunctive: Array<{ group: FacetGroup; field: string }> = [];
  for (const g of Object.keys(MULTI_FIELD) as MultiGroup[]) if (p[g].length) disjunctive.push({ group: g, field: MULTI_FIELD[g] });
  if (p.audited) disjunctive.push({ group: "audited", field: "audited" });
  if (isProducts && p.sample) disjunctive.push({ group: "sample", field: "supportsSample" });
  if (isProducts) for (const key of Object.keys(p.attrs)) if (attrDefs.some((d) => d.key === key)) disjunctive.push({ group: `attr:${key}`, field: attrField(key) });

  const extras: SearchQuery[] = disjunctive.map((d) => ({ ...base, filter: buildFilters(p, d.group), facets: [d.field], page: 1, pageSize: 0 }));
  const tabBase: Omit<SearchQuery, "filter"> = { q: p.q, sort: [], facets: [], page: 1, pageSize: 0 };
  const catFilter = p.cat ? [{ field: "categoryPaths", in: [p.cat] }] : [];
  const [results, tabProducts, tabSuppliers, tabSecured] = await Promise.all([
    sp.multiQuery(index, [main, ...extras]),
    sp.query("products", { ...tabBase, filter: catFilter }),
    sp.query("suppliers", { ...tabBase, filter: catFilter }),
    sp.query("products", { ...tabBase, filter: [...catFilter, { field: "supportsEscrow", in: [true] }] }),
  ]);
  const [mainRes, ...extraRes] = results;
  const facets: SearchResult["facets"] = { ...mainRes.facets };
  disjunctive.forEach((d, i) => {
    facets[d.field] = extraRes[i].facets[d.field] ?? {};
  });

  return {
    tab: p.tab,
    products: isProducts ? mainRes.hits.map(cardFromDoc) : [],
    suppliers: isProducts ? [] : mainRes.hits.map(supplierFromDoc),
    total: mainRes.total,
    page: p.page,
    pageCount: Math.max(1, Math.ceil(mainRes.total / PAGE_SIZE)),
    facets: await buildFacetBlocks(p, facets, attrDefs, isProducts),
    subcategories: await subcategories(p, facets["categoryPaths"] ?? {}),
    tabCounts: { products: tabProducts.total, suppliers: tabSuppliers.total, secured: tabSecured.total },
    processingMs: mainRes.processingMs,
  };
}

async function getCategoryAttrs(catPath: string) {
  const cat = await prisma.category.findUnique({ where: { path: catPath }, select: { id: true } });
  if (!cat) return [];
  return (await getEffectiveAttributes(cat.id)).filter((d) => d.isFilterable);
}

async function buildFacetBlocks(
  p: SearchParams,
  f: SearchResult["facets"],
  attrDefs: Awaited<ReturnType<typeof getCategoryAttrs>>,
  isProducts: boolean,
): Promise<FacetBlock[]> {
  const blocks: FacetBlock[] = [
    { id: "biz", label: "Business type", group: "biz", options: toOptions(f["businessType"], p.biz, (v) => BUSINESS_TYPE_LABEL[v] ?? v) },
    { id: "rd", label: "R&D capability", group: "rd", options: toOptions(f["rd"], p.rd, (v) => RD_LABEL[v] ?? v) },
    { id: "tier", label: "Member level", group: "tier", options: toOptions(f["tier"], p.tier, (v) => TIER_LABEL[v] ?? v) },
    { id: "loc", label: "Location", group: "loc", options: toOptions(f["province"], p.loc, (v) => v).filter((o) => o.value) },
    { id: "cert", label: "Certifications", group: "cert", options: toOptions(f["certifications"], p.cert, (v) => v) },
  ];
  const audited = f["audited"]?.["true"] ?? 0;
  blocks.push({ id: "audited", label: "Audited suppliers", group: "audited", options: [{ value: "1", label: "Audited only", count: audited, selected: p.audited }] });
  if (isProducts) {
    const sample = f["supportsSample"]?.["true"] ?? 0;
    blocks.push({ id: "sample", label: "Samples", group: "sample", options: [{ value: "1", label: "Sample available", count: sample, selected: p.sample }] });
    for (const d of attrDefs) {
      const labelOf = (v: string) => d.options?.find((o) => o.value === v)?.label ?? (v === "true" ? "Yes" : v === "false" ? "No" : d.unit ? `${v} ${d.unit}` : v);
      blocks.push({ id: `attr.${d.key}`, label: d.label, group: `attr:${d.key}`, options: toOptions(f[attrField(d.key)], p.attrs[d.key] ?? [], labelOf) });
    }
  }
  // Hide empty facet groups (but never a group the user has selected something in).
  return blocks.filter((b) => b.options.some((o) => o.count > 0 || o.selected));
}

async function subcategories(p: SearchParams, counts: Record<string, number>): Promise<SearchOutcome["subcategories"]> {
  const depth = (p.cat ? p.cat.split("/").length : 0) + 1;
  const prefix = p.cat ? `${p.cat}/` : "";
  const direct = Object.entries(counts).filter(([path]) => path.startsWith(prefix) && path.split("/").length === depth);
  if (!direct.length) return [];
  const rows = await prisma.category.findMany({ where: { path: { in: direct.map(([path]) => path) } }, select: { path: true, name: true } });
  const names = new Map(rows.map((r) => [r.path, r.name]));
  return direct.map(([path, count]) => ({ path, name: names.get(path) ?? path, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 40);
}

/** Reduced Postgres search used only when the engine is down: query + category + tab, no facets. */
async function fallback(p: SearchParams): Promise<SearchOutcome> {
  const empty: Pick<SearchOutcome, "facets" | "subcategories" | "tabCounts" | "degraded" | "processingMs"> = {
    facets: [], subcategories: [], tabCounts: { products: 0, suppliers: 0, secured: 0 }, degraded: true, processingMs: 0,
  };
  if (p.tab === "suppliers") {
    const r = await listSuppliers({ page: p.page, q: p.q || undefined, pageSize: PAGE_SIZE });
    return { ...empty, tab: p.tab, products: [], suppliers: r.items, total: r.total, page: r.page, pageCount: r.pageCount };
  }
  const r = await listProducts({ page: p.page, q: p.q || undefined, categoryPath: p.cat ?? undefined, escrowOnly: p.tab === "secured", pageSize: PAGE_SIZE });
  return { ...empty, tab: p.tab, products: r.items, suppliers: [], total: r.total, page: r.page, pageCount: r.pageCount };
}

export async function runSearch(p: SearchParams): Promise<SearchOutcome> {
  try {
    return { ...(await runEngine(p)), degraded: false };
  } catch (e) {
    console.error("[search] engine unavailable, falling back to Postgres:", e instanceof Error ? e.message : e);
    return fallback(p);
  }
}
