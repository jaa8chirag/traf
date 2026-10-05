// Pure search-state model: URL <-> SearchParams, filter building, indexability. No I/O.
import type { FilterClause } from "../../lib/providers/search/types";
import { attrField } from "./documents";

export const TABS = ["products", "suppliers", "secured"] as const;
export type Tab = (typeof TABS)[number];

export const SORTS = ["relevance", "newest", "price_asc", "price_desc", "moq_asc"] as const;
export type SortKey = (typeof SORTS)[number];

export const BUSINESS_TYPES = ["MANUFACTURER", "TRADING_COMPANY", "GROUP_CORP", "OTHER"] as const;
export const RD_VALUES = ["OEM", "ODM", "OWN_BRAND"] as const;
export const TIERS = ["FREE", "GOLD", "DIAMOND"] as const;

export const PAGE_SIZE = 24;
const MAX_PAGE = 500;
const MAX_MULTI = 10;

export interface SearchParams {
  tab: Tab;
  q: string;
  cat: string | null;
  sort: SortKey;
  page: number;
  biz: string[];
  rd: string[];
  tier: string[];
  loc: string[];
  cert: string[];
  audited: boolean;
  sample: boolean;
  moqMax: number | null;
  priceMin: number | null;
  priceMax: number | null;
  /** Dynamic per-category attribute filters, keyed by attribute key. */
  attrs: Record<string, string[]>;
}

export const DEFAULT_PARAMS: SearchParams = {
  tab: "products", q: "", cat: null, sort: "relevance", page: 1,
  biz: [], rd: [], tier: [], loc: [], cert: [], audited: false, sample: false,
  moqMax: null, priceMin: null, priceMax: null, attrs: {},
};

type Raw = Record<string, string | string[] | undefined>;

const many = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const uniqSorted = (xs: string[]): string[] => [...new Set(xs)].sort().slice(0, MAX_MULTI);
const pickEnum = (xs: string[], allowed: readonly string[]): string[] => uniqSorted(xs.filter((x) => allowed.includes(x)));
const freeText = (xs: string[]): string[] => uniqSorted(xs.map((x) => x.trim()).filter((x) => x.length > 0 && x.length <= 60));
const num = (v: string | string[] | undefined): number | null => {
  const s = many(v)[0];
  if (s === undefined || s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 1e12 ? n : null;
};
const CAT_RE = /^[a-z0-9-]+(\/[a-z0-9-]+){0,3}$/;
const ATTR_KEY_RE = /^[a-z][a-z0-9_]{1,39}$/;

/** Parse untrusted URL params into a normalised, bounded SearchParams. Unknown params are dropped. */
export function parseSearchParams(raw: Raw, forced: Partial<SearchParams> = {}): SearchParams {
  const tab = many(raw.tab)[0];
  const sort = many(raw.sort)[0];
  const cat = many(raw.cat)[0];
  const attrs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k.startsWith("attr.")) continue;
    const key = k.slice(5);
    const values = freeText(many(v));
    if (ATTR_KEY_RE.test(key) && values.length) attrs[key] = values;
    if (Object.keys(attrs).length >= 10) break;
  }
  const page = Math.floor(Number(many(raw.page)[0]));
  const parsed: SearchParams = {
    tab: (TABS as readonly string[]).includes(tab ?? "") ? (tab as Tab) : "products",
    q: (many(raw.q)[0] ?? "").trim().replace(/\s+/g, " ").slice(0, 100),
    cat: cat && CAT_RE.test(cat) ? cat : null,
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as SortKey) : "relevance",
    page: Number.isFinite(page) ? Math.min(MAX_PAGE, Math.max(1, page)) : 1,
    biz: pickEnum(many(raw.biz), BUSINESS_TYPES),
    rd: pickEnum(many(raw.rd), RD_VALUES),
    tier: pickEnum(many(raw.tier), TIERS),
    loc: freeText(many(raw.loc)),
    cert: freeText(many(raw.cert)),
    audited: many(raw.audited)[0] === "1",
    sample: many(raw.sample)[0] === "1",
    moqMax: num(raw.moqMax),
    priceMin: num(raw.priceMin),
    priceMax: num(raw.priceMax),
    attrs,
  };
  return { ...parsed, ...forced };
}

/**
 * Canonical query string (no leading "?"): fixed key order, sorted multi-values, defaults omitted.
 * `omit` removes keys that live elsewhere in the URL (e.g. `cat` on /c/... pages).
 */
export function buildQuery(p: SearchParams, omit: ReadonlyArray<keyof SearchParams> = []): string {
  const u = new URLSearchParams();
  const skip = new Set<string>(omit);
  const add = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && v !== "" && !skip.has(k)) u.append(k, String(v));
  };
  add("q", p.q);
  if (p.tab !== "products") add("tab", p.tab);
  add("cat", p.cat);
  for (const k of ["biz", "rd", "tier", "loc", "cert"] as const) if (!skip.has(k)) for (const v of [...p[k]].sort()) u.append(k, v);
  if (p.audited) add("audited", "1");
  if (p.sample) add("sample", "1");
  add("moqMax", p.moqMax);
  add("priceMin", p.priceMin);
  add("priceMax", p.priceMax);
  for (const key of Object.keys(p.attrs).sort()) for (const v of [...p.attrs[key]].sort()) u.append(`attr.${key}`, v);
  if (p.sort !== "relevance") add("sort", p.sort);
  if (p.page > 1) add("page", p.page);
  return u.toString();
}

/* ───────── Toggling helpers used by facet links ───────── */

export type MultiGroup = "biz" | "rd" | "tier" | "loc" | "cert";

export function toggleMulti(p: SearchParams, group: MultiGroup, value: string): SearchParams {
  const has = p[group].includes(value);
  return { ...p, page: 1, [group]: has ? p[group].filter((v) => v !== value) : [...p[group], value] };
}

export function toggleAttr(p: SearchParams, key: string, value: string): SearchParams {
  const cur = p.attrs[key] ?? [];
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  const attrs = { ...p.attrs };
  if (next.length) attrs[key] = next;
  else delete attrs[key];
  return { ...p, page: 1, attrs };
}

/* ───────── Filters ───────── */

export type FacetGroup = "cat" | MultiGroup | "audited" | "sample" | "moq" | "price" | `attr:${string}`;

/** Filter clauses for a params set; `except` leaves one group out (for disjunctive facet counts). */
export function buildFilters(p: SearchParams, except?: FacetGroup): FilterClause[] {
  const f: FilterClause[] = [];
  const isProducts = p.tab !== "suppliers";
  const on = (g: FacetGroup) => except !== g;

  if (p.tab === "secured") f.push({ field: "supportsEscrow", in: [true] });
  if (p.cat && on("cat")) f.push({ field: "categoryPaths", in: [p.cat] });
  if (p.biz.length && on("biz")) f.push({ field: "businessType", in: p.biz });
  if (p.rd.length && on("rd")) f.push({ field: "rd", in: p.rd });
  if (p.tier.length && on("tier")) f.push({ field: "tier", in: p.tier });
  if (p.loc.length && on("loc")) f.push({ field: "province", in: p.loc });
  if (p.cert.length && on("cert")) f.push({ field: "certifications", in: p.cert });
  if (p.audited && on("audited")) f.push({ field: "audited", in: [true] });
  if (isProducts) {
    if (p.sample && on("sample")) f.push({ field: "supportsSample", in: [true] });
    if (p.moqMax !== null && on("moq")) f.push({ field: "moq", lte: p.moqMax });
    if ((p.priceMin !== null || p.priceMax !== null) && on("price")) {
      f.push({ field: "priceMinUsd", ...(p.priceMin !== null ? { gte: p.priceMin } : {}), ...(p.priceMax !== null ? { lte: p.priceMax } : {}) });
    }
    for (const [key, values] of Object.entries(p.attrs)) {
      if (!on(`attr:${key}`)) continue;
      f.push({ field: attrField(key), in: values.map((v) => (v === "true" ? true : v === "false" ? false : isNumeric(v) ? Number(v) : v)) });
    }
  }
  return f;
}

const isNumeric = (v: string): boolean => /^-?\d+(\.\d+)?$/.test(v);

export function sortFor(p: SearchParams): string[] {
  switch (p.sort) {
    case "newest": return p.tab === "suppliers" ? ["yearFounded:desc"] : ["publishedAt:desc"];
    case "price_asc": return p.tab === "suppliers" ? [] : ["priceMinUsd:asc"];
    case "price_desc": return p.tab === "suppliers" ? [] : ["priceMinUsd:desc"];
    case "moq_asc": return p.tab === "suppliers" ? [] : ["moq:asc"];
    default: return [];
  }
}

/* ───────── Indexability ───────── */

/** Number of "facet-like" constraints active (anything beyond q/tab/cat/sort/page). */
export function facetCount(p: SearchParams): number {
  return p.biz.length + p.rd.length + p.tier.length + p.loc.length + p.cert.length + Object.keys(p.attrs).length +
    (p.audited ? 1 : 0) + (p.sample ? 1 : 0) + (p.moqMax !== null ? 1 : 0) + (p.priceMin !== null || p.priceMax !== null ? 1 : 0);
}

/**
 * Only a small whitelist of combinations may be indexed (crawl-budget + thin-content control):
 * a plain category/listing, optionally one business-type OR one tier OR "audited", optionally paginated.
 * Anything with a text query, sort, multi-facet, range or attribute filter is noindex.
 */
export function isIndexable(p: SearchParams): boolean {
  if (p.q || p.sort !== "relevance") return false;
  if (p.tab === "secured" && facetCount(p) > 0) return false;
  const n = facetCount(p);
  if (n === 0) return true;
  if (n > 1) return false;
  return p.biz.length === 1 || p.tier.length === 1 || p.audited;
}

/** Canonical form for <link rel=canonical>: non-indexable variants point at the base listing. */
export function canonicalParams(p: SearchParams): SearchParams {
  return isIndexable(p) ? p : { ...DEFAULT_PARAMS, tab: p.tab, cat: p.cat, q: "" };
}
