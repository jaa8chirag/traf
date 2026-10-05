import "server-only";
import { randomUUID } from "node:crypto";
import { storage } from "@/lib/providers/storage";
import { fail, ok, type Result } from "@/lib/result";
import { can, type CurrentSession } from "@/modules/identity";
import { checkUpload, keyPrefix, UPLOAD_RULES, type UploadPurpose } from "./schemas";

export interface UploadTicket {
  key: string;
  url: string;
  headers: Record<string, string>;
}

/** Authorises and presigns one direct-to-storage upload. The key is generated server-side. */
export async function createUploadTicket(
  session: CurrentSession,
  input: { purpose: UploadPurpose; companyId: string; contentType: string; sizeBytes: number },
): Promise<Result<UploadTicket>> {
  const rule = UPLOAD_RULES[input.purpose];
  if (!rule) return fail("Unknown upload type");
  if (!can(session.access, rule.permission, { companyId: input.companyId })) return fail("Not allowed");
  const check = checkUpload(input.purpose, input.contentType, input.sizeBytes);
  if (!check.ok) return fail(check.error);

  const key = `${keyPrefix(input.purpose, input.companyId)}${randomUUID()}.${check.extension}`;
  const signed = await storage().presignUpload({ key, contentType: input.contentType, sizeBytes: input.sizeBytes });
  return ok({ key, url: signed.url, headers: signed.headers });
}
