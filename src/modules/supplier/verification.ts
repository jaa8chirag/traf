import "server-only";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/events/audit";
import { emit } from "@/lib/events/outbox";
import { storage } from "@/lib/providers/storage";
import { fail, ok, type Result } from "@/lib/result";
import { can, type CurrentSession } from "@/modules/identity";

const PERM = "supplier.verify";

export async function listPendingCompanies(session: CurrentSession) {
  if (!can(session.access, PERM)) return null;
  return prisma.company.findMany({
    where: { status: "PENDING_VERIFICATION" },
    orderBy: { updatedAt: "asc" },
    select: { id: true, name: true, slug: true, country: true, province: true, city: true, updatedAt: true, owner: { select: { email: true } } },
  });
}

export async function getCompanyForReview(session: CurrentSession, companyId: string) {
  if (!can(session.access, PERM)) return null;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { documents: { orderBy: { createdAt: "asc" } }, owner: { select: { email: true } } },
  });
  if (!company) return null;
  const documents = await Promise.all(
    company.documents.map(async (d) => ({ ...d, viewUrl: await storage().signedGetUrl(d.fileUrl, 300) })),
  );
  return { ...company, documents };
}

export async function approveCompany(session: CurrentSession, companyId: string): Promise<Result<void>> {
  if (!can(session.access, PERM)) return fail("Not allowed");
  return prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: companyId } });
    if (!company || company.status !== "PENDING_VERIFICATION") return fail("This company is not awaiting verification");

    await tx.company.update({ where: { id: companyId }, data: { status: "VERIFIED", verifiedAt: new Date() } });
    await tx.companyDocument.updateMany({
      where: { companyId, state: "PENDING" },
      data: { state: "APPROVED", reviewedById: session.user.id, reviewedAt: new Date() },
    });
    const badge = await tx.badge.upsert({
      where: { key: "verified" },
      update: {},
      create: { key: "verified", label: "Verified Supplier" },
    });
    await tx.companyBadge.upsert({
      where: { companyId_badgeId: { companyId, badgeId: badge.id } },
      update: {},
      create: { companyId, badgeId: badge.id },
    });
    await audit(tx, { actorId: session.user.id, action: "supplier.verified", entityType: "Company", entityId: companyId, before: { status: company.status }, after: { status: "VERIFIED" } });
    await emit(tx, "supplier.verified", companyId, { by: session.user.id });
    return ok(undefined);
  });
}

export async function rejectCompany(session: CurrentSession, companyId: string, note: string): Promise<Result<void>> {
  if (!can(session.access, PERM)) return fail("Not allowed");
  const reason = note.trim();
  if (reason.length < 5) return fail("Give the supplier a reason (at least 5 characters)");
  return prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: companyId } });
    if (!company || company.status !== "PENDING_VERIFICATION") return fail("This company is not awaiting verification");

    await tx.company.update({ where: { id: companyId }, data: { status: "REJECTED" } });
    await tx.companyDocument.updateMany({
      where: { companyId, state: "PENDING" },
      data: { state: "REJECTED", reviewNote: reason, reviewedById: session.user.id, reviewedAt: new Date() },
    });
    await audit(tx, { actorId: session.user.id, action: "supplier.rejected", entityType: "Company", entityId: companyId, before: { status: company.status }, after: { status: "REJECTED", reason } });
    await emit(tx, "supplier.rejected", companyId, { by: session.user.id, reason });
    return ok(undefined);
  });
}
