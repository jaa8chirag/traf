// Pure validation + upload rules for the supplier module.
import { z } from "zod";
import { isValidShowroomSlug } from "../../lib/tenant";

export const EMPLOYEE_BANDS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const;

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const companyProfileSchema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidShowroomSlug, "Use 3–40 lowercase letters, numbers or hyphens (not a reserved word)"),
  businessType: z.enum(["MANUFACTURER", "TRADING_COMPANY", "GROUP_CORP", "OTHER"]),
  rd: z.array(z.enum(["OEM", "ODM", "OWN_BRAND"])).default([]),
  country: z.string().trim().length(2, "Choose a country").toUpperCase(),
  province: z.string().trim().min(2, "Province / state is required").max(80),
  city: z.string().trim().min(2, "City is required").max(80),
  address: z.preprocess(emptyToUndef, z.string().trim().max(250).optional()),
  description: z.preprocess(emptyToUndef, z.string().trim().max(3000).optional()),
  yearFounded: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
  ),
  employeeBand: z.preprocess(emptyToUndef, z.enum(EMPLOYEE_BANDS).optional()),
  website: z.preprocess(emptyToUndef, z.string().trim().url("Enter a full URL, e.g. https://example.com").max(200).optional()),
  logoKey: z.preprocess(emptyToUndef, z.string().max(300).optional()),
});
export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

export const documentTypeSchema = z.enum(["BUSINESS_LICENCE", "TAX_REGISTRATION", "FACTORY_PHOTO", "ID_PROOF", "OTHER"]);

/* ───────── Uploads ───────── */
export type UploadPurpose = "company-document" | "company-logo" | "product-media";

const IMAGE = ["image/jpeg", "image/png", "image/webp"];
const MB = 1024 * 1024;

interface Rule {
  types: string[];
  maxBytes: number;
  scope: "public" | "private";
  folder: string;
  /** Permission required on the company. */
  permission: "company.manage" | "product.manage";
}

export const UPLOAD_RULES: Record<UploadPurpose, Rule> = {
  "company-document": { types: [...IMAGE, "application/pdf"], maxBytes: 15 * MB, scope: "private", folder: "companies", permission: "company.manage" },
  "company-logo": { types: IMAGE, maxBytes: 3 * MB, scope: "public", folder: "logos", permission: "company.manage" },
  "product-media": { types: [...IMAGE, "video/mp4"], maxBytes: 50 * MB, scope: "public", folder: "products", permission: "product.manage" },
};

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
};

export type UploadCheck = { ok: true; extension: string } | { ok: false; error: string };

export function checkUpload(purpose: UploadPurpose, contentType: string, sizeBytes: number): UploadCheck {
  const rule = UPLOAD_RULES[purpose];
  if (!rule.types.includes(contentType)) return { ok: false, error: "This file type is not allowed" };
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) return { ok: false, error: "Empty file" };
  if (purpose === "product-media" && contentType.startsWith("image/") && sizeBytes > 10 * MB) {
    return { ok: false, error: "Images must be 10 MB or smaller" };
  }
  if (sizeBytes > rule.maxBytes) return { ok: false, error: `File is too large (max ${Math.round(rule.maxBytes / MB)} MB)` };
  return { ok: true, extension: EXT[contentType] };
}

/** Object-key prefix a company may use for a purpose; stored keys must start with it. */
export function keyPrefix(purpose: UploadPurpose, companyId: string): string {
  const r = UPLOAD_RULES[purpose];
  return `${r.scope}/${r.folder}/${companyId}/`;
}

export function keyBelongsTo(purpose: UploadPurpose, companyId: string, key: string): boolean {
  return key.startsWith(keyPrefix(purpose, companyId)) && !key.includes("..");
}
