// End-to-end CP-2 workflow against the compose Postgres: onboarding -> verification -> product -> moderation.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/providers/storage", () => ({
  storage: () => ({
    exists: async () => true,
    delete: async () => undefined,
    publicUrl: (k: string) => `http://cdn.test/${k}`,
    signedGetUrl: async (k: string) => `http://signed.test/${k}`,
    presignUpload: async () => ({ url: "http://put.test", headers: {} }),
  }),
}));

const { prisma } = await import("@/lib/db");
const supplier = await import("@/modules/supplier");
const catalog = await import("@/modules/catalog");
import type { CurrentSession } from "@/modules/identity";

const run = Date.now().toString(36);
const OWNER_PERMS = ["company.manage", "product.manage", "inquiry.reply", "order.manage", "team.manage", "billing.manage"];

let adminId = "";
let leafId = "";
let leafSlug = "";
const created = { userIds: [] as string[], companyIds: [] as string[], attrIds: [] as string[] };

async function makeSupplier(tag: string): Promise<{ session: CurrentSession; companyId: string }> {
  const user = await prisma.user.create({ data: { email: `${tag}-${run}@test.tarf`, name: tag } });
  const company = await prisma.company.create({
    data: { ownerId: user.id, slug: `co-${tag}-${run}`, name: "My company", supplierProfile: { create: {} } },
  });
  created.userIds.push(user.id);
  created.companyIds.push(company.id);
  return {
    companyId: company.id,
    session: {
      user: { id: user.id, email: user.email, name: tag },
      access: {
        isBuyer: false,
        staff: null,
        companies: [{ companyId: company.id, companySlug: company.slug, companyName: company.name, roleKey: "supplier_owner", permissions: new Set(OWNER_PERMS) }],
      },
    },
  };
}

const staff = (perms: string[], roleKey = "verification"): CurrentSession => ({
  user: { id: adminId, email: "admin@tarf.test", name: "Admin" },
  access: { isBuyer: false, companies: [], staff: { roleKey, permissions: new Set(perms) } },
});

const profile = (slug: string) => ({
  name: "Acme Widgets Pvt Ltd",
  slug,
  businessType: "MANUFACTURER",
  rd: ["OEM"],
  country: "in",
  province: "Gujarat",
  city: "Surat",
  description: "We make widgets.",
});

const productForm = (over: Record<string, unknown> = {}) => ({
  title: "Aluminium Phone Stand",
  moq: "100",
  moqUnit: "pieces",
  priceMin: "1.5",
  priceMax: "2.5",
  media: [],
  ...over,
});

beforeAll(async () => {
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: "admin@tarf.test" } })).id;
  const leaf = await prisma.category.findFirstOrThrow({ where: { isLeaf: true, isActive: true, slug: "led-bulbs" } });
  leafId = leaf.id;
  leafSlug = leaf.slug;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entityId: { in: [...created.companyIds, ...created.attrIds, leafId] }, action: { startsWith: "attribute" } } });
  const products = await prisma.product.findMany({ where: { companyId: { in: created.companyIds } }, select: { id: true } });
  const ids = [...created.companyIds, ...products.map((p) => p.id)];
  await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: ids } } });
  await prisma.attributeDefinition.deleteMany({ where: { key: { endsWith: `_${run}` } } });
  await prisma.company.deleteMany({ where: { id: { in: created.companyIds } } });
  await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
  await prisma.$disconnect();
});

describe("supplier onboarding and verification", () => {
  let s: Awaited<ReturnType<typeof makeSupplier>>;
  const other = { session: undefined as unknown as CurrentSession, companyId: "" };

  it("rejects an invalid profile with field errors, then accepts a valid one", async () => {
    s = await makeSupplier("sup");
    Object.assign(other, await makeSupplier("oth"));
    const bad = await supplier.updateCompanyProfile(s.session, s.companyId, { ...profile("ab"), country: "India" });
    expect(bad.ok).toBe(false);
    expect(!bad.ok && Object.keys(bad.fieldErrors ?? {})).toEqual(expect.arrayContaining(["slug", "country"]));

    const good = await supplier.updateCompanyProfile(s.session, s.companyId, profile(`acme-${run}`));
    expect(good.ok).toBe(true);
    const row = await prisma.company.findUniqueOrThrow({ where: { id: s.companyId } });
    expect(row).toMatchObject({ name: "Acme Widgets Pvt Ltd", country: "IN", status: "DRAFT" });
  });

  it("refuses a duplicate showroom slug and another company's session", async () => {
    const dup = await supplier.updateCompanyProfile(other.session, other.companyId, profile(`acme-${run}`));
    expect(!dup.ok && dup.fieldErrors?.slug).toBeTruthy();
    const cross = await supplier.updateCompanyProfile(other.session, s.companyId, profile(`zzz-${run}`));
    expect(cross).toEqual({ ok: false, error: "Not allowed" });
  });

  it("requires a licence before submission and rejects foreign upload keys", async () => {
    expect((await supplier.submitForVerification(s.session, s.companyId)).ok).toBe(false);
    const wrong = await supplier.addCompanyDocument(s.session, s.companyId, { type: "BUSINESS_LICENCE", key: `private/companies/${other.companyId}/x.pdf` });
    expect(wrong.ok).toBe(false);
    const right = await supplier.addCompanyDocument(s.session, s.companyId, { type: "BUSINESS_LICENCE", key: `private/companies/${s.companyId}/lic.pdf` });
    expect(right.ok).toBe(true);
    expect((await supplier.submitForVerification(s.session, s.companyId)).ok).toBe(true);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: s.companyId } })).status).toBe("PENDING_VERIFICATION");
    expect((await supplier.submitForVerification(s.session, s.companyId)).ok).toBe(false);
  });

  it("only staff with supplier.verify can approve; approval grants the badge and writes audit + event", async () => {
    expect((await supplier.approveCompany(s.session, s.companyId)).ok).toBe(false);
    expect((await supplier.approveCompany(staff(["product.moderate"]), s.companyId)).ok).toBe(false);
    expect((await supplier.approveCompany(staff(["supplier.verify"]), s.companyId)).ok).toBe(true);

    const company = await prisma.company.findUniqueOrThrow({ where: { id: s.companyId }, include: { badges: { include: { badge: true } }, documents: true } });
    expect(company.status).toBe("VERIFIED");
    expect(company.badges.map((b) => b.badge.key)).toContain("verified");
    expect(company.documents.every((d) => d.state === "APPROVED")).toBe(true);
    expect(await prisma.auditLog.count({ where: { entityId: s.companyId, action: "supplier.verified" } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: s.companyId, type: "supplier.verified" } })).toBe(1);

    // verified slugs are frozen
    const rename = await supplier.updateCompanyProfile(s.session, s.companyId, profile(`new-${run}`));
    expect(rename.ok).toBe(false);
  });

  it("rejection needs a reason and returns the company to a resubmittable state", async () => {
    const o = other;
    await supplier.updateCompanyProfile(o.session, o.companyId, profile(`oth-${run}`));
    await supplier.addCompanyDocument(o.session, o.companyId, { type: "BUSINESS_LICENCE", key: `private/companies/${o.companyId}/l.pdf` });
    await supplier.submitForVerification(o.session, o.companyId);
    expect((await supplier.rejectCompany(staff(["supplier.verify"]), o.companyId, "no")).ok).toBe(false);
    expect((await supplier.rejectCompany(staff(["supplier.verify"]), o.companyId, "Licence is unreadable")).ok).toBe(true);
    expect((await prisma.company.findUniqueOrThrow({ where: { id: o.companyId } })).status).toBe("REJECTED");
    expect((await supplier.submitForVerification(o.session, o.companyId)).ok).toBe(true);
  });

  describe("products", () => {
    const mediaKey = () => `public/products/${s.companyId}/img.jpg`;
    let productId = "";
    let attrKey = "";

    it("admin defines a required spec for the category; non-admins cannot", async () => {
      attrKey = `wattage_${run}`;
      const input = { key: attrKey, label: "Wattage", type: "NUMBER", unit: "W", isRequired: true, isFilterable: true };
      expect((await catalog.saveAttribute(s.session, leafId, input)).ok).toBe(false);
      expect((await catalog.saveAttribute(staff(["category.manage"], "content"), leafId, input)).ok).toBe(true);
      const defs = await catalog.getEffectiveAttributes(leafId);
      expect(defs.find((d) => d.key === attrKey)).toMatchObject({ type: "NUMBER", isRequired: true });
    });

    it("saves a draft without required specs, but submission enforces them", async () => {
      const draft = await catalog.saveProduct(s.session, { companyId: s.companyId, categoryId: leafId, input: productForm({ media: [{ type: "IMAGE", key: mediaKey() }] }), attrs: {}, submit: false });
      expect(draft.ok && draft.value.status).toBe("DRAFT");
      productId = draft.ok ? draft.value.id : "";

      const submitNoAttr = await catalog.saveProduct(s.session, { companyId: s.companyId, productId, categoryId: leafId, input: productForm({ media: [{ type: "IMAGE", key: mediaKey() }] }), attrs: {}, submit: true });
      expect(!submitNoAttr.ok && submitNoAttr.fieldErrors?.[`attr.${attrKey}`]).toMatch(/required/);

      const submitBadAttr = await catalog.saveProduct(s.session, { companyId: s.companyId, productId, categoryId: leafId, input: productForm({ media: [{ type: "IMAGE", key: mediaKey() }] }), attrs: { [attrKey]: "lots" }, submit: true });
      expect(submitBadAttr.ok).toBe(false);

      const noImage = await catalog.saveProduct(s.session, { companyId: s.companyId, productId, categoryId: leafId, input: productForm({ media: [] }), attrs: { [attrKey]: "65" }, submit: true });
      expect(!noImage.ok && noImage.fieldErrors?.media).toBeTruthy();
    });

    it("submits with valid specs, tiers and media; the listing is stored correctly", async () => {
      const input = productForm({
        media: [{ type: "IMAGE", key: mediaKey() }],
        tiers: [{ minQty: 100, maxQty: 499, unitPrice: "2.5" }, { minQty: 500, unitPrice: "1.5" }],
      });
      const res = await catalog.saveProduct(s.session, { companyId: s.companyId, productId, categoryId: leafId, input, attrs: { [attrKey]: "65" }, submit: true });
      expect(res.ok && res.value.status).toBe("PENDING_REVIEW");

      const p = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { priceTiers: true, media: true, attributes: true } });
      expect(p.priceTiers).toHaveLength(2);
      expect(p.media).toHaveLength(1);
      expect(p.attributes[0].valueNumber?.toString()).toBe("65");
      expect(await prisma.outboxEvent.count({ where: { aggregateId: productId, type: "product.submitted" } })).toBe(1);
    });

    it("rejects media keys from another company", async () => {
      const res = await catalog.saveProduct(s.session, { companyId: s.companyId, productId, categoryId: leafId, input: productForm({ media: [{ type: "IMAGE", key: `public/products/${other.companyId}/x.jpg` }] }), attrs: { [attrKey]: "65" }, submit: false });
      expect(res.ok).toBe(false);
    });

    it("another company cannot read or change this product", async () => {
      expect(await catalog.getProductForEdit(other.session, s.companyId, productId)).toBeNull();
      expect(await catalog.getProductForEdit(other.session, other.companyId, productId)).toBeNull();
      const res = await catalog.saveProduct(other.session, { companyId: other.companyId, productId, categoryId: leafId, input: productForm(), attrs: {}, submit: false });
      expect(res).toEqual({ ok: false, error: "Product not found" });
    });

    it("moderation: needs permission; approve publishes, reject requires a reason", async () => {
      expect((await catalog.approveProduct(s.session, productId)).ok).toBe(false);
      expect((await catalog.approveProduct(staff(["supplier.verify"]), productId)).ok).toBe(false);
      expect((await catalog.rejectProduct(staff(["product.moderate"]), productId, "  ")).ok).toBe(false);
      expect((await catalog.approveProduct(staff(["product.moderate"]), productId)).ok).toBe(true);
      const live = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
      expect(live.status).toBe("LIVE");
      expect(live.publishedAt).not.toBeNull();
      expect((await catalog.approveProduct(staff(["product.moderate"]), productId)).ok).toBe(false);

      // editing a live product sends it back to review
      const edit = await catalog.saveProduct(s.session, { companyId: s.companyId, productId, categoryId: leafId, input: productForm({ title: "Aluminium Phone Stand V2", media: [{ type: "IMAGE", key: mediaKey() }] }), attrs: { [attrKey]: "65" }, submit: false });
      expect(edit.ok && edit.value.status).toBe("PENDING_REVIEW");
      expect((await catalog.rejectProduct(staff(["product.moderate"]), productId, "Title is misleading")).ok).toBe(true);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).moderationNote).toBe("Title is misleading");
    });

    it("unverified companies cannot submit for review", async () => {
      const fresh = await makeSupplier("unv");
      const res = await catalog.saveProduct(fresh.session, { companyId: fresh.companyId, categoryId: leafId, input: productForm({ media: [{ type: "IMAGE", key: `public/products/${fresh.companyId}/a.jpg` }] }), attrs: { [attrKey]: "1" }, submit: true });
      expect(res.ok).toBe(false);
    });

    it("bulk CSV creates valid drafts and reports bad lines; the plan limit is enforced", async () => {
      const csv = `title,category_slug,moq,moq_unit,price_min,price_max\n` +
        `CSV Product One,${leafSlug},10,pcs,1,2\n` +
        `CSV Product Two,no-such-category,10,pcs,1,2\n` +
        `x,${leafSlug},10,pcs,1,2\n`;
      const res = await catalog.importProductsCsv(s.session, s.companyId, csv);
      expect(res.ok && res.value.created).toBe(1);
      expect(res.ok && res.value.errors.map((e) => e.line)).toEqual([3, 4]);

      // Free plan = 10 products; we already have 2.
      const many = `title,category_slug,moq,moq_unit\n` + Array.from({ length: 12 }, (_, i) => `Bulk Widget ${i},${leafSlug},1,pcs`).join("\n");
      const limited = await catalog.importProductsCsv(s.session, s.companyId, many);
      expect(limited.ok && limited.value.created).toBe(8);
      expect(limited.ok && limited.value.errors.filter((e) => /limit/.test(e.message))).toHaveLength(4);
      const blocked = await catalog.saveProduct(s.session, { companyId: s.companyId, categoryId: leafId, input: productForm(), attrs: {}, submit: false });
      expect(!blocked.ok && blocked.error).toMatch(/plan allows 10/);
    });
  });
});
