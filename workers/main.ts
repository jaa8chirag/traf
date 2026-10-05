// Background worker: outbox relay -> BullMQ -> consumers (search indexing today; notifications etc. later).
//   npm run worker
import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../src/lib/env";
import { relayOutbox, type RelayedEvent } from "../src/lib/events/relay";
import { configureIndexes, handleSearchEvent } from "../src/modules/search";

const QUEUE = "domain-events";

interface Consumer {
  name: string;
  handles: (type: string) => boolean;
  handle: (e: RelayedEvent) => Promise<void>;
}

const consumers: Consumer[] = [
  {
    name: "search-index",
    handles: (t) => t.startsWith("product.") || t.startsWith("supplier.") || t === "attribute.changed",
    handle: (e) => handleSearchEvent(e.type, e.aggregateId),
  },
];

async function main(): Promise<void> {
  const connection = new IORedis(env().REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue<RelayedEvent>(QUEUE, {
    connection,
    defaultJobOptions: { attempts: 5, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 },
  });

  await configureIndexes().catch((e: unknown) => console.error("[worker] could not configure search indexes yet:", e instanceof Error ? e.message : e));

  const worker = new Worker<RelayedEvent>(
    QUEUE,
    async (job) => {
      const e = job.data;
      for (const c of consumers.filter((x) => x.handles(e.type))) {
        await c.handle(e);
        console.log(`[worker] ${c.name} handled ${e.type} ${e.aggregateId}`);
      }
    },
    { connection, concurrency: 4 },
  );
  worker.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      // jobId = outbox id => a re-published event is deduplicated by the queue.
      await relayOutbox((e) => queue.add(e.type, e, { jobId: e.id }).then(() => undefined));
    } catch (e) {
      console.error("[relay] error:", e instanceof Error ? e.message : e);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, 1000);
  console.log("[worker] started: relaying outbox -> BullMQ -> search-index");

  const stop = async () => {
    clearInterval(timer);
    await worker.close();
    await queue.close();
    await connection.quit();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
