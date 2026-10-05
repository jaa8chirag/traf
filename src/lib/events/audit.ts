import type { Prisma } from "@/generated/prisma/client";

export interface AuditEntry {
  actorId: string;
  action: string; // "supplier.verified"
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

/** Append an AuditLog row inside the caller's transaction. */
export async function audit(tx: Prisma.TransactionClient, e: AuditEntry): Promise<void> {
  await tx.auditLog.create({ data: e });
}
