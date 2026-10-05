// Needs the compose Postgres. Imports a ~6,500-leaf synthetic tree under a unique prefix, then cleans up.
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { applyTaxonomy } from "./taxonomy-apply";
import { planTaxonomy, type TaxonomyNode } from "./taxonomy";

const run = Date.now().toString(36);

function bigTree(): TaxonomyNode[] {
  return Array.from({ length: 27 }, (_, a) => ({
    name: `Zzfx${run} L1 ${a}`,
    children: Array.from({ length: 8 }, (_, b) => ({
      name: `Group ${b}`, // repeated across parents on purpose => slug disambiguation
      children: Array.from({ length: 6 }, (_, c) => ({
        name: `Sub ${c}`,
        children: Array.from({ length: 5 }, (_, d) => ({ name: `Leaf ${d}` })),
      })),
    })),
  }));
}

afterAll(async () => {
  for (let level = 4; level >= 1; level--) {
    await prisma.category.deleteMany({ where: { level, path: { startsWith: `zzfx${run}` } } });
  }
  await prisma.$disconnect();
});

describe("taxonomy import at full scale", () => {
  it("imports ~6k leaves in under 60s and is idempotent", async () => {
    const plan = planTaxonomy(bigTree());
    expect(plan.errors).toEqual([]);
    const leaves = plan.rows.filter((r) => r.isLeaf).length;
    expect(leaves).toBeGreaterThanOrEqual(6000);

    const t0 = Date.now();
    const first = await applyTaxonomy(prisma, plan);
    expect(Date.now() - t0).toBeLessThan(60_000);
    expect(first.created).toBe(plan.rows.length);

    const second = await applyTaxonomy(prisma, plan);
    expect(second).toMatchObject({ created: 0, updated: 0, unchanged: plan.rows.length });

    const leaf = await prisma.category.findUniqueOrThrow({
      where: { path: plan.rows.find((r) => r.level === 4)!.path },
      include: { parent: { include: { parent: { include: { parent: true } } } } },
    });
    expect(leaf.level).toBe(4);
    expect(leaf.parent?.parent?.parent?.level).toBe(1);
  }, 120_000);

  it("refuses a plan containing errors", async () => {
    const bad = planTaxonomy([{ name: " " }]);
    await expect(applyTaxonomy(prisma, bad)).rejects.toThrow(/error/);
  });
});
