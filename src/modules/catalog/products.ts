import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/events/audit";
import { emit } from "@/lib/events/outbox";
import { storage } from "@/lib/providers/storage";
import { fail, ok, type Result } from "@/lib/result";
import { can, type CurrentSession } from "@/modules/identity";
import { validateAttributeValues, type RawAttrs } from "./attributes";
import { getEffectiveAttributes } from "./categories";
import { flattenZodErrors, parseProductCsv, productInputSchema, type ProductInput } from "./product-schemas";
import { slugify } from "./taxonomy";

const DEFAULT_PRODUCT_LIMIT = 10;
const PAGE_SIZE = 20;

const mediaPrefix = (companyId: string) => `public/products/${companyId}/`;
const newSlug = (title: string) => `${slugify(title).slice(0, 60) || "product"}-${randomBytes(3).toString("hex")}`;

async function productLimit(companyId: string): Promise<number> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { tier: true } });
  const plan = company ? await prisma.membershipPlan.findUnique({ where: { tier: company.tier } }) : null;
  return plan?.maxProducts ?? DEFAULT_PRODUCT_LIMIT;
}

function guard(session: CurrentSession, companyId: string): Result<void> {
  return can(session.access, "product.manage", { companyId }) ? ok(undefined) : fail("Not allowed");
}

/* ───────────── Supplier reads ───────────── */

export async function listCompanyProducts(session: CurrentSession, companyId: string, page = 1) {
  if (!guard(session, companyId).ok) return null;
  const where = { companyId };
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (Math.max(1, page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, status: true, moderationNote: true, moq: true, moqUnit: true, priceMin: true, priceMax: true, currency: true, updatedAt: true, category: { select: { name: true } } },
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getProductForEdit(session: CurrentSession, companyId: string, productId: string) {
  if (!guard(session, companyId).ok) return null;
  const p = await prisma.product.findFirst({
    where: { id: productId, companyId },
    include: { attributes: { include: { attribute: { select: { key: true } } } }, priceTiers: { orderBy: { minQty: "asc" } }, media: { orderBy: { sortOrder: "asc" } } },
  });
  if (!p) return null;
  const attrs: Record<string, string | string[]> = {};
  for (const a of p.attributes) {
    attrs[a.attribute.key] = a.valueJson ? (a.valueJson as string[]) : a.valueBool !== null ? String(a.valueBool) : a.valueNumber !== null ? a.valueNumber.toString() : (a.valueText ?? "");
  }
  return { ...p, attrs, media: p.media.map((m) => ({ ...m, viewUrl: storage().publicUrl(m.url) })) };
}

/* ───────────── Supplier writes ───────────── */

export interface SaveProductArgs {
  companyId: string;
  productId?: string;
  categoryId: string;
  input: unknown;
  attrs: RawAttrs;
  submit: boolean;
}

export async function saveProduct(session: CurrentSession, a: SaveProductArgs): Promise<Result<{ id: string; status: string }>> {
  const g = guard(session, a.companyId);
  if (!g.ok) return g;

  const parsed = productInputSchema.safeParse(a.input);
  if (!parsed.success) return fail("Please fix the highlighted fields", flattenZodErrors(parsed.error));
  const input: ProductInput = parsed.data;

  const [company, category, existing] = await Promise.all([
    prisma.company.findUnique({ where: { id: a.companyId } }),
    prisma.category.findUnique({ where: { id: a.categoryId } }),
    a.productId ? prisma.product.findFirst({ where: { id: a.productId, companyId: a.companyId }, include: { media: true } }) : null,
  ]);
  if (!company || company.status === "SUSPENDED") return fail("This company cannot list products");
  if (!category || !category.isActive || !category.isLeaf) return fail("Choose the most specific (last-level) category", { category: "Pick a final category" });
  if (a.productId && !existing) return fail("Product not found");

  // Specs: types always validated; "required" only enforced when submitting for review.
  const defs = await getEffectiveAttributes(category.id);
  const attrResult = validateAttributeValues(a.submit ? defs : defs.map((d) => ({ ...d, isRequired: false })), a.attrs);
  if (!attrResult.ok) return fail("Please fix the specifications", Object.fromEntries(Object.entries(attrResult.errors).map(([k, v]) => [`attr.${k}`, v])));

  // Media: keys must be this company's, and any newly added object must really exist.
  const known = new Set(existing?.media.map((m) => m.url) ?? []);
  for (const m of input.media) {
    if (!m.key.startsWith(mediaPrefix(a.companyId)) || m.key.includes("..")) return fail("Invalid media upload");
    if (!known.has(m.key) && !(await storage().exists(m.key))) return fail("A media upload was not found; please upload it again");
  }

  if (a.submit) {
    const problems: Record<string, string> = {};
    if (company.status !== "VERIFIED") problems.form = "Your company must be verified before products can be submitted";
    if (!input.media.some((m) => m.type === "IMAGE")) problems.media = "Add at least one image";
    if (input.priceMin === undefined) problems.priceMin = "Enter a price range";
    if (Object.keys(problems).length) return fail(problems.form ?? "Complete the listing before submitting", problems);
  }

  if (!existing) {
    const [count, limit] = await Promise.all([prisma.product.count({ where: { companyId: a.companyId } }), productLimit(a.companyId)]);
    if (count >= limit) return fail(`Your plan allows ${limit} products. Upgrade to add more.`);
  }

  const status = a.submit ? "PENDING_REVIEW" : existing && (existing.status === "LIVE" || existing.status === "PENDING_REVIEW") ? "PENDING_REVIEW" : "DRAFT";
  const data = {
    categoryId: category.id,
    title: input.title,
    summary: input.summary || null,
    description: input.description || null,
    keywords: input.keywords,
    currency: input.currency,
    priceMin: input.priceMin ?? null,
    priceMax: input.priceMax ?? input.priceMin ?? null,
    moq: input.moq,
    moqUnit: input.moqUnit,
    leadTimeDays: input.leadTimeDays ?? null,
    supportsSample: input.supportsSample,
    samplePrice: input.supportsSample ? (input.samplePrice ?? null) : null,
    hasVideo: input.media.some((m) => m.type === "VIDEO"),
    status,
    moderationNote: null,
  } satisfies Prisma.ProductUncheckedUpdateInput;

  const id = await prisma.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data })
      : await tx.product.create({ data: { ...data, companyId: a.companyId, slug: newSlug(input.title) } });

    await tx.productAttributeValue.deleteMany({ where: { productId: product.id } });
    if (attrResult.values.length) {
      await tx.productAttributeValue.createMany({
        data: attrResult.values.map((v) => ({
          productId: product.id,
          attributeId: v.attributeId,
          valueText: v.valueText,
          valueNumber: v.valueNumber,
          valueBool: v.valueBool,
          valueJson: v.valueJson ?? undefined,
        })),
      });
    }
    await tx.priceTier.deleteMany({ where: { productId: product.id } });
    if (input.tiers.length) {
      await tx.priceTier.createMany({ data: input.tiers.map((t) => ({ productId: product.id, minQty: t.minQty, maxQty: t.maxQty ?? null, unitPrice: t.unitPrice })) });
    }
    await tx.productMedia.deleteMany({ where: { productId: product.id } });
    if (input.media.length) {
      await tx.productMedia.createMany({ data: input.media.map((m, i) => ({ productId: product.id, type: m.type, url: m.key, sortOrder: i })) });
    }
    if (status === "PENDING_REVIEW") await emit(tx, a.submit ? "product.submitted" : "product.updated", product.id, { companyId: a.companyId });
    return product.id;
  });

  // Drop storage objects the supplier removed from the listing (best effort).
  const keep = new Set(input.media.map((m) => m.key));
  for (const m of existing?.media ?? []) if (!keep.has(m.url)) await storage().delete(m.url).catch(() => undefined);

  return ok({ id, status });
}

export async function deleteProduct(session: CurrentSession, companyId: string, productId: string): Promise<Result<void>> {
  const g = guard(session, companyId);
  if (!g.ok) return g;
  const p = await prisma.product.findFirst({ where: { id: productId, companyId } });
  if (!p) return fail("Product not found");
  if (p.status !== "DRAFT" && p.status !== "REJECTED") return fail("Only drafts and rejected products can be deleted; unlist live ones instead");
  await prisma.product.delete({ where: { id: p.id } });
  return ok(undefined);
}

export interface CsvImportResult {
  created: number;
  errors: Array<{ line: number; message: string }>;
}

/** Bulk CSV -> DRAFT products. Valid rows are created; invalid rows are reported with line numbers. */
export async function importProductsCsv(session: CurrentSession, companyId: string, text: string): Promise<Result<CsvImportResult>> {
  const g = guard(session, companyId);
  if (!g.ok) return g;
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true } });
  if (!company || company.status === "SUSPENDED") return fail("This company cannot list products");

  const { rows, errors } = parseProductCsv(text);
  if (!rows.length) return ok({ created: 0, errors });

  const slugs = [...new Set(rows.map((r) => r.categorySlug))];
  const cats = await prisma.category.findMany({ where: { slug: { in: slugs }, isActive: true, isLeaf: true }, select: { id: true, slug: true } });
  const bySlug = new Map(cats.map((c) => [c.slug, c.id]));

  const [count, limit] = await Promise.all([prisma.product.count({ where: { companyId } }), productLimit(companyId)]);
  let room = Math.max(0, limit - count);
  const data: Prisma.ProductCreateManyInput[] = [];
  for (const r of rows) {
    const categoryId = bySlug.get(r.categorySlug);
    if (!categoryId) {
      errors.push({ line: r.line, message: `category_slug "${r.categorySlug}" is not a valid final category` });
      continue;
    }
    if (room <= 0) {
      errors.push({ line: r.line, message: `Plan limit of ${limit} products reached` });
      continue;
    }
    room--;
    const i = r.input;
    data.push({
      companyId, categoryId, slug: newSlug(i.title), title: i.title, summary: i.summary || null, keywords: i.keywords,
      currency: i.currency, priceMin: i.priceMin ?? null, priceMax: i.priceMax ?? i.priceMin ?? null,
      moq: i.moq, moqUnit: i.moqUnit, leadTimeDays: i.leadTimeDays ?? null, status: "DRAFT",
    });
  }
  if (data.length) await prisma.product.createMany({ data });
  errors.sort((x, y) => x.line - y.line);
  return ok({ created: data.length, errors });
}

/* ───────────── Moderation (staff) ───────────── */

const MOD = "product.moderate";

export async function listPendingProducts(session: CurrentSession) {
  if (!can(session.access, MOD)) return null;
  return prisma.product.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { updatedAt: "asc" },
    take: 100,
    select: { id: true, title: true, updatedAt: true, company: { select: { name: true } }, category: { select: { name: true } } },
  });
}

export async function getProductForReview(session: CurrentSession, productId: string) {
  if (!can(session.access, MOD)) return null;
  const p = await prisma.product.findUnique({
    where: { id: productId },
    include: { company: { select: { name: true, status: true } }, category: { select: { name: true } }, media: { orderBy: { sortOrder: "asc" } }, priceTiers: { orderBy: { minQty: "asc" } }, attributes: { include: { attribute: { select: { label: true, unit: true } } } } },
  });
  if (!p) return null;
  return { ...p, media: p.media.map((m) => ({ ...m, viewUrl: storage().publicUrl(m.url) })) };
}

export async function approveProduct(session: CurrentSession, productId: string): Promise<Result<void>> {
  if (!can(session.access, MOD)) return fail("Not allowed");
  return prisma.$transaction(async (tx) => {
    const p = await tx.product.findUnique({ where: { id: productId }, include: { company: { select: { status: true } } } });
    if (!p || p.status !== "PENDING_REVIEW") return fail("This product is not awaiting review");
    if (p.company.status !== "VERIFIED") return fail("The supplier is not verified");
    await tx.product.update({ where: { id: productId }, data: { status: "LIVE", publishedAt: p.publishedAt ?? new Date(), moderatedById: session.user.id, moderationNote: null } });
    await audit(tx, { actorId: session.user.id, action: "product.approved", entityType: "Product", entityId: productId, before: { status: p.status }, after: { status: "LIVE" } });
    await emit(tx, "product.approved", productId, { by: session.user.id });
    return ok(undefined);
  });
}

export async function rejectProduct(session: CurrentSession, productId: string, note: string): Promise<Result<void>> {
  if (!can(session.access, MOD)) return fail("Not allowed");
  const reason = note.trim();
  if (reason.length < 5) return fail("Give the supplier a reason (at least 5 characters)");
  return prisma.$transaction(async (tx) => {
    const p = await tx.product.findUnique({ where: { id: productId } });
    if (!p || p.status !== "PENDING_REVIEW") return fail("This product is not awaiting review");
    await tx.product.update({ where: { id: productId }, data: { status: "REJECTED", moderatedById: session.user.id, moderationNote: reason } });
    await audit(tx, { actorId: session.user.id, action: "product.rejected", entityType: "Product", entityId: productId, before: { status: p.status }, after: { status: "REJECTED", reason } });
    await emit(tx, "product.rejected", productId, { by: session.user.id, reason });
    return ok(undefined);
  });
}
