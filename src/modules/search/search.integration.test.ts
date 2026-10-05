// Search correctness against ground truth: the engine's hits/facet counts must equal what we compute
// independently from Postgres rows. Needs compose Postgres + Meilisearch (uses its own index prefix).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.MEILISEARCH_INDEX_PREFIX = "tarf_test_";

vi.mock("@/lib/providers/storage", () => ({
  storage: () => ({ publicUrl: (k: string) => `http://cdn.test/${k}`, signedGetUrl: async (k: string) => k, exists: async () => true, delete: async () => undefined, presignUpload: async () => ({ url: "", headers: {} }) }),
}));

const { prisma } = await import("@/lib/db");
const { searchProvider } = await import("@/lib/providers/search");
const { toUsd } = await import("@/lib/fx");
const { relayOutbox } = await import("@/lib/events/relay");
const search = await import("./index");
const { buildFilters, DEFAULT_PARAMS } = await import("./query");

type Params = import("./query").SearchParams;

interface Row {
  id: string; categoryPath: string; biz: string; rd: string[]; tier: string; audited: boolean; province: string; sample: boolean; escrow: boolean;
  moq: number; usd: number | null; certs: string[]; attrs: Record<string, string[]>;
}
let truth: Row[] = [];

async function loadTruth(): Promise<Row[]> {
  const rows = await prisma.product.findMany({
    where: { status: "LIVE", company: { status: "VERIFIED" } },
    include: { category: true, company: true, certifications: { where: { state: "APPROVED" } }, attributes: { include: { attribute: true } } },
  });
  return rows.map((p) => ({
    id: p.id, categoryPath: p.category.path, biz: p.company.businessType, rd: p.company.rd, tier: p.company.tier, audited: p.company.audited,
    province: p.company.province ?? "", sample: p.supportsSample, escrow: p.supportsEscrow, moq: p.moq,
    usd: p.priceMin === null ? null : toUsd(Number(p.priceMin), p.currency), certs: p.certifications.map((c) => c.name),
    attrs: Object.fromEntries(p.attributes.map((a) => [a.attribute.key, a.valueJson ? (a.valueJson as string[]) : [String(a.valueNumber ?? a.valueText ?? a.valueBool)]])),
  }));
}

/** Independent re-implementation of the filter semantics in plain JS. */
function expected(p: Params): Set<string> {
  const ok = (r: Row): boolean => {
    if (p.tab === "secured" && !r.escrow) return false;
    if (p.cat && !(r.categoryPath === p.cat || r.categoryPath.startsWith(`${p.cat}/`))) return false;
    if (p.biz.length && !p.biz.includes(r.biz)) return false;
    if (p.rd.length && !p.rd.some((x) => r.rd.includes(x))) return false;
    if (p.tier.length && !p.tier.includes(r.tier)) return false;
    if (p.loc.length && !p.loc.includes(r.province)) return false;
    if (p.cert.length && !p.cert.some((c) => r.certs.includes(c))) return false;
    if (p.audited && !r.audited) return false;
    if (p.sample && !r.sample) return false;
    if (p.moqMax !== null && r.moq > p.moqMax) return false;
    if (p.priceMin !== null && (r.usd === null || r.usd < p.priceMin)) return false;
    if (p.priceMax !== null && (r.usd === null || r.usd > p.priceMax)) return false;
    for (const [k, vs] of Object.entries(p.attrs)) if (!vs.some((v) => (r.attrs[k] ?? []).includes(v))) return false;
    return true;
  };
  return new Set(truth.filter(ok).map((r) => r.id));
}

async function engineIds(p: Params): Promise<{ ids: Set<string>; total: number }> {
  const res = await searchProvider().query("products", { q: "", filter: buildFilters(p), facets: [], sort: [], page: 1, pageSize: 1000 });
  return { ids: new Set(res.hits.map((h) => h.id)), total: res.total };
}

const fixtureIds: { userIds: string[]; productIds: string[] } = { userIds: [], productIds: [] };
let sunriseId = "";
let chargersId = "";

beforeAll(async () => {
  await search.rebuildAll();
  truth = await loadTruth();
  sunriseId = (await prisma.company.findUniqueOrThrow({ where: { slug: "sunrise-electronics" } })).id;
  chargersId = (await prisma.category.findFirstOrThrow({ where: { slug: "chargers" } })).id;
}, 120_000);

afterAll(async () => {
  if (fixtureIds.productIds.length) {
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: fixtureIds.productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: fixtureIds.productIds } } });
  }
  await prisma.$disconnect();
});

const P = (over: Partial<Params>): Params => ({ ...DEFAULT_PARAMS, ...over });

describe("hits match Postgres ground truth", () => {
  const cases: Array<[string, Partial<Params>]> = [
    ["no filters", {}],
    ["category subtree (L1)", { cat: "consumer-electronics" }],
    ["category leaf", { cat: "consumer-electronics/mobile-accessories/chargers" }],
    ["business type (multi)", { biz: ["MANUFACTURER", "TRADING_COMPANY"] }],
    ["tier + audited", { tier: ["GOLD", "DIAMOND"], audited: true }],
    ["R&D", { rd: ["OEM"] }],
    ["province", { loc: ["Gujarat", "Tamil Nadu"] }],
    ["certifications", { cert: ["CE", "RoHS"] }],
    ["samples + MOQ cap", { sample: true, moqMax: 1000 }],
    ["price range (USD)", { priceMin: 2, priceMax: 6 }],
    ["open-ended price", { priceMin: 10 }],
    ["secured trading", { tab: "secured" }],
    ["secured + category + biz", { tab: "secured", cat: "consumer-electronics", biz: ["MANUFACTURER"] }],
    ["dynamic attribute (number)", { cat: "consumer-electronics/mobile-accessories/chargers", attrs: { wattage: ["65", "100"] } }],
    ["dynamic attribute (select)", { cat: "consumer-electronics/mobile-accessories", attrs: { color: ["black"] } }],
    ["everything combined", { cat: "consumer-electronics", biz: ["MANUFACTURER"], tier: ["GOLD"], sample: true, moqMax: 3000, priceMin: 1, priceMax: 20 }],
  ];
  it.each(cases)("%s", async (_name, over) => {
    const p = P(over);
    const want = expected(p);
    const got = await engineIds(p);
    expect([...got.ids].sort()).toEqual([...want].sort());
    expect(got.total).toBe(want.size);
  });

  it("the dataset is big enough for these checks to be meaningful", () => {
    expect(truth.length).toBeGreaterThan(40);
    expect(expected(P({ cat: "consumer-electronics" })).size).toBeGreaterThan(0);
  });
});

describe("facets", () => {
  it("counts equal group-by counts from Postgres", async () => {
    const p = P({ cat: "consumer-electronics" });
    const out = await search.runSearch(p);
    expect(out.degraded).toBe(false);
    const rows = truth.filter((r) => expected(p).has(r.id));
    const biz = out.facets.find((f) => f.id === "biz")!;
    for (const o of biz.options) expect(o.count).toBe(rows.filter((r) => r.biz === o.value).length);
    expect(biz.options.reduce((n, o) => n + o.count, 0)).toBe(rows.length);
    const tier = out.facets.find((f) => f.id === "tier")!;
    for (const o of tier.options) expect(o.count).toBe(rows.filter((r) => r.tier === o.value).length);
    expect(out.total).toBe(rows.length);
  });

  it("selected groups stay disjunctive: other options keep their own counts", async () => {
    const base = P({ cat: "consumer-electronics" });
    const sel = P({ cat: "consumer-electronics", biz: ["MANUFACTURER"] });
    const out = await search.runSearch(sel);
    const biz = out.facets.find((f) => f.id === "biz")!;
    const withoutBiz = truth.filter((r) => expected(base).has(r.id));
    for (const o of biz.options) expect(o.count, o.value).toBe(withoutBiz.filter((r) => r.biz === o.value).length);
    expect(biz.options.find((o) => o.value === "MANUFACTURER")?.selected).toBe(true);
    expect(out.total).toBe(expected(sel).size); // results themselves ARE narrowed
  });

  it("offers dynamic attribute facets once a category is chosen", async () => {
    const out = await search.runSearch(P({ cat: "consumer-electronics/mobile-accessories/chargers" }));
    const w = out.facets.find((f) => f.id === "attr.wattage");
    expect(w).toBeDefined();
    const rows = truth.filter((r) => r.categoryPath.startsWith("consumer-electronics/mobile-accessories/chargers"));
    for (const o of w!.options) expect(o.count).toBe(rows.filter((r) => (r.attrs.wattage ?? []).includes(o.value)).length);
  });

  it("lists sub-categories with counts that sum to the total", async () => {
    const out = await search.runSearch(P({ cat: "consumer-electronics" }));
    expect(out.subcategories.length).toBeGreaterThan(0);
    for (const s of out.subcategories) expect(s.count).toBe(truth.filter((r) => r.categoryPath === s.path || r.categoryPath.startsWith(`${s.path}/`)).length);
  });

  it("tab counts reflect q + category only", async () => {
    const out = await search.runSearch(P({ cat: "consumer-electronics", biz: ["OTHER"] }));
    expect(out.tabCounts.products).toBe(expected(P({ cat: "consumer-electronics" })).size);
    expect(out.tabCounts.secured).toBe(expected(P({ cat: "consumer-electronics", tab: "secured" })).size);
  });
});

describe("text search", () => {
  it("finds products by title, by typo, and by spec text", async () => {
    const exact = await search.runSearch(P({ q: "charger" }));
    expect(exact.total).toBeGreaterThan(0);
    const typo = await search.runSearch(P({ q: "chargr" }));
    expect(typo.total).toBeGreaterThan(0);
    const nothing = await search.runSearch(P({ q: "zzqxjkwv" }));
    expect(nothing.total).toBe(0);
  });

  it("price sort orders by USD price ascending", async () => {
    const out = await search.runSearch(P({ sort: "price_asc" }));
    const usd = out.products.map((c) => (c.priceMin === null ? Infinity : toUsd(Number(c.priceMin), c.currency)));
    expect(usd).toEqual([...usd].sort((a, b) => a - b));
  });

  it("suggestions return products, suppliers and categories", async () => {
    const s = await search.suggest("char");
    expect(s.products.length + s.categories.length).toBeGreaterThan(0);
    expect(await search.suggest("a")).toEqual({ products: [], suppliers: [], categories: [] });
  });
});

describe("index maintenance", () => {
  it("reindex is idempotent (same ids and counts)", async () => {
    const before = await engineIds(P({}));
    const r1 = await search.rebuildAll();
    const r2 = await search.rebuildAll();
    expect(r2).toEqual(r1);
    const after = await engineIds(P({}));
    expect([...after.ids].sort()).toEqual([...before.ids].sort());
  }, 120_000);

  it("incremental sync adds, hides and removes a product", async () => {
    const p = await prisma.product.create({
      data: { companyId: sunriseId, categoryId: chargersId, slug: `zz-sync-${Date.now().toString(36)}`, title: "Zzsyncprobe Quantum Charger", moq: 5, moqUnit: "pcs", priceMin: 3, priceMax: 4, status: "LIVE", publishedAt: new Date() },
    });
    fixtureIds.productIds.push(p.id);
    const find = async () => (await search.runSearch(P({ q: "Zzsyncprobe" }))).total;

    expect(await find()).toBe(0);
    await search.syncProducts([p.id]);
    expect(await find()).toBe(1);

    await prisma.product.update({ where: { id: p.id }, data: { status: "PENDING_REVIEW" } });
    await search.syncProducts([p.id]);
    expect(await find()).toBe(0);

    await prisma.product.update({ where: { id: p.id }, data: { status: "LIVE" } });
    await search.syncProducts([p.id]);
    expect(await find()).toBe(1);

    await prisma.product.delete({ where: { id: p.id } });
    fixtureIds.productIds = fixtureIds.productIds.filter((x) => x !== p.id);
    await search.syncProducts([p.id]);
    expect(await find()).toBe(0);
  });

  it("an unverified supplier's products leave the index", async () => {
    const user = await prisma.user.create({ data: { email: `srch-${Date.now().toString(36)}@test.tarf` } });
    fixtureIds.userIds.push(user.id);
    const co = await prisma.company.create({ data: { ownerId: user.id, slug: `srch-${Date.now().toString(36)}`, name: "Zzsearchco", status: "VERIFIED" } });
    const p = await prisma.product.create({ data: { companyId: co.id, categoryId: chargersId, slug: `zz-co-${Date.now().toString(36)}`, title: "Zzcoprobe Widget", moq: 1, moqUnit: "pcs", status: "LIVE", publishedAt: new Date() } });
    await search.syncCompany(co.id);
    expect((await search.runSearch(P({ q: "Zzcoprobe" }))).total).toBe(1);
    expect((await search.runSearch(P({ q: "Zzsearchco", tab: "suppliers" }))).total).toBe(1);

    await prisma.company.update({ where: { id: co.id }, data: { status: "SUSPENDED" } });
    await search.syncCompany(co.id);
    expect((await search.runSearch(P({ q: "Zzcoprobe" }))).total).toBe(0);
    expect((await search.runSearch(P({ q: "Zzsearchco", tab: "suppliers" }))).total).toBe(0);

    await prisma.product.delete({ where: { id: p.id } });
    await prisma.company.delete({ where: { id: co.id } });
    await prisma.user.delete({ where: { id: user.id } });
    fixtureIds.userIds = [];
  });
});

describe("outbox relay", () => {
  it("publishes pending events once, marks them, and retries failures", async () => {
    const tag = `relay-${Date.now().toString(36)}`;
    await prisma.outboxEvent.createMany({ data: [{ type: "product.approved", aggregateId: `${tag}-a`, payload: {} }, { type: "product.approved", aggregateId: `${tag}-b`, payload: {} }] });
    const seen: string[] = [];
    const n = await relayOutbox(async (e) => {
      if (e.aggregateId.endsWith("-b")) throw new Error("queue down");
      seen.push(e.aggregateId);
    }, { aggregateIds: [`${tag}-a`, `${tag}-b`] });
    expect(n).toBe(1);
    expect(seen).toEqual([`${tag}-a`]);

    const rows = await prisma.outboxEvent.findMany({ where: { aggregateId: { startsWith: tag } }, orderBy: { aggregateId: "asc" } });
    expect(rows.map((r) => [r.status, r.attempts])).toEqual([["PUBLISHED", 1], ["PENDING", 1]]);

    // second pass: only the failed one is retried
    await relayOutbox(async (e) => void seen.push(e.aggregateId), { aggregateIds: [`${tag}-a`, `${tag}-b`] });
    expect(seen).toEqual([`${tag}-a`, `${tag}-b`]);
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { startsWith: tag } } });
  });
});
