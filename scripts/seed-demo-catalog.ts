// Adds a larger, varied demo catalogue (suppliers, ~70 products, specs, certificates) so search,
// filters and facets have something realistic to show. Idempotent (slug-keyed). Demo data only.
//   npm run seed:demo      (then: npm run seed:images && npm run search:reindex)
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { BusinessType, CompanyStatus, PlanTier, PrismaClient, ProductStatus } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Deterministic pseudo-random so re-runs produce the same catalogue.
let seed = 42;
const rnd = (): number => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const between = (a: number, b: number): number => a + Math.floor(rnd() * (b - a + 1));
const money = (n: number): string => n.toFixed(2);
const slugify = (s: string): string => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface DemoSupplier { slug: string; name: string; city: string; province: string; type: BusinessType; tier: PlanTier; audited: boolean; rd: Array<"OEM" | "ODM" | "OWN_BRAND">; email: string }
const SUPPLIERS: DemoSupplier[] = [
  { slug: "bharat-power-systems", name: "Bharat Power Systems", city: "Chennai", province: "Tamil Nadu", type: "MANUFACTURER", tier: "GOLD", audited: true, rd: ["OEM", "ODM"], email: "bharat@demo.tarf.test" },
  { slug: "orient-textiles", name: "Orient Textiles Ltd", city: "Tiruppur", province: "Tamil Nadu", type: "MANUFACTURER", tier: "FREE", audited: false, rd: ["OEM"], email: "orient@demo.tarf.test" },
  { slug: "himalaya-agro-exports", name: "Himalaya Agro Exports", city: "Dehradun", province: "Uttarakhand", type: "GROUP_CORP", tier: "DIAMOND", audited: true, rd: ["OWN_BRAND"], email: "himalaya@demo.tarf.test" },
  { slug: "gujarat-ceramics-hub", name: "Gujarat Ceramics Hub", city: "Morbi", province: "Gujarat", type: "MANUFACTURER", tier: "GOLD", audited: false, rd: ["OEM", "ODM", "OWN_BRAND"], email: "gch@demo.tarf.test" },
  { slug: "metro-trade-links", name: "Metro Trade Links", city: "Mumbai", province: "Maharashtra", type: "TRADING_COMPANY", tier: "FREE", audited: false, rd: [], email: "metro@demo.tarf.test" },
];

type Gen = { cat: string; suppliers: string[]; titles: () => string; price: [number, number]; moq: [number, number]; unit: string; attrs?: () => Record<string, string | string[]> };

const GEN: Gen[] = [
  { cat: "chargers", suppliers: ["bharat-power-systems", "sunrise-electronics", "metro-trade-links"], titles: () => `${pick(["20", "30", "45", "65", "100"])}W ${pick(["GaN", "Fast", "Compact", "Travel", "Dual-port"])} USB-C Charger`, price: [3, 12], moq: [200, 2000], unit: "pieces",
    attrs: () => { const w = pick(["20", "30", "45", "65", "100"]); return { wattage: w, ports: rnd() > 0.5 ? ["usb-c", "usb-a"] : ["usb-c"], gan: rnd() > 0.4 ? "true" : "false", color: pick(["black", "white", "silver"]) }; } },
  { cat: "phone-stands", suppliers: ["sunrise-electronics", "bharat-power-systems", "metro-trade-links"], titles: () => `${pick(["Aluminium", "Foldable", "Adjustable", "Desk", "Magnetic"])} Phone Stand ${pick(["Pro", "Lite", "Max", "Slim"])}`, price: [0.8, 3.5], moq: [500, 5000], unit: "pieces",
    attrs: () => ({ brand: pick(["Sunrise", "Bharat", "Generic"]), color: pick(["black", "white", "silver", "blue"]) }) },
  { cat: "cables", suppliers: ["bharat-power-systems", "sunrise-electronics"], titles: () => `${pick(["USB-C", "Lightning", "Micro-USB", "USB-C to USB-A"])} ${pick(["Braided", "Fast Charging", "Data", "Heavy-duty"])} Cable ${pick(["1m", "2m", "3m"])}`, price: [0.4, 2.2], moq: [1000, 10000], unit: "pieces",
    attrs: () => ({ brand: pick(["Bharat", "Sunrise"]), color: pick(["black", "white", "blue"]) }) },
  { cat: "led-bulbs", suppliers: ["bharat-power-systems", "sunrise-electronics", "metro-trade-links"], titles: () => `${pick(["5", "7", "9", "12", "15"])}W LED Bulb ${pick(["B22", "E27", "Warm White", "Cool Daylight"])}`, price: [0.25, 1.1], moq: [2000, 20000], unit: "pieces" },
  { cat: "ceramic-tiles", suppliers: ["gujarat-ceramics-hub", "kaveri-ceramics"], titles: () => `${pick(["Glazed", "Matt", "Rustic", "Digital Print", "Glossy"])} Ceramic ${pick(["Floor", "Wall", "Bathroom", "Kitchen"])} Tile`, price: [2, 6], moq: [800, 4000], unit: "square meters",
    attrs: () => ({ size: pick(["300x600-mm", "600x600-mm", "800x800-mm"]), thickness: String(between(7, 12)), finish: pick(["glossy", "matt", "polished", "rustic"]) }) },
  { cat: "vitrified-tiles", suppliers: ["gujarat-ceramics-hub", "kaveri-ceramics"], titles: () => `${pick(["Polished", "Double-charged", "Marble-look", "Wood-look", "Porcelain"])} Vitrified Tile`, price: [4, 10], moq: [500, 3000], unit: "square meters",
    attrs: () => ({ finish: pick(["glossy", "matt", "polished", "rustic"]) }) },
  { cat: "t-shirts", suppliers: ["orient-textiles", "deccan-trading-co"], titles: () => `${pick(["Cotton", "Organic Cotton", "Polo", "Oversized", "Sports Dry-fit"])} ${pick(["Crew-neck", "V-neck", "Round-neck"])} T-Shirt`, price: [1.5, 5], moq: [500, 3000], unit: "pieces" },
  { cat: "fresh-fruit", suppliers: ["himalaya-agro-exports", "deccan-trading-co"], titles: () => `${pick(["Alphonso", "Kesar", "Banganapalli", "Totapuri"])} Mangoes ${pick(["Export Grade", "Premium", "A-Grade"])}`, price: [9, 22], moq: [200, 2000], unit: "kilograms" },
  { cat: "spices-and-condiments", suppliers: ["himalaya-agro-exports", "deccan-trading-co", "metro-trade-links"], titles: () => `${pick(["Turmeric", "Red Chilli", "Cumin", "Coriander", "Black Pepper", "Cardamom"])} ${pick(["Powder", "Whole", "Crushed"])} ${pick(["Premium", "Export Grade", "Organic"])}`, price: [1.8, 14], moq: [300, 3000], unit: "kilograms" },
];

const CERTS = ["CE", "RoHS", "ISO 9001", "BIS", "FSSAI", "GOTS"] as const;
const CERT_BY_CAT: Record<string, string[]> = {
  chargers: ["CE", "RoHS", "BIS"], "phone-stands": ["RoHS", "ISO 9001"], cables: ["CE", "RoHS"], "led-bulbs": ["CE", "BIS", "RoHS"],
  "ceramic-tiles": ["ISO 9001"], "vitrified-tiles": ["ISO 9001", "CE"], "t-shirts": ["GOTS", "ISO 9001"], "fresh-fruit": ["FSSAI"], "spices-and-condiments": ["FSSAI", "ISO 9001"],
};
void CERTS;

async function ensureSuppliers(): Promise<Map<string, string>> {
  const ownerRole = await db.role.findUniqueOrThrow({ where: { key: "supplier_owner" } });
  const plans = new Map((await db.membershipPlan.findMany()).map((p) => [p.tier, p.id]));
  for (const s of SUPPLIERS) {
    const user = await db.user.upsert({ where: { email: s.email }, update: {}, create: { email: s.email, name: `${s.name} (owner)`, emailVerified: new Date() } });
    const company = await db.company.upsert({
      where: { slug: s.slug },
      update: { tier: s.tier, audited: s.audited },
      create: {
        id: `co_${s.slug}`, // stable id => stable media keys across databases
        slug: s.slug, name: s.name, ownerId: user.id, businessType: s.type, rd: s.rd, city: s.city, province: s.province, status: CompanyStatus.VERIFIED, verifiedAt: new Date(),
        tier: s.tier, audited: s.audited, yearFounded: between(1995, 2018), description: `${s.name} is a ${s.type.replace("_", " ").toLowerCase()} based in ${s.city}, ${s.province}, serving buyers worldwide.`,
        ratingAvg: (3.8 + rnd() * 1.1).toFixed(2), ratingCount: between(8, 140), supplierProfile: { create: {} },
      },
    });
    await db.subAccount.upsert({ where: { companyId_userId: { companyId: company.id, userId: user.id } }, update: {}, create: { companyId: company.id, userId: user.id, roleId: ownerRole.id, status: "ACTIVE" } });
    if (!(await db.subscription.findFirst({ where: { companyId: company.id } }))) {
      await db.subscription.create({ data: { companyId: company.id, planId: plans.get(s.tier)!, endsAt: new Date(Date.now() + 365 * 864e5) } });
    }
    const verified = await db.badge.findUnique({ where: { key: "verified" } });
    if (verified) await db.companyBadge.upsert({ where: { companyId_badgeId: { companyId: company.id, badgeId: verified.id } }, update: {}, create: { companyId: company.id, badgeId: verified.id } });
  }
  // include the original three demo suppliers
  const all = await db.company.findMany({ where: { status: "VERIFIED" }, select: { id: true, slug: true } });
  return new Map(all.map((c) => [c.slug, c.id]));
}

async function main(): Promise<void> {
  const companies = await ensureSuppliers();
  const cats = new Map((await db.category.findMany({ where: { isActive: true }, select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
  const defs = await db.attributeDefinition.findMany({ include: { category: { select: { slug: true } } } });
  let created = 0;

  for (const g of GEN) {
    const categoryId = cats.get(g.cat);
    if (!categoryId) throw new Error(`Missing category ${g.cat}`);
    const count = g.cat === "t-shirts" || g.cat === "fresh-fruit" ? 6 : 9;
    for (let i = 0; i < count; i++) {
      const supplierSlug = pick(g.suppliers);
      const companyId = companies.get(supplierSlug);
      if (!companyId) continue;
      const title = g.titles();
      const slug = `demo-${supplierSlug}-${slugify(title)}-${g.cat}-${i}`.slice(0, 120);
      const min = g.price[0] + rnd() * (g.price[1] - g.price[0]);
      const max = min * (1.15 + rnd() * 0.5);
      const moq = Math.round(between(g.moq[0], g.moq[1]) / 50) * 50;
      const product = await db.product.upsert({
        where: { slug },
        update: {},
        create: {
          slug, companyId, categoryId, title, summary: `${title} for wholesale and OEM orders. Consistent quality, export-ready packaging.`,
          keywords: [g.cat.replace(/-/g, " "), title.split(" ")[0].toLowerCase()], currency: rnd() > 0.85 ? "INR" : "USD",
          priceMin: money(min), priceMax: money(max), moq, moqUnit: g.unit, leadTimeDays: between(7, 35),
          supportsSample: rnd() > 0.4, supportsEscrow: rnd() > 0.45, hasVideo: rnd() > 0.85,
          status: ProductStatus.LIVE, publishedAt: new Date(Date.now() - between(0, 90) * 864e5),
          ratingAvg: rnd() > 0.3 ? (3.9 + rnd() * 1.1).toFixed(2) : 0, ratingCount: rnd() > 0.3 ? between(3, 90) : 0,
          topTag: rnd() > 0.9 ? "Top rated" : null,
        },
      });
      // INR products need INR-scale prices to look right.
      if (product.currency === "INR") await db.product.update({ where: { id: product.id }, data: { priceMin: money(min * 83), priceMax: money(max * 83) } });

      if (g.attrs && !(await db.productAttributeValue.count({ where: { productId: product.id } }))) {
        for (const [key, value] of Object.entries(g.attrs())) {
          const def = defs.find((d) => d.key === key && (d.category.slug === g.cat || d.category.slug === "mobile-accessories" || d.category.slug === "tiles-and-flooring"));
          if (!def) continue;
          await db.productAttributeValue.create({
            data: {
              productId: product.id, attributeId: def.id,
              valueText: def.type === "TEXT" || def.type === "SELECT" ? (value as string) : null,
              valueNumber: def.type === "NUMBER" ? (value as string) : null,
              valueBool: def.type === "BOOLEAN" ? value === "true" : null,
              valueJson: def.type === "MULTI_SELECT" ? (value as string[]) : undefined,
            },
          });
        }
      }
      if (!(await db.certification.count({ where: { productId: product.id } }))) {
        for (const name of CERT_BY_CAT[g.cat].filter(() => rnd() > 0.45)) {
          await db.certification.create({ data: { companyId, productId: product.id, name, state: "APPROVED" } });
        }
      }
      created++;
    }
  }
  console.log(`Demo catalogue ready: ${created} products across ${SUPPLIERS.length} extra suppliers.`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
