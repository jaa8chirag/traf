// CP-0 seed STUB. Idempotent (upserts). Run: npm run db:seed
// The L1 list below is a placeholder until the full taxonomy file is provided;
// CP-2 replaces it with the real importer.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { applyTaxonomy } from "../src/modules/catalog/taxonomy-apply";
import { planTaxonomy, slugify, type TaxonomyNode } from "../src/modules/catalog/taxonomy";
import { PrismaClient, type AttributeType, PlanTier, BusinessType, RoleScope, ProductStatus, CompanyStatus } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});


const tree: TaxonomyNode[] = [
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
  const plan = planTaxonomy(tree);
  await applyTaxonomy(prisma, plan, { prune: true });
  const rows = await prisma.category.findMany({ where: { isActive: true }, select: { slug: true, id: true } });
  return new Map(rows.map((r) => [r.slug, r.id])); // slug -> id
}


async function seedAttributes(cats: Map<string, string>): Promise<void> {
  const opt = (...v: string[]) => v.map((x) => ({ value: x.toLowerCase().replace(/\s+/g, "-"), label: x }));
  const defs: Array<{ cat: string; key: string; label: string; type: AttributeType; unit?: string; options?: { value: string; label: string }[]; isRequired?: boolean; isFilterable?: boolean; sortOrder: number }> = [
    { cat: "mobile-accessories", key: "brand", label: "Brand", type: "TEXT", sortOrder: 1 },
    { cat: "mobile-accessories", key: "color", label: "Colour", type: "SELECT", options: opt("Black", "White", "Silver", "Blue"), isFilterable: true, sortOrder: 2 },
    { cat: "chargers", key: "wattage", label: "Output power", type: "NUMBER", unit: "W", isRequired: true, isFilterable: true, sortOrder: 10 },
    { cat: "chargers", key: "ports", label: "Ports", type: "MULTI_SELECT", options: opt("USB-A", "USB-C"), isFilterable: true, sortOrder: 11 },
    { cat: "chargers", key: "gan", label: "GaN technology", type: "BOOLEAN", isFilterable: true, sortOrder: 12 },
    { cat: "tiles-and-flooring", key: "finish", label: "Surface finish", type: "SELECT", options: opt("Glossy", "Matt", "Polished", "Rustic"), isFilterable: true, sortOrder: 1 },
    { cat: "ceramic-tiles", key: "size", label: "Size", type: "SELECT", options: opt("300x600 mm", "600x600 mm", "800x800 mm"), isRequired: true, isFilterable: true, sortOrder: 10 },
    { cat: "ceramic-tiles", key: "thickness", label: "Thickness", type: "NUMBER", unit: "mm", sortOrder: 11 },
  ];
  for (const d of defs) {
    const categoryId = cats.get(d.cat);
    if (!categoryId) throw new Error(`Seed attribute category missing: ${d.cat}`);
    const { cat: _cat, key, ...rest } = d;
    void _cat;
    await prisma.attributeDefinition.upsert({
      where: { categoryId_key: { categoryId, key } },
      update: {},
      create: { categoryId, key, ...rest, options: rest.options ?? undefined },
    });
  }
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
  const grants: Record<string, string[]> = {
    super_admin: ["admin.access", "supplier.verify", "product.moderate", "rfq.review", "review.moderate", "order.view", "order.release_escrow", "dispute.resolve", "plan.manage", "report.view", "cms.publish", "support.reply", "staff.manage", "category.manage"],
    verification: ["admin.access", "supplier.verify", "product.moderate", "rfq.review", "review.moderate"],
    finance: ["admin.access", "order.view", "order.release_escrow", "dispute.resolve", "plan.manage", "report.view"],
    support: ["admin.access", "support.reply", "order.view"],
    content: ["admin.access", "cms.publish", "product.moderate", "category.manage"],
    supplier_owner: ["company.manage", "product.manage", "inquiry.reply", "order.manage", "team.manage", "billing.manage"],
    supplier_sales: ["inquiry.reply", "order.manage"],
    supplier_product_manager: ["product.manage"],
  };
  const permissionIds = new Map<string, string>();
  for (const key of new Set(Object.values(grants).flat())) {
    const p = await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
    permissionIds.set(key, p.id);
  }
  for (const [roleKey, keys] of Object.entries(grants)) {
    for (const key of keys) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: out.get(roleKey)!, permissionId: permissionIds.get(key)! } },
        update: {},
        create: { roleId: out.get(roleKey)!, permissionId: permissionIds.get(key)! },
      });
    }
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
        update: { categoryId }, // re-point if the category was re-imported/renamed
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


const cmsPages: Array<{ type: "LEGAL" | "HELP" | "BLOG"; slug: string; title: string; seoDesc: string; body: string }> = [
  { type: "LEGAL", slug: "terms", title: "Terms of use", seoDesc: "The terms that govern your use of Tarf.", body: `## About these terms

These terms apply to everyone who uses Tarf as a buyer, supplier or visitor. **This is a starter template and must be reviewed by counsel before launch.**

## Accounts

- You are responsible for activity on your account.
- Information you provide must be accurate.

## Marketplace role

Tarf connects buyers and suppliers. Contracts are made between buyer and supplier, except for orders placed through Secured Trading, where Tarf holds payment in escrow under the Secured Trading rules.` },
  { type: "LEGAL", slug: "privacy", title: "Privacy policy", seoDesc: "How Tarf collects and uses personal data.", body: `## What we collect

Account details, company information, messages and order records. **This is a starter template and must be reviewed by counsel before launch.**

## How we use it

- To operate the marketplace and verify suppliers.
- To prevent fraud and resolve disputes.

## Your choices

Contact [support](/help) to access or delete your data.` },
  { type: "HELP", slug: "how-to-buy", title: "How to buy on Tarf", seoDesc: "Find suppliers, compare offers and order safely.", body: `## 1. Find products

Browse [categories](/categories) or search by keyword. Compare price ranges and minimum order quantities.

## 2. Check the supplier

Look for the **Verified**, **Audited**, Gold and Diamond badges.

## 3. Send an inquiry

Create a free account, then message the supplier with your requirements.

## 4. Order safely

Use [Secured Trading](/secured-trading) to pay into escrow.` },
  { type: "HELP", slug: "how-to-sell", title: "How to sell on Tarf", seoDesc: "Register, get verified and list products.", body: `## 1. Register

[Create a supplier account](/register?as=supplier).

## 2. Complete your company profile

Add company details and upload your business licence.

## 3. Get verified

Our team reviews documents, usually within 1–2 business days.

## 4. List products

Choose a category, fill in the specifications, add photos and price tiers, and submit for review.` },
  { type: "HELP", slug: "secured-trading", title: "How Secured Trading works", seoDesc: "Escrow-protected payments explained.", body: `## Escrow in four steps

- You place an order and pay into escrow.
- The supplier produces and ships.
- You confirm receipt.
- Funds are released to the supplier.

If something goes wrong you can open a dispute before release.` },
  { type: "BLOG", slug: "how-to-vet-a-supplier", title: "How to vet a supplier before your first order", seoDesc: "A practical checklist for evaluating overseas manufacturers.", body: `## Start with verification

Check that the company is **Verified** and, where possible, **Audited**.

## Ask for the right documents

- Business licence and tax registration
- Quality certificates relevant to your market
- Recent export references

## Order a sample first

Samples reveal quality and communication. Use [Secured Trading](/secured-trading) for the larger order.` },
];

async function seedContent(): Promise<void> {
  for (const [i, p] of cmsPages.entries()) {
    await prisma.cmsPage.upsert({
      where: { type_slug_locale: { type: p.type, slug: p.slug, locale: "en" } },
      update: {},
      create: { ...p, locale: "en", published: true, publishedAt: new Date(Date.now() - i * 86_400_000) },
    });
  }
  // Home hero slides ("what we do"). Replaces earlier demo banners (static assets under /banners).
  await prisma.banner.deleteMany({ where: { placement: "HOME_HERO", imageUrl: { startsWith: "/banners/" } } });
  await prisma.banner.createMany({
    data: [
      { placement: "HOME_HERO", sortOrder: 0, imageUrl: "/banners/hero-sourcing.webp", title: "Source directly from verified manufacturers", subtitle: "Compare MOQs and prices across thousands of products, then message suppliers in one click.", ctaLabel: "Browse categories", linkUrl: "/categories" },
      { placement: "HOME_HERO", sortOrder: 1, imageUrl: "/banners/hero-secured.webp", title: "Pay safely with Secured Trading", subtitle: "Your payment is held in escrow and released only after you confirm the goods arrived.", ctaLabel: "How escrow works", linkUrl: "/secured-trading" },
      { placement: "HOME_HERO", sortOrder: 2, imageUrl: "/banners/hero-audited.webp", title: "Work with audited, trusted suppliers", subtitle: "Verified documents and third-party factory audits, with Gold and Diamond member badges.", ctaLabel: "Find suppliers", linkUrl: "/suppliers?audited=1" },
      { placement: "HOME_HERO", sortOrder: 3, imageUrl: "/banners/hero-global.webp", title: "Sell your products worldwide", subtitle: "List products, receive inquiries from global buyers and grow with Tarf membership.", ctaLabel: "Start selling", linkUrl: "/register?as=supplier" },
    ],
  });
  // A few ratings/tags so cards and structured data have something to show.
  await prisma.product.updateMany({ where: { slug: { contains: "65w-gan" } }, data: { ratingAvg: 4.8, ratingCount: 42, topTag: "Top rated" } });
  await prisma.product.updateMany({ where: { slug: { contains: "vitrified" } }, data: { ratingAvg: 4.5, ratingCount: 17 } });
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
  await seedAttributes(cats);
  const { superAdminRoleId, ownerRoleId } = await seedAccess();
  const plans = await seedPlansAndBadges();
  await seedDemo(cats, plans, ownerRoleId);
  await seedSuperAdmin(superAdminRoleId);
  await seedContent();
  console.log(`Seeded ${cats.size} categories, 3 suppliers, ${products.length} products, 1 buyer, 1 super-admin.`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
