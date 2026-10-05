import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { emit } from "@/lib/events/outbox";
import { storage } from "@/lib/providers/storage";
import { fail, ok, type Result } from "@/lib/result";
import { can, type CurrentSession } from "@/modules/identity";
import { companyProfileSchema, documentTypeSchema, keyBelongsTo, type CompanyProfileInput } from "./schemas";

const MAX_DOCUMENTS = 10;
const DEFAULT_NAME = "My company";

function flatten(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}

function guard(session: CurrentSession, companyId: string): Result<void> {
  return can(session.access, "company.manage", { companyId }) ? ok(undefined) : fail("Not allowed");
}

export async function getCompanyForOwner(session: CurrentSession, companyId: string) {
  if (!can(session.access, "company.manage", { companyId })) return null;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!company) return null;
  const documents = await Promise.all(
    company.documents.map(async (d) => ({ ...d, viewUrl: await storage().signedGetUrl(d.fileUrl, 300) })),
  );
  return {
    ...company,
    logoViewUrl: company.logoUrl ? storage().publicUrl(company.logoUrl) : null,
    documents,
  };
}

export async function updateCompanyProfile(
  session: CurrentSession,
  companyId: string,
  raw: unknown,
): Promise<Result<void>> {
  const g = guard(session, companyId);
  if (!g.ok) return g;
  const parsed = companyProfileSchema.safeParse(raw);
  if (!parsed.success) return fail("Please fix the highlighted fields", flatten(parsed.error));
  const input: CompanyProfileInput = parsed.data;

  const current = await prisma.company.findUnique({ where: { id: companyId } });
  if (!current) return fail("Company not found");
  if (current.status === "SUSPENDED") return fail("This company is suspended");
  if (current.status === "VERIFIED" && input.slug !== current.slug) {
    return fail("Showroom address cannot change after verification", { slug: "Contact support to change a verified address" });
  }
  if (input.logoKey && !keyBelongsTo("company-logo", companyId, input.logoKey)) return fail("Invalid logo upload");
  if (input.logoKey && input.logoKey !== current.logoUrl && !(await storage().exists(input.logoKey))) {
    return fail("Logo upload not found; please upload again");
  }

  try {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        name: input.name,
        slug: input.slug,
        businessType: input.businessType,
        rd: input.rd,
        country: input.country,
        province: input.province,
        city: input.city,
        address: input.address ?? null,
        description: input.description ?? null,
        yearFounded: input.yearFounded ?? null,
        employeeBand: input.employeeBand ?? null,
        website: input.website ?? null,
        ...(input.logoKey ? { logoUrl: input.logoKey } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("That showroom address is taken", { slug: "Already in use; try another" });
    }
    throw e;
  }
  return ok(undefined);
}

export async function addCompanyDocument(
  session: CurrentSession,
  companyId: string,
  raw: { type: string; key: string },
): Promise<Result<void>> {
  const g = guard(session, companyId);
  if (!g.ok) return g;
  const type = documentTypeSchema.safeParse(raw.type);
  if (!type.success) return fail("Choose a document type");
  if (!keyBelongsTo("company-document", companyId, raw.key)) return fail("Invalid upload");
  if (!(await storage().exists(raw.key))) return fail("Upload not found; please upload again");

  const count = await prisma.companyDocument.count({ where: { companyId } });
  if (count >= MAX_DOCUMENTS) return fail(`You can upload at most ${MAX_DOCUMENTS} documents`);
  await prisma.companyDocument.create({ data: { companyId, type: type.data, fileUrl: raw.key } });
  return ok(undefined);
}

export async function removeCompanyDocument(
  session: CurrentSession,
  companyId: string,
  documentId: string,
): Promise<Result<void>> {
  const g = guard(session, companyId);
  if (!g.ok) return g;
  const doc = await prisma.companyDocument.findFirst({ where: { id: documentId, companyId } });
  if (!doc) return fail("Document not found");
  if (doc.state === "APPROVED") return fail("Approved documents cannot be removed");
  await prisma.companyDocument.delete({ where: { id: doc.id } });
  await storage().delete(doc.fileUrl).catch(() => undefined);
  return ok(undefined);
}

/** DRAFT/REJECTED -> PENDING_VERIFICATION once the profile and a licence are complete. */
export async function submitForVerification(session: CurrentSession, companyId: string): Promise<Result<void>> {
  const g = guard(session, companyId);
  if (!g.ok) return g;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { documents: true },
  });
  if (!company) return fail("Company not found");
  if (company.status !== "DRAFT" && company.status !== "REJECTED") return fail("This company is already submitted or verified");

  const problems: string[] = [];
  if (company.name === DEFAULT_NAME) problems.push("Add your company name");
  if (!company.province || !company.city) problems.push("Add your location");
  if (!company.description) problems.push("Add a company description");
  if (!company.documents.some((d) => d.type === "BUSINESS_LICENCE")) problems.push("Upload your business licence");
  if (problems.length) return fail(problems.join(". "));

  await prisma.$transaction(async (tx) => {
    await tx.company.update({ where: { id: companyId }, data: { status: "PENDING_VERIFICATION" } });
    await tx.companyDocument.updateMany({
      where: { companyId, state: "REJECTED" },
      data: { state: "PENDING", reviewNote: null },
    });
    await emit(tx, "supplier.submitted", companyId, { by: session.user.id });
  });
  return ok(undefined);
}

/** Cheap status lookup for UI gating (e.g. whether products can be submitted). */
export async function getCompanyStatus(session: CurrentSession, companyId: string) {
  if (!can(session.access, "company.manage", { companyId })) return null;
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true } });
  return c?.status ?? null;
}
