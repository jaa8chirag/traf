// Pure document builders: DB-shaped input -> search documents. No I/O so they are unit-testable.
import { toUsd } from "../../lib/fx";

export const TIER_RANK = { FREE: 0, GOLD: 1, DIAMOND: 2 } as const;
type Tier = keyof typeof TIER_RANK;

export interface ProductSource {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  keywords: string[];
  currency: string;
  priceMin: string | null;
  priceMax: string | null;
  moq: number;
  moqUnit: string;
  supportsSample: boolean;
  supportsEscrow: boolean;
  hasVideo: boolean;
  ratingAvg: number;
  ratingCount: number;
  topTag: string | null;
  publishedAt: Date | null;
  imageKey: string | null;
  category: { name: string; path: string };
  certifications: string[];
  attributes: Array<{
    key: string;
    type: "TEXT" | "NUMBER" | "SELECT" | "MULTI_SELECT" | "BOOLEAN";
    text: string | null;
    number: string | null;
    bool: boolean | null;
    json: string[] | null;
    optionLabels?: Record<string, string>;
  }>;
  company: {
    id: string;
    slug: string;
    name: string;
    tier: Tier;
    audited: boolean;
    city: string | null;
    province: string | null;
    country: string;
    businessType: string;
    rd: string[];
  };
}

/** "a/b/c" -> ["a", "a/b", "a/b/c"]: filtering on any ancestor path returns the whole subtree. */
export function ancestorPaths(path: string): string[] {
  const parts = path.split("/");
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
}

export const attrField = (key: string): string => `attr_${key}`;

export function rankScore(tier: Tier, audited: boolean, ratingAvg: number, ratingCount: number): number {
  return TIER_RANK[tier] * 100 + (audited ? 40 : 0) + Math.round(ratingAvg * 8 * Math.min(1, ratingCount / 10));
}

export function buildProductDoc(p: ProductSource): Record<string, unknown> & { id: string } {
  const min = p.priceMin === null ? null : Number(p.priceMin);
  const max = p.priceMax === null ? min : Number(p.priceMax);
  const attrs: Record<string, unknown> = {};
  const specText: string[] = [];
  for (const a of p.attributes) {
    const f = attrField(a.key);
    if (a.type === "NUMBER" && a.number !== null) attrs[f] = Number(a.number);
    else if (a.type === "BOOLEAN" && a.bool !== null) attrs[f] = a.bool;
    else if (a.type === "SELECT" && a.text) {
      attrs[f] = a.text;
      specText.push(a.optionLabels?.[a.text] ?? a.text);
    } else if (a.type === "MULTI_SELECT" && a.json?.length) {
      attrs[f] = a.json;
      specText.push(...a.json.map((v) => a.optionLabels?.[v] ?? v));
    } else if (a.type === "TEXT" && a.text) specText.push(a.text);
  }
  const c = p.company;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary ?? "",
    keywords: p.keywords,
    specsText: specText.join(" "),
    categoryName: p.category.name,
    categoryPath: p.category.path,
    categoryPaths: ancestorPaths(p.category.path),
    supplierId: c.id,
    supplierSlug: c.slug,
    supplierName: c.name,
    businessType: c.businessType,
    rd: c.rd,
    tier: c.tier,
    audited: c.audited,
    city: c.city ?? "",
    province: c.province ?? "",
    country: c.country,
    currency: p.currency,
    priceMin: min,
    priceMax: max,
    priceMinUsd: min === null ? null : toUsd(min, p.currency),
    moq: p.moq,
    moqUnit: p.moqUnit,
    supportsSample: p.supportsSample,
    supportsEscrow: p.supportsEscrow,
    hasVideo: p.hasVideo,
    certifications: p.certifications,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    topTag: p.topTag,
    imageKey: p.imageKey,
    publishedAt: p.publishedAt ? Math.floor(p.publishedAt.getTime() / 1000) : 0,
    rankScore: rankScore(c.tier, c.audited, p.ratingAvg, p.ratingCount),
    ...attrs,
  };
}

export interface SupplierSource {
  id: string;
  slug: string;
  name: string;
  logoKey: string | null;
  city: string | null;
  province: string | null;
  country: string;
  businessType: string;
  rd: string[];
  tier: Tier;
  audited: boolean;
  ratingAvg: number;
  ratingCount: number;
  yearFounded: number | null;
  productCount: number;
  mainProducts: string[];
  certifications: string[];
  /** Union of ancestor paths of the categories of the supplier's live products. */
  categoryPaths: string[];
  supportsEscrow: boolean;
}

export function buildSupplierDoc(s: SupplierSource): Record<string, unknown> & { id: string } {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    logoKey: s.logoKey,
    city: s.city ?? "",
    province: s.province ?? "",
    country: s.country,
    businessType: s.businessType,
    rd: s.rd,
    tier: s.tier,
    audited: s.audited,
    ratingAvg: s.ratingAvg,
    ratingCount: s.ratingCount,
    yearFounded: s.yearFounded,
    productCount: s.productCount,
    mainProducts: s.mainProducts,
    certifications: s.certifications,
    categoryPaths: s.categoryPaths,
    supportsEscrow: s.supportsEscrow,
    rankScore: rankScore(s.tier, s.audited, s.ratingAvg, s.ratingCount),
  };
}
