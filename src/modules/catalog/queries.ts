// Public read API for the storefront. All listings are served from Postgres for now;
// CP-4 swaps `listProducts`/`listSuppliers` onto the search index behind the same shapes.
import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/providers/storage";
import { getCategoryChain } from "./categories";

/** A product is public only when it is LIVE and its supplier is VERIFIED. */
export const visibleProduct = { status: "LIVE", company: { status: "VERIFIED" } } satisfies Prisma.ProductWhereInput;

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  hasVideo: boolean;
  currency: string;
  priceMin: string | null;
  priceMax: string | null;
  moq: number;
  moqUnit: string;
  supportsSample: boolean;
  supportsEscrow: boolean;
  ratingAvg: number;
  ratingCount: number;
  topTag: string | null;
  certifications: string[];
  category: { name: string; path: string };
  supplier: {
    name: string;
    slug: string;
    tier: "FREE" | "GOLD" | "DIAMOND";
    audited: boolean;
    location: string;
    businessType: string;
  };
}

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  hasVideo: true,
  currency: true,
  priceMin: true,
  priceMax: true,
  moq: true,
  moqUnit: true,
  supportsSample: true,
  supportsEscrow: true,
  ratingAvg: true,
  ratingCount: true,
  topTag: true,
  media: { where: { type: "IMAGE" }, orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
  certifications: { where: { state: "APPROVED" }, take: 3, select: { name: true } },
  category: { select: { name: true, path: true } },
  company: { select: { name: true, slug: true, tier: true, audited: true, city: true, province: true, country: true, businessType: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export const locationOf = (c: { city: string | null; province: string | null; country: string }): string =>
  [c.city, c.province, c.country].filter(Boolean).join(", ");

function toCard(p: CardRow): ProductCardData {
  const img = p.media[0]?.url;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    imageUrl: img ? storage().publicUrl(img) : null,
    hasVideo: p.hasVideo,
    currency: p.currency,
    priceMin: p.priceMin?.toString() ?? null,
    priceMax: p.priceMax?.toString() ?? null,
    moq: p.moq,
    moqUnit: p.moqUnit,
    supportsSample: p.supportsSample,
    supportsEscrow: p.supportsEscrow,
    ratingAvg: Number(p.ratingAvg),
    ratingCount: p.ratingCount,
    topTag: p.topTag,
    certifications: p.certifications.map((c) => c.name),
    category: p.category,
    supplier: {
      name: p.company.name,
      slug: p.company.slug,
      tier: p.company.tier,
      audited: p.company.audited,
      location: locationOf(p.company),
      businessType: p.company.businessType,
    },
  };
}

/* ───────── Menu & categories ───────── */

export interface MenuCategory {
  id: string;
  name: string;
  path: string;
  children: Array<{ id: string; name: string; path: string }>;
}

/** L1 categories with their L2 children, for the mega-menu and directory. Deduped per request. */
export const getMenuTree = cache(async (): Promise<MenuCategory[]> => {
  const roots = await prisma.category.findMany({
    where: { level: 1, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      path: true,
      children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, path: true } },
    },
  });
  return roots;
});

export async function getCategoryPage(path: string) {
  const category = await prisma.category.findFirst({
    where: { path, isActive: true },
    select: {
      id: true, name: true, path: true, level: true, isLeaf: true, seoTitle: true, seoDesc: true,
      children: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, path: true, isLeaf: true } },
    },
  });
  if (!category) return null;
  return { ...category, chain: await getCategoryChain(category.id) };
}

/* ───────── Products ───────── */

export type ProductSort = "recommended" | "newest";

export interface ListProductsArgs {
  categoryPath?: string;
  companyId?: string;
  q?: string;
  escrowOnly?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listProducts(args: ListProductsArgs = {}): Promise<Paged<ProductCardData>> {
  const pageSize = Math.min(args.pageSize ?? 24, 60);
  const page = Math.max(1, args.page ?? 1);
  const q = args.q?.trim();
  const where: Prisma.ProductWhereInput = {
    ...visibleProduct,
    ...(args.companyId ? { companyId: args.companyId } : {}),
    ...(args.escrowOnly ? { supportsEscrow: true } : {}),
    ...(args.categoryPath ? { category: { OR: [{ path: args.categoryPath }, { path: { startsWith: `${args.categoryPath}/` } }] } } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { keywords: { has: q.toLowerCase() } }] } : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    args.sort === "newest"
      ? [{ publishedAt: "desc" }, { id: "asc" }]
      : [{ company: { tier: "desc" } }, { company: { audited: "desc" } }, { publishedAt: "desc" }, { id: "asc" }];

  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, select: cardSelect }),
    prisma.product.count({ where }),
  ]);
  return { items: rows.map(toCard), total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listRecommendedProducts(limit = 8): Promise<ProductCardData[]> {
  return (await listProducts({ pageSize: limit })).items;
}

export async function getProductPage(slug: string) {
  const p = await prisma.product.findFirst({
    where: { slug, ...visibleProduct },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      priceTiers: { orderBy: { minQty: "asc" } },
      attributes: { include: { attribute: { select: { label: true, unit: true, sortOrder: true } } } },
      certifications: { where: { state: "APPROVED" } },
      category: { select: { id: true, name: true, path: true } },
      company: {
        select: {
          id: true, name: true, slug: true, tier: true, audited: true, city: true, province: true, country: true,
          businessType: true, rd: true, yearFounded: true, ratingAvg: true, ratingCount: true, responseRate: true, responseTimeMins: true, logoUrl: true,
        },
      },
    },
  });
  if (!p) return null;

  const [chain, related] = await Promise.all([
    getCategoryChain(p.category.id),
    prisma.product.findMany({
      where: { ...visibleProduct, categoryId: p.categoryId, id: { not: p.id } },
      orderBy: [{ company: { tier: "desc" } }, { publishedAt: "desc" }],
      take: 8,
      select: cardSelect,
    }),
  ]);

  const specs = p.attributes
    .sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder)
    .map((a) => ({
      label: a.attribute.label,
      unit: a.attribute.unit,
      value: Array.isArray(a.valueJson) ? (a.valueJson as string[]).join(", ") : a.valueBool !== null ? (a.valueBool ? "Yes" : "No") : (a.valueNumber?.toString() ?? a.valueText ?? ""),
    }))
    .filter((s) => s.value !== "");

  return {
    ...p,
    media: p.media.map((m) => ({ id: m.id, type: m.type, url: storage().publicUrl(m.url), alt: m.alt })),
    specs,
    chain,
    related: related.map(toCard),
    company: { ...p.company, logoUrl: p.company.logoUrl ? storage().publicUrl(p.company.logoUrl) : null, ratingAvg: Number(p.company.ratingAvg), responseRate: Number(p.company.responseRate) },
  };
}

/* ───────── Suppliers ───────── */

export interface SupplierCardData {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  location: string;
  businessType: string;
  rd: string[];
  tier: "FREE" | "GOLD" | "DIAMOND";
  audited: boolean;
  ratingAvg: number;
  ratingCount: number;
  productCount: number;
  mainProducts: string[];
}

const supplierSelect = {
  id: true, slug: true, name: true, logoUrl: true, city: true, province: true, country: true, businessType: true, rd: true,
  tier: true, audited: true, ratingAvg: true, ratingCount: true,
  supplierProfile: { select: { mainProducts: true } },
  _count: { select: { products: { where: { status: "LIVE" } } } },
} satisfies Prisma.CompanySelect;

function toSupplierCard(c: Prisma.CompanyGetPayload<{ select: typeof supplierSelect }>): SupplierCardData {
  return {
    id: c.id, slug: c.slug, name: c.name, logoUrl: c.logoUrl ? storage().publicUrl(c.logoUrl) : null,
    location: locationOf(c), businessType: c.businessType, rd: c.rd, tier: c.tier, audited: c.audited,
    ratingAvg: Number(c.ratingAvg), ratingCount: c.ratingCount, productCount: c._count.products,
    mainProducts: c.supplierProfile?.mainProducts ?? [],
  };
}

export async function listSuppliers(args: { page?: number; pageSize?: number; q?: string; letter?: string } = {}): Promise<Paged<SupplierCardData>> {
  const pageSize = Math.min(args.pageSize ?? 24, 60);
  const page = Math.max(1, args.page ?? 1);
  const q = args.q?.trim();
  const where: Prisma.CompanyWhereInput = {
    status: "VERIFIED",
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(args.letter ? letterFilter(args.letter) : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.company.findMany({ where, orderBy: [{ tier: "desc" }, { audited: "desc" }, { name: "asc" }], skip: (page - 1) * pageSize, take: pageSize, select: supplierSelect }),
    prisma.company.count({ where }),
  ]);
  return { items: rows.map(toSupplierCard), total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listFeaturedSuppliers(limit = 6): Promise<SupplierCardData[]> {
  return (await listSuppliers({ pageSize: limit })).items;
}

export async function getSupplierPage(slug: string) {
  const c = await prisma.company.findFirst({
    where: { slug, status: "VERIFIED" },
    select: { ...supplierSelect, description: true, yearFounded: true, employeeBand: true, website: true, address: true, verifiedAt: true,
      badges: { select: { badge: { select: { key: true, label: true } } } } },
  });
  if (!c) return null;
  return { ...toSupplierCard(c), description: c.description, yearFounded: c.yearFounded, employeeBand: c.employeeBand, badges: c.badges.map((b) => b.badge) };
}

/* ───────── A–Z ───────── */

export const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"] as const;

/** "0-9" matches names starting with a digit; a single letter matches case-insensitively. */
function letterFilter(letter: string): { name: Prisma.StringFilter } | { OR: Array<{ name: Prisma.StringFilter }> } {
  if (letter === "0-9") return { OR: [..."0123456789"].map((d) => ({ name: { startsWith: d } })) };
  return { name: { startsWith: letter, mode: "insensitive" } };
}

export function normalizeLetter(raw: string): string | null {
  const l = raw.toUpperCase();
  return l === "0-9" || (l.length === 1 && l >= "A" && l <= "Z") ? l : null;
}

export async function listCategoriesByLetter(letter: string) {
  return prisma.category.findMany({
    where: { isActive: true, ...letterFilter(letter) },
    orderBy: { name: "asc" },
    select: { name: true, path: true, level: true },
    take: 500,
  });
}

/* ───────── Sitemap ───────── */

export const SITEMAP_PAGE = 5000;

export async function sitemapCounts() {
  const [products, suppliers] = await Promise.all([
    prisma.product.count({ where: visibleProduct }),
    prisma.company.count({ where: { status: "VERIFIED" } }),
  ]);
  return { products, suppliers };
}

/** Shard layout shared by sitemap.ts and robots.ts: id 0 = site pages, then product shards, then supplier shards. */
export async function sitemapShards(): Promise<{ productShards: number; supplierShards: number; total: number }> {
  const { products, suppliers } = await sitemapCounts();
  const productShards = Math.max(1, Math.ceil(products / SITEMAP_PAGE));
  const supplierShards = Math.max(1, Math.ceil(suppliers / SITEMAP_PAGE));
  return { productShards, supplierShards, total: 1 + productShards + supplierShards };
}

export async function sitemapCategories() {
  return prisma.category.findMany({ where: { isActive: true }, select: { path: true } });
}
export async function sitemapSuppliers(page: number) {
  return prisma.company.findMany({ where: { status: "VERIFIED" }, orderBy: { id: "asc" }, skip: page * SITEMAP_PAGE, take: SITEMAP_PAGE, select: { slug: true, updatedAt: true } });
}
export async function sitemapProducts(page: number) {
  return prisma.product.findMany({ where: visibleProduct, orderBy: { id: "asc" }, skip: page * SITEMAP_PAGE, take: SITEMAP_PAGE, select: { slug: true, updatedAt: true } });
}
