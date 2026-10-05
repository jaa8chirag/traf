// Transactional-outbox relay: moves PENDING OutboxEvent rows to a message queue exactly-once-ish
// (at-least-once delivery; consumers are idempotent and dedupe on event id).
import { prisma } from "@/lib/db";

export interface RelayedEvent {
  id: string;
  type: string;
  aggregateId: string;
  payload: unknown;
}

const MAX_ATTEMPTS = 10;

/** Publish up to `batch` pending events. Safe to run from several relays concurrently (SKIP LOCKED). */
export async function relayOutbox(
  publish: (e: RelayedEvent) => Promise<void>,
  opts: { batch?: number; /** Restrict to these aggregates (used by tests so they never touch real events). */ aggregateIds?: string[] } = {},
): Promise<number> {
  const batch = opts.batch ?? 100;
  const only = opts.aggregateIds ?? null;
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; type: string; aggregateId: string; payload: unknown; attempts: number }>>`
      SELECT id, type, "aggregateId", payload, attempts FROM "OutboxEvent"
      WHERE status = 'PENDING' AND (${only}::text[] IS NULL OR "aggregateId" = ANY(${only}::text[])) ORDER BY "createdAt" ASC LIMIT ${batch} FOR UPDATE SKIP LOCKED`;
    let published = 0;
    for (const r of rows) {
      try {
        await publish({ id: r.id, type: r.type, aggregateId: r.aggregateId, payload: r.payload });
        await tx.outboxEvent.update({ where: { id: r.id }, data: { status: "PUBLISHED", publishedAt: new Date(), attempts: { increment: 1 } } });
        published++;
      } catch (e) {
        console.error(`[relay] publish failed for ${r.type} ${r.id}:`, e instanceof Error ? e.message : e);
        await tx.outboxEvent.update({ where: { id: r.id }, data: { attempts: { increment: 1 }, status: r.attempts + 1 >= MAX_ATTEMPTS ? "FAILED" : "PENDING" } });
      }
    }
    return published;
  });
}
