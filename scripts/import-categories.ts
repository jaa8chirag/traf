// Import the category tree from a .csv (l1,l2,l3,l4[,l1_hi,...]) or .json ([{name,children}]) file.
//   npm run taxonomy:import -- path/to/tree.csv [--dry-run] [--prune]
import "dotenv/config";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { planTaxonomy, taxonomyFromCsv, type TaxonomyNode } from "../src/modules/catalog/taxonomy";
import { applyTaxonomy } from "../src/modules/catalog/taxonomy-apply";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Usage: npm run taxonomy:import -- <file.csv|file.json> [--dry-run] [--prune]");

  const raw = readFileSync(file, "utf8");
  const tree: TaxonomyNode[] = extname(file).toLowerCase() === ".json" ? (JSON.parse(raw) as TaxonomyNode[]) : taxonomyFromCsv(raw);
  const plan = planTaxonomy(tree);

  const byLevel = [1, 2, 3, 4].map((l) => plan.rows.filter((r) => r.level === l).length);
  console.log(`Parsed ${plan.rows.length} categories (L1..L4: ${byLevel.join(" / ")}), ${plan.rows.filter((r) => r.isLeaf).length} leaves.`);
  if (plan.errors.length) {
    console.error(`${plan.errors.length} problem(s):\n  ${plan.errors.slice(0, 50).join("\n  ")}`);
    process.exitCode = 1;
    return;
  }
  if (args.includes("--dry-run")) return void console.log("Dry run: nothing written.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const started = Date.now();
    const res = await applyTaxonomy(db, plan, { prune: args.includes("--prune") });
    console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s:`, res);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
