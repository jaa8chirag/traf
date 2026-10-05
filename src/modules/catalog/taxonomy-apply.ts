// Applies a TaxonomyPlan to the database. Takes a PrismaClient so it can be used from
// the app, the CLI importer and the seed script alike (no server-only imports here).
import type { PrismaClient } from "../../generated/prisma/client";
import type { TaxonomyPlan } from "./taxonomy";

export interface ApplyResult {
  created: number;
  updated: number;
  unchanged: number;
  deactivated: number;
}

const CHUNK = 500;

export async function applyTaxonomy(
  db: PrismaClient,
  plan: TaxonomyPlan,
  opts: { prune?: boolean } = {},
): Promise<ApplyResult> {
  if (plan.errors.length) throw new Error(`Taxonomy has ${plan.errors.length} error(s):\n${plan.errors.slice(0, 20).join("\n")}`);

  const existing = await db.category.findMany();
  const byPath = new Map(existing.map((c) => [c.path, c]));
  const plannedSlugByPath = new Map(plan.rows.map((r) => [r.path, r.slug]));

  // A planned slug may not collide with a category outside this plan. With `prune`, such
  // stale rows are retired (deactivated + slug freed); otherwise the import is refused.
  const bySlug = new Map(existing.map((c) => [c.slug, c]));
  const retire: Array<{ id: string; slug: string }> = [];
  for (const r of plan.rows) {
    const holder = bySlug.get(r.slug);
    if (!holder || holder.path === r.path) continue;
    if (!plannedSlugByPath.has(holder.path) && opts.prune) {
      retire.push({ id: holder.id, slug: holder.slug });
    } else if (!plannedSlugByPath.has(holder.path) || plannedSlugByPath.get(holder.path) === r.slug) {
      throw new Error(`Slug "${r.slug}" for ${r.path} is already used by ${holder.path} (re-run with --prune to retire stale categories)`);
    }
  }
  for (const h of retire) {
    await db.category.update({ where: { id: h.id }, data: { slug: `${h.slug}--retired-${h.id}`, isActive: false } });
  }

  const ids = new Map(existing.map((c) => [c.path, c.id]));
  const result: ApplyResult = { created: 0, updated: 0, unchanged: 0, deactivated: 0 };

  const levels = [...new Set(plan.rows.map((r) => r.level))].sort((a, b) => a - b);
  for (const level of levels) {
    const rows = plan.rows.filter((r) => r.level === level);
    const toCreate = rows.filter((r) => !byPath.has(r.path));

    for (let i = 0; i < toCreate.length; i += CHUNK) {
      await db.category.createMany({
        data: toCreate.slice(i, i + CHUNK).map((r) => ({
          parentId: r.parentPath ? ids.get(r.parentPath) : null,
          level: r.level,
          slug: r.slug,
          path: r.path,
          name: r.name,
          nameI18n: r.nameI18n ?? undefined,
          sortOrder: r.sortOrder,
          isLeaf: r.isLeaf,
        })),
      });
    }
    if (toCreate.length) {
      const created = await db.category.findMany({
        where: { path: { in: toCreate.map((r) => r.path) } },
        select: { id: true, path: true },
      });
      for (const c of created) ids.set(c.path, c.id);
      result.created += toCreate.length;
    }

    const updates = rows.filter((r) => {
      const c = byPath.get(r.path);
      if (!c) return false;
      const changed =
        c.name !== r.name ||
        c.slug !== r.slug ||
        c.level !== r.level ||
        c.sortOrder !== r.sortOrder ||
        c.isLeaf !== r.isLeaf ||
        !c.isActive ||
        c.parentId !== (r.parentPath ? ids.get(r.parentPath) : null) ||
        (r.nameI18n !== undefined && JSON.stringify(c.nameI18n) !== JSON.stringify(r.nameI18n));
      if (!changed) result.unchanged++;
      return changed;
    });
    for (let i = 0; i < updates.length; i += 100) {
      await db.$transaction(
        updates.slice(i, i + 100).map((r) =>
          db.category.update({
            where: { path: r.path },
            data: {
              name: r.name,
              slug: r.slug,
              level: r.level,
              sortOrder: r.sortOrder,
              isLeaf: r.isLeaf,
              isActive: true,
              parentId: r.parentPath ? ids.get(r.parentPath) : null,
              ...(r.nameI18n !== undefined ? { nameI18n: r.nameI18n } : {}),
            },
          }),
        ),
      );
    }
    result.updated += updates.length;
  }

  if (opts.prune) {
    const planned = new Set(plan.rows.map((r) => r.path));
    const stale = existing.filter((c) => c.isActive && !planned.has(c.path)).map((c) => c.id);
    if (stale.length) {
      await db.category.updateMany({ where: { id: { in: stale } }, data: { isActive: false } });
      result.deactivated = stale.length;
    }
  }
  return result;
}
