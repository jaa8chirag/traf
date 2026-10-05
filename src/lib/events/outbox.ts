import type { Prisma } from "@/generated/prisma/client";

export type DomainEvent =
  | "user.registered"
  | "supplier.submitted"
  | "supplier.verified"
  | "supplier.rejected"
  | "product.submitted"
  | "product.approved"
  | "product.rejected"
  | "product.updated"
  | "attribute.changed";
// Further events are added per checkpoint (see docs/ARCHITECTURE.md §8).

/** Write an event in the SAME transaction as the state change (transactional outbox). */
export async function emit(
  tx: Prisma.TransactionClient,
  type: DomainEvent,
  aggregateId: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  await tx.outboxEvent.create({ data: { type, aggregateId, payload } });
}
