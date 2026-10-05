import { describe, expect, it } from "vitest";
import { compileFilter } from "../../lib/providers/search/meili";
import { buildProductDoc, ancestorPaths, rankScore, type ProductSource } from "./documents";
import { DEFAULT_PARAMS, buildFilters, buildQuery, canonicalParams, facetCount, isIndexable, parseSearchParams, sortFor, toggleAttr, toggleMulti } from "./query";

const parse = (qs: string) => {
  const u = new URLSearchParams(qs);
  const raw: Record<string, string | string[]> = {};
  for (const k of new Set(u.keys())) raw[k] = u.getAll(k).length > 1 ? u.getAll(k) : u.get(k)!;
  return parseSearchParams(raw);
};

describe("URL <-> params", () => {
  it("round-trips a complex state and is canonical regardless of input order", () => {
    const a = parse("sort=price_asc&biz=OTHER&biz=MANUFACTURER&q=gan%20charger&attr.ports=usb-c&attr.ports=usb-a&moqMax=500&audited=1&cat=consumer-electronics/mobile-accessories&page=3&priceMin=1&priceMax=9.5&loc=Gujarat&tier=GOLD");
    const url = buildQuery(a);
    expect(parse(url)).toEqual(a);
    expect(buildQuery(parse(url))).toBe(url);
    const shuffled = parse("page=3&tier=GOLD&loc=Gujarat&priceMax=9.5&priceMin=1&cat=consumer-electronics/mobile-accessories&audited=1&moqMax=500&attr.ports=usb-a&attr.ports=usb-c&q=gan charger&biz=MANUFACTURER&biz=OTHER&sort=price_asc");
    expect(buildQuery(shuffled)).toBe(url);
    expect(a.biz).toEqual(["MANUFACTURER", "OTHER"]);
    expect(a.attrs.ports).toEqual(["usb-a", "usb-c"]);
  });

  it("omits defaults and the empty state serialises to an empty string", () => {
    expect(buildQuery(DEFAULT_PARAMS)).toBe("");
    expect(buildQuery({ ...DEFAULT_PARAMS, tab: "suppliers" })).toBe("tab=suppliers");
  });

  it("drops invalid and hostile input", () => {
    const p = parse("biz=NOPE&tier=GOLD&tab=evil&sort=drop&cat=../../etc&moqMax=-5&priceMin=abc&page=-4&attr.Bad Key=1&attr.ok_key=1&q=" + "x".repeat(300));
    expect(p.biz).toEqual([]);
    expect(p.tier).toEqual(["GOLD"]);
    expect(p.tab).toBe("products");
    expect(p.sort).toBe("relevance");
    expect(p.cat).toBeNull();
    expect(p.moqMax).toBeNull();
    expect(p.priceMin).toBeNull();
    expect(p.page).toBe(1);
    expect(Object.keys(p.attrs)).toEqual(["ok_key"]);
    expect(p.q.length).toBe(100);
  });

  it("caps page and multi-value counts", () => {
    expect(parse("page=99999").page).toBe(500);
    const many = Array.from({ length: 30 }, (_, i) => `loc=P${i}`).join("&");
    expect(parse(many).loc).toHaveLength(10);
  });

  it("forced params (category pages) override the URL", () => {
    const p = parseSearchParams({ cat: "other" }, { cat: "consumer-electronics" });
    expect(p.cat).toBe("consumer-electronics");
    expect(buildQuery(p, ["cat"])).toBe("");
  });

  it("toggle helpers reset the page", () => {
    const p = toggleMulti({ ...DEFAULT_PARAMS, page: 4 }, "biz", "OTHER");
    expect(p).toMatchObject({ biz: ["OTHER"], page: 1 });
    expect(toggleMulti(p, "biz", "OTHER").biz).toEqual([]);
    expect(toggleAttr(DEFAULT_PARAMS, "color", "red").attrs).toEqual({ color: ["red"] });
    expect(toggleAttr({ ...DEFAULT_PARAMS, attrs: { color: ["red"] } }, "color", "red").attrs).toEqual({});
  });
});

describe("filters", () => {
  it("builds the expected clauses and excludes a group on request", () => {
    const p = parse("cat=a/b&biz=MANUFACTURER&biz=OTHER&audited=1&sample=1&moqMax=100&priceMin=2&priceMax=5&attr.wattage=65&attr.gan=true");
    const f = buildFilters(p);
    expect(f).toContainEqual({ field: "categoryPaths", in: ["a/b"] });
    expect(f).toContainEqual({ field: "businessType", in: ["MANUFACTURER", "OTHER"] });
    expect(f).toContainEqual({ field: "moq", lte: 100 });
    expect(f).toContainEqual({ field: "priceMinUsd", gte: 2, lte: 5 });
    expect(f).toContainEqual({ field: "attr_wattage", in: [65] });
    expect(f).toContainEqual({ field: "attr_gan", in: [true] });
    expect(buildFilters(p, "biz").some((c) => c.field === "businessType")).toBe(false);
    expect(buildFilters(p, "attr:wattage").some((c) => c.field === "attr_wattage")).toBe(false);
  });

  it("secured tab forces escrow; supplier tab ignores product-only filters", () => {
    expect(buildFilters({ ...DEFAULT_PARAMS, tab: "secured" })).toContainEqual({ field: "supportsEscrow", in: [true] });
    const s = buildFilters({ ...DEFAULT_PARAMS, tab: "suppliers", sample: true, moqMax: 5, biz: ["OTHER"] });
    expect(s.map((c) => c.field)).toEqual(["businessType"]);
  });

  it("compiles to engine syntax safely (quotes are escaped)", () => {
    expect(compileFilter([{ field: "businessType", in: ["A", "B"] }, { field: "moq", lte: 5 }, { field: "x", in: ['a"b'] }, { field: "audited", in: [true] }]))
      .toEqual(['(businessType = "A" OR businessType = "B")', "moq <= 5", 'x = "a\\"b"', "audited = true"]);
  });

  it("maps sorts per tab", () => {
    expect(sortFor({ ...DEFAULT_PARAMS, sort: "price_asc" })).toEqual(["priceMinUsd:asc"]);
    expect(sortFor({ ...DEFAULT_PARAMS, sort: "price_asc", tab: "suppliers" })).toEqual([]);
  });
});

describe("indexability whitelist", () => {
  const p = (qs: string) => parse(qs);
  it("allows plain listings and a single business-type / tier / audited facet", () => {
    expect(isIndexable(p(""))).toBe(true);
    expect(isIndexable(p("cat=a/b&page=2"))).toBe(true);
    expect(isIndexable(p("biz=MANUFACTURER"))).toBe(true);
    expect(isIndexable(p("tier=GOLD"))).toBe(true);
    expect(isIndexable(p("audited=1"))).toBe(true);
  });
  it("blocks queries, sorts, combos, ranges, attributes and multi-values", () => {
    for (const qs of ["q=abc", "sort=newest", "biz=OTHER&tier=GOLD", "biz=OTHER&biz=MANUFACTURER", "moqMax=10", "priceMin=1", "attr.color=red", "loc=Gujarat", "sample=1", "tab=secured&audited=1"]) {
      expect(isIndexable(p(qs)), qs).toBe(false);
    }
  });
  it("canonical of a non-indexable variant is the base listing", () => {
    const c = canonicalParams(p("cat=a/b&biz=OTHER&tier=GOLD&sort=newest&page=3"));
    expect(buildQuery(c)).toBe("cat=a%2Fb");
    expect(facetCount(c)).toBe(0);
  });
});

describe("document builder", () => {
  const src: ProductSource = {
    id: "p1", slug: "s", title: "65W GaN Charger", summary: null, keywords: ["gan"], currency: "INR", priceMin: "1500", priceMax: "2500",
    moq: 10, moqUnit: "pcs", supportsSample: true, supportsEscrow: false, hasVideo: false, ratingAvg: 4.5, ratingCount: 20, topTag: null,
    publishedAt: new Date("2026-01-01T00:00:00Z"), imageKey: null, category: { name: "Chargers", path: "consumer-electronics/mobile-accessories/chargers" },
    certifications: ["CE"],
    attributes: [
      { key: "wattage", type: "NUMBER", text: null, number: "65", bool: null, json: null },
      { key: "ports", type: "MULTI_SELECT", text: null, number: null, bool: null, json: ["usb-c"], optionLabels: { "usb-c": "USB-C" } },
      { key: "gan", type: "BOOLEAN", text: null, number: null, bool: true, json: null },
      { key: "color", type: "SELECT", text: "black", number: null, bool: null, json: null },
    ],
    company: { id: "c1", slug: "acme", name: "Acme", tier: "GOLD", audited: true, city: "Noida", province: "UP", country: "IN", businessType: "MANUFACTURER", rd: ["OEM"] },
  };
  it("flattens attributes, ancestors and USD price", () => {
    const d = buildProductDoc(src);
    expect(d.categoryPaths).toEqual(["consumer-electronics", "consumer-electronics/mobile-accessories", "consumer-electronics/mobile-accessories/chargers"]);
    expect(d).toMatchObject({ attr_wattage: 65, attr_ports: ["usb-c"], attr_gan: true, attr_color: "black", priceMinUsd: 18, province: "UP" });
    expect(d.specsText).toContain("USB-C");
  });
  it("ranks higher tiers, audited and well-reviewed suppliers above others", () => {
    expect(rankScore("DIAMOND", false, 0, 0)).toBeGreaterThan(rankScore("GOLD", true, 5, 100));
    expect(rankScore("FREE", true, 5, 100)).toBeGreaterThan(rankScore("FREE", false, 5, 100));
    expect(rankScore("FREE", false, 5, 1)).toBeLessThan(rankScore("FREE", false, 5, 10)); // few reviews count less
  });
  it("ancestorPaths", () => expect(ancestorPaths("a/b")).toEqual(["a", "a/b"]));
});
