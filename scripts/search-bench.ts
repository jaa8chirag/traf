// Load test: builds a synthetic index (default 100k products) under a separate prefix and measures
// end-to-end query latency, including facets (the same multi-query shape the site uses).
//   npm run search:bench -- [docCount]
import "dotenv/config";
process.env.MEILISEARCH_INDEX_PREFIX = "tarf_bench_";

import { searchProvider, type SearchDoc, type SearchQuery } from "../src/lib/providers/search";
import { buildProductDoc, type ProductSource } from "../src/modules/search/documents";
import { DEFAULT_PARAMS, buildFilters, sortFor, type SearchParams } from "../src/modules/search/query";
import { PRODUCT_FACET_FIELDS, productSettings } from "../src/modules/search/settings";

const N = Number(process.argv[2] ?? 100_000);
let s = 7;
const rnd = (): number => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];

const CATS = [
  "consumer-electronics/mobile-accessories/chargers", "consumer-electronics/mobile-accessories/cables", "consumer-electronics/audio",
  "construction-and-decoration/tiles-and-flooring/ceramic-tiles", "apparel-and-accessories/mens-clothing/t-shirts", "agriculture-and-food/spices-and-condiments",
  "industrial-equipment-and-components/pumps-and-valves/centrifugal-pumps", "lights-and-lighting/led-lighting/led-bulbs", "furniture/office-furniture/desks",
];
const WORDS = ["fast", "compact", "premium", "industrial", "organic", "foldable", "wireless", "heavy-duty", "eco", "smart", "portable", "waterproof", "led", "steel", "cotton", "ceramic"];
const NOUNS = ["charger", "cable", "tile", "t-shirt", "pump", "bulb", "desk", "stand", "valve", "speaker", "spice", "bearing", "jacket", "lamp"];
const PROVINCES = ["Gujarat", "Maharashtra", "Tamil Nadu", "Uttar Pradesh", "Karnataka", "Punjab", "Rajasthan", "Guangdong", "Zhejiang", "Jiangsu"];

function synth(i: number): SearchDoc {
  const tier = pick(["FREE", "FREE", "FREE", "GOLD", "GOLD", "DIAMOND"] as const);
  const path = pick(CATS);
  const min = 0.3 + rnd() * 80;
  const src: ProductSource = {
    id: `b${i}`, slug: `bench-${i}`, title: `${pick(WORDS)} ${pick(WORDS)} ${pick(NOUNS)} ${i % 997}`, summary: `${pick(WORDS)} ${pick(NOUNS)} for wholesale`,
    keywords: [pick(NOUNS), pick(WORDS)], currency: "USD", priceMin: min.toFixed(2), priceMax: (min * 1.4).toFixed(2), moq: 10 + Math.floor(rnd() * 5000), moqUnit: "pieces",
    supportsSample: rnd() > 0.5, supportsEscrow: rnd() > 0.5, hasVideo: false, ratingAvg: 3 + rnd() * 2, ratingCount: Math.floor(rnd() * 100), topTag: null,
    publishedAt: new Date(Date.now() - Math.floor(rnd() * 400) * 864e5), imageKey: null, category: { name: path.split("/").pop()!, path },
    certifications: rnd() > 0.5 ? [pick(["CE", "RoHS", "ISO 9001", "BIS"])] : [],
    attributes: [
      { key: "wattage", type: "NUMBER", text: null, number: String(pick([20, 30, 45, 65, 100])), bool: null, json: null },
      { key: "color", type: "SELECT", text: pick(["black", "white", "silver", "blue"]), number: null, bool: null, json: null },
    ],
    company: { id: `c${i % 3000}`, slug: `co-${i % 3000}`, name: `Supplier ${i % 3000}`, tier, audited: rnd() > 0.7, city: "X", province: pick(PROVINCES), country: "IN", businessType: pick(["MANUFACTURER", "TRADING_COMPANY", "GROUP_CORP", "OTHER"] as const), rd: rnd() > 0.5 ? ["OEM"] : [] },
  };
  return buildProductDoc(src) as SearchDoc;
}

async function* batches(): AsyncGenerator<SearchDoc[]> {
  for (let i = 0; i < N; i += 5000) yield Array.from({ length: Math.min(5000, N - i) }, (_, k) => synth(i + k));
}

const SCENARIOS: Array<{ name: string; p: Partial<SearchParams> }> = [
  { name: "text query", p: { q: "wireless charger" } },
  { name: "typo query", p: { q: "chargr premum" } },
  { name: "category + facets", p: { cat: "consumer-electronics" } },
  { name: "multi-filter", p: { cat: "consumer-electronics", biz: ["MANUFACTURER"], tier: ["GOLD", "DIAMOND"], audited: true, moqMax: 1000 } },
  { name: "price range + sort", p: { priceMin: 5, priceMax: 40, sort: "price_asc" } },
  { name: "attribute filter", p: { cat: "consumer-electronics/mobile-accessories/chargers", attrs: { wattage: ["65"] } } },
];

const pct = (xs: number[], p: number): number => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];

async function main(): Promise<void> {
  const sp = searchProvider();
  const t0 = Date.now();
  const n = await sp.rebuild("products", productSettings(["wattage", "color"]), batches());
  console.log(`Indexed ${n.toLocaleString()} docs in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const all: number[] = [];
  for (const sc of SCENARIOS) {
    const p: SearchParams = { ...DEFAULT_PARAMS, ...sc.p };
    const main: SearchQuery = { q: p.q, filter: buildFilters(p), facets: [...PRODUCT_FACET_FIELDS], sort: sortFor(p), page: 1, pageSize: 24 };
    // Disjunctive companion queries, as the site issues them.
    const extras: SearchQuery[] = p.biz.length ? [{ ...main, filter: buildFilters(p, "biz"), facets: ["businessType"], pageSize: 0 }] : [];
    for (let i = 0; i < 5; i++) await sp.multiQuery("products", [main, ...extras]); // warm-up
    const times: number[] = [];
    for (let i = 0; i < 150; i++) {
      const t = performance.now();
      await sp.multiQuery("products", [main, ...extras]);
      times.push(performance.now() - t);
    }
    all.push(...times);
    console.log(`${sc.name.padEnd(20)} p50=${pct(times, 0.5).toFixed(0)}ms  p95=${pct(times, 0.95).toFixed(0)}ms  max=${Math.max(...times).toFixed(0)}ms`);
  }
  console.log(`ALL                  p50=${pct(all, 0.5).toFixed(0)}ms  p95=${pct(all, 0.95).toFixed(0)}ms   (target p95 < 150ms)`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
