// Full rebuild of the search indexes from Postgres (zero-downtime swap). Idempotent.
//   npm run search:reindex
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { rebuildAll } from "../src/modules/search";

async function main(): Promise<void> {
  const t0 = Date.now();
  const r = await rebuildAll();
  console.log(`Reindexed ${r.products} products and ${r.suppliers} suppliers in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
