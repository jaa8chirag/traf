import "server-only";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/events/audit";
import { fail, ok, type Result } from "@/lib/result";
import { can, type CurrentSession } from "@/modules/identity";
import { mergeDefinitions, type AttrDef, type AttributeKind } from "./attributes";
import { z } from "zod";

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  level: number;
  isLeaf: boolean;
}

export async function listChildCategories(parentId: string | null): Promise<CategoryNode[]> {
  return prisma.category.findMany({
    where: { parentId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, level: true, isLeaf: true },
  });
}

/** Root -> ... -> category, for breadcrumbs and attribute inheritance. */
export async function getCategoryChain(categoryId: string): Promise<CategoryNode[]> {
  const chain: CategoryNode[] = [];
  let id: string | null = categoryId;
  for (let guard = 0; id && guard < 6; guard++) {
    const c: (CategoryNode & { parentId: string | null }) | null = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, level: true, isLeaf: true, parentId: true },
    });
    if (!c) break;
    chain.unshift(c);
    id = c.parentId;
  }
  return chain;
}

function toDef(d: {
  id: string;
  key: string;
  label: string;
  type: AttributeKind;
  unit: string | null;
  options: unknown;
  isRequired: boolean;
}): AttrDef {
  return {
    id: d.id,
    key: d.key,
    label: d.label,
    type: d.type,
    unit: d.unit,
    options: Array.isArray(d.options) ? (d.options as AttrDef["options"]) : null,
    isRequired: d.isRequired,
  };
}

/** Definitions for a category including those inherited from its ancestors (child wins on key). */
export async function getEffectiveAttributes(categoryId: string): Promise<AttrDef[]> {
  const chain = await getCategoryChain(categoryId);
  if (!chain.length) return [];
  const defs = await prisma.attributeDefinition.findMany({
    where: { categoryId: { in: chain.map((c) => c.id) } },
    orderBy: { sortOrder: "asc" },
  });
  return mergeDefinitions(chain.map((c) => defs.filter((d) => d.categoryId === c.id).map(toDef)));
}

/** Only the definitions declared directly on this category (admin editor). */
export async function getOwnAttributes(categoryId: string) {
  return prisma.attributeDefinition.findMany({ where: { categoryId }, orderBy: { sortOrder: "asc" } });
}

export const attributeInputSchema = z
  .object({
    key: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{1,39}$/, "Use lowercase letters, numbers and underscores"),
    label: z.string().trim().min(2).max(60),
    type: z.enum(["TEXT", "NUMBER", "SELECT", "MULTI_SELECT", "BOOLEAN"]),
    unit: z.string().trim().max(20).optional(),
    /** One option per line, either "value" or "value|Label". */
    optionsText: z.string().max(4000).optional(),
    isRequired: z.boolean().default(false),
    isFilterable: z.boolean().default(false),
    sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  })
  .superRefine((v, ctx) => {
    if ((v.type === "SELECT" || v.type === "MULTI_SELECT") && parseOptions(v.optionsText).length < 2) {
      ctx.addIssue({ code: "custom", path: ["optionsText"], message: "Add at least two options, one per line" });
    }
  });

export function parseOptions(text: string | undefined): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  const out: Array<{ value: string; label: string }> = [];
  for (const line of (text ?? "").split(/\r?\n/)) {
    const [v, l] = line.split("|").map((s) => s.trim());
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push({ value: v, label: l || v });
  }
  return out;
}

export async function saveAttribute(session: CurrentSession, categoryId: string, raw: unknown): Promise<Result<void>> {
  if (!can(session.access, "category.manage")) return fail("Not allowed");
  const parsed = attributeInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return fail("Please fix the highlighted fields", fieldErrors);
  }
  const v = parsed.data;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return fail("Category not found");

  const options = v.type === "SELECT" || v.type === "MULTI_SELECT" ? parseOptions(v.optionsText) : undefined;
  const data = {
    label: v.label,
    type: v.type,
    unit: v.unit || null,
    options,
    isRequired: v.isRequired,
    isFilterable: v.isFilterable,
    sortOrder: v.sortOrder,
  };
  await prisma.$transaction(async (tx) => {
    await tx.attributeDefinition.upsert({
      where: { categoryId_key: { categoryId, key: v.key } },
      update: data,
      create: { categoryId, key: v.key, ...data },
    });
    await audit(tx, { actorId: session.user.id, action: "attribute.saved", entityType: "Category", entityId: categoryId, after: { key: v.key, type: v.type } });
  });
  return ok(undefined);
}

export async function deleteAttribute(session: CurrentSession, attributeId: string): Promise<Result<void>> {
  if (!can(session.access, "category.manage")) return fail("Not allowed");
  const def = await prisma.attributeDefinition.findUnique({ where: { id: attributeId }, include: { _count: { select: { values: true } } } });
  if (!def) return fail("Attribute not found");
  if (def._count.values > 0) return fail(`In use by ${def._count.values} product(s); it cannot be deleted`);
  await prisma.$transaction(async (tx) => {
    await tx.attributeDefinition.delete({ where: { id: attributeId } });
    await audit(tx, { actorId: session.user.id, action: "attribute.deleted", entityType: "Category", entityId: def.categoryId, before: { key: def.key } });
  });
  return ok(undefined);
}
