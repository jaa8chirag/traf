// CP-0 seed STUB. Idempotent (upserts). Run: npm run db:seed
// The L1 list below is a placeholder until the full taxonomy file is provided;
// CP-2 replaces it with the real importer.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PlanTier, BusinessType, RoleScope, ProductStatus, CompanyStatus } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const slugify = (s: string): string =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Node {
  name: string;
  children?: Node[];
}

const tree: Node[] = [
  { name: "Agriculture & Food", children: [{ name: "Fruits & Vegetables", children: [{ name: "Fresh Fruit" }, { name: "Dried Fruit" }] }, { name: "Spices & Condiments" }] },
  { name: "Apparel & Accessories", children: [{ name: "Men's Clothing", children: [{ name: "T-Shirts" }, { name: "Jackets" }] }, { name: "Women's Clothing" }] },
  { name: "Auto & Motorcycle Parts" },
  { name: "Bags, Cases & Boxes" },
  { name: "Chemicals" },
  { name: "Computer Products" },
  { name: "Construction & Decoration", children: [{ name: "Tiles & Flooring", children: [{ name: "Ceramic Tiles" }, { name: "Vitrified Tiles" }] }] },
  { name: "Consumer Electronics", children: [{ name: "Mobile Accessories", children: [{ name: "Chargers" }, { name: "Phone Stands" }, { name: "Cables" }] }, { name: "Audio" }] },
  { name: "Electrical & Electronics", children: [{ name: "Wires & Cables" }, { name: "Switches & Sockets" }] },
  { name: "Telecom Equipment" },
  { name: "Furniture", children: [{ name: "Office Furniture", children: [{ name: "Desks" }, { name: "Chairs" }] }, { name: "Home Furniture" }] },
  { name: "Hardware" },
  { name: "Health & Medicine" },
  { name: "Industrial Equipment & Components", children: [{ name: "Pumps & Valves", children: [{ name: "Centrifugal Pumps" }, { name: "Gate Valves" }] }, { name: "Bearings" }] },
  { name: "Instruments & Meters" },
  { name: "Light Industry & Daily Use" },
  { name: "Lights & Lighting", children: [{ name: "LED Lighting", children: [{ name: "LED Bulbs" }, { name: "LED Panels" }] }] },
  { name: "Manufacturing & Processing Machinery" },
  { name: "Metallurgy, Mineral & Energy" },
  { name: "Office & School Supplies" },
  { name: "Packaging & Printing" },
  { name: "Security & Protection" },
  { name: "Sports & Entertainment" },
  { name: "Textiles & Leather" },
  { name: "Tools" },
  { name: "Toys" },
  { name: "Transportation" },
];

async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>(); // slug -> id
  const walk = async (nodes: Node[], parentId: string | null, parentPath: string, level: number): Promise<void> => {
    for (const [i, n] of nodes.entries()) {
      const slug = slugify(n.name);
      const path = parentPath ? `${parentPath}/${slug}` : slug;
      const row = await prisma.category.upsert({
        where: { slug },
        update: { name: n.name, parentId, level, path, sortOrder: i, isLeaf: !n.children?.length },
        create: { name: n.name, slug, parentId, level, path, sortOrder: i, isLeaf: !n.children?.length },
      });
      ids.set(slug, row.id);
      if (n.children) await walk(n.children, row.id, path, level + 1);
    }
  };
  await walk(tree, null, "", 1);
  return ids;
}

async function seedAccess(): Promise<{ superAdminRoleId: string; ownerRoleId: string }> {
  const roles = [
    { key: "super_admin", name: "Super Admin", scope: RoleScope.PLATFORM },
    { key: "verification", name: "Verification Officer", scope: RoleScope.PLATFORM },
    { key: "finance", name: "Finance", scope: RoleScope.PLATFORM },
    { key: "support", name: "Support Agent", scope: RoleScope.PLATFORM },
    { key: "content", name: "Content Manager", scope: RoleScope.PLATFORM },
    { key: "supplier_owner", name: "Supplier Owner", scope: RoleScope.COMPANY },
    { key: "supplier_sales", name: "Supplier Sales", scope: RoleScope.COMPANY },
    { key: "supplier_product_manager", name: "Supplier Product Manager", scope: RoleScope.COMPANY },
  ];
  const out = new Map<string, string>();
  for (const r of roles) {
    const row = await prisma.role.upsert({ where: { key: r.key }, update: {}, create: { ...r, isSystem: true } });
    out.set(r.key, row.id);
  }
  return { superAdminRoleId: out.get("super_admin")!, ownerRoleId: out.get("supplier_owner")! };
}

async function seedPlansAndBadges(): Promise<Map<PlanTier, string>> {
  const plans = [
    { tier: PlanTier.FREE, name: "Free", priceMonthly: 0, priceYearly: 0, maxProducts: 10, maxSubAccounts: 1, rfqQuotaMonth: 3, rankBoost: 0 },
    { tier: PlanTier.GOLD, name: "Gold", priceMonthly: 4999, priceYearly: 49999, maxProducts: 200, maxSubAccounts: 5, rfqQuotaMonth: 30, rankBoost: 10 },
    { tier: PlanTier.DIAMOND, name: "Diamond", priceMonthly: 12999, priceYearly: 129999, maxProducts: 2000, maxSubAccounts: 20, rfqQuotaMonth: 120, rankBoost: 25 },
  ];
  const ids = new Map<PlanTier, string>();
  for (const p of plans) {
    const row = await prisma.membershipPlan.upsert({ where: { tier: p.tier }, update: {}, create: p });
    ids.set(p.tier, row.id);
  }
  for (const b of [
    { key: "verified", label: "Verified Supplier" },
    { key: "audited", label: "Audited Supplier" },
    { key: "gold", label: "Gold Member" },
    { key: "diamond", label: "Diamond Member" },
  ]) {
    await prisma.badge.upsert({ where: { key: b.key }, update: {}, create: b });
  }
  return ids;
}

interface DemoSupplier {
  slug: string;
  name: string;
  city: string;
  province: string;
  businessType: BusinessType;
  tier: PlanTier;
  audited: boolean;
  email: string;
}

const suppliers: DemoSupplier[] = [
  { slug: "sunrise-electronics", name: "Sunrise Electronics Pvt Ltd", city: "Noida", province: "Uttar Pradesh", businessType: BusinessType.MANUFACTURER, tier: PlanTier.DIAMOND, audited: true, email: "sunrise@demo.tarf.test" },
  { slug: "kaveri-ceramics", name: "Kaveri Ceramics", city: "Morbi", province: "Gujarat", businessType: BusinessType.MANUFACTURER, tier: PlanTier.GOLD, audited: false, email: "kaveri@demo.tarf.test" },
  { slug: "deccan-trading-co", name: "Deccan Trading Co.", city: "Pune", province: "Maharashtra", businessType: BusinessType.TRADING_COMPANY, tier: PlanTier.FREE, audited: false, email: "deccan@demo.tarf.test" },
];

const products: { supplier: string; category: string; title: string; min: number; max: number; moq: number; unit: string }[] = [
  { supplier: "sunrise-electronics", category: "chargers", title: "65W GaN Fast Charger", min: 4.2, max: 5.6, moq: 500, unit: "pieces" },
  { supplier: "sunrise-electronics", category: "phone-stands", title: "Aluminium Foldable Phone Stand", min: 1.1, max: 1.8, moq: 1000, unit: "pieces" },
  { supplier: "sunrise-electronics", category: "cables", title: "USB-C to USB-C 100W Cable", min: 0.9, max: 1.4, moq: 2000, unit: "pieces" },
  { supplier: "sunrise-electronics", category: "led-bulbs", title: "9W LED Bulb B22", min: 0.45, max: 0.7, moq: 5000, unit: "pieces" },
  { supplier: "kaveri-ceramics", category: "ceramic-tiles", title: "600x600 Glazed Ceramic Floor Tile", min: 3.5, max: 5.2, moq: 1500, unit: "square meters" },
  { supplier: "kaveri-ceramics", category: "vitrified-tiles", title: "800x800 Polished Vitrified Tile", min: 5.0, max: 7.8, moq: 1000, unit: "square meters" },
  { supplier: "kaveri-ceramics", category: "ceramic-tiles", title: "300x600 Wall Tile, Matt Finish", min: 2.6, max: 3.9, moq: 2000, unit: "square meters" },
  { supplier: "deccan-trading-co", category: "t-shirts", title: "Cotton Crew-Neck T-Shirt (OEM)", min: 1.8, max: 3.2, moq: 1200, unit: "pieces" },
  { supplier: "deccan-trading-co", category: "fresh-fruit", title: "Export-Grade Kesar Mangoes", min: 14, max: 19, moq: 500, unit: "kilograms" },
  { supplier: "deccan-trading-co", category: "spices-and-condiments", title: "Whole Cumin Seeds 99% Purity", min: 2.9, max: 3.6, moq: 1000, unit: "kilograms" },
];

async function seedDemo(cats: Map<string, string>, plans: Map<PlanTier, string>, ownerRoleId: string): Promise<void> {
  for (const s of suppliers) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { email: s.email, name: `${s.name} (owner)`, emailVerified: new Date() },
    });
    const company = await prisma.company.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug,
        name: s.name,
        ownerId: user.id,
        businessType: s.businessType,
        city: s.city,
        province: s.province,
        status: CompanyStatus.VERIFIED,
        verifiedAt: new Date(),
        tier: s.tier,
        audited: s.audited,
        supplierProfile: { create: { mainProducts: [] } },
      },
    });
    await prisma.subAccount.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      update: {},
      create: { companyId: company.id, userId: user.id, roleId: ownerRoleId, status: "ACTIVE" },
    });
    const planId = plans.get(s.tier)!;
    const existingSub = await prisma.subscription.findFirst({ where: { companyId: company.id } });
    if (!existingSub) {
      await prisma.subscription.create({
        data: { companyId: company.id, planId, endsAt: new Date(Date.now() + 365 * 24 * 3600 * 1000) },
      });
    }

    for (const p of products.filter((x) => x.supplier === s.slug)) {
      const categoryId = cats.get(p.category);
      if (!categoryId) throw new Error(`Seed category missing: ${p.category}`);
      await prisma.product.upsert({
        where: { slug: `${s.slug}-${slugify(p.title)}` },
        update: {},
        create: {
          slug: `${s.slug}-${slugify(p.title)}`,
          companyId: company.id,
          categoryId,
          title: p.title,
          priceMin: p.min,
          priceMax: p.max,
          moq: p.moq,
          moqUnit: p.unit,
          status: ProductStatus.LIVE,
          publishedAt: new Date(),
          supportsSample: true,
          supportsEscrow: s.tier !== PlanTier.FREE,
        },
      });
    }
  }

  await prisma.user.upsert({
    where: { email: "buyer@demo.tarf.test" },
    update: {},
    create: {
      email: "buyer@demo.tarf.test",
      name: "Demo Buyer",
      emailVerified: new Date(),
      buyerProfile: { create: { companyName: "Acme Imports LLC", country: "US", interestedIn: ["consumer-electronics"] } },
    },
  });
}

async function seedSuperAdmin(superAdminRoleId: string): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@tarf.test";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Super Admin", emailVerified: new Date() },
  });
  await prisma.staffMember.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, roleId: superAdminRoleId },
  });
}

async function main(): Promise<void> {
  const cats = await seedCategories();
  const { superAdminRoleId, ownerRoleId } = await seedAccess();
  const plans = await seedPlansAndBadges();
  await seedDemo(cats, plans, ownerRoleId);
  await seedSuperAdmin(superAdminRoleId);
  console.log(`Seeded ${cats.size} categories, 3 suppliers, ${products.length} products, 1 buyer, 1 super-admin.`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
