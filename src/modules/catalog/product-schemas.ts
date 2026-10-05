// Pure product input parsing/validation (form + CSV). No I/O.
import { z } from "zod";
import { parseCsvRecords } from "../../lib/csv";
import type { RawAttrs } from "./attributes";

const decimal = z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter a valid amount (max 2 decimals)");
const optionalDecimal = z.preprocess((v) => (v === "" || v === null ? undefined : v), decimal.optional());
const optionalInt = (max: number) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(0).max(max).optional());

export const MAX_TIERS = 5;
export const MAX_MEDIA = 10;

export const tierSchema = z.object({
  minQty: z.coerce.number().int().min(1).max(100_000_000),
  maxQty: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1).optional()),
  unitPrice: decimal,
});

export const mediaSchema = z.object({
  key: z.string().min(1).max(300),
  type: z.enum(["IMAGE", "VIDEO"]),
});

export const productInputSchema = z
  .object({
    title: z.string().trim().min(5, "Title must be at least 5 characters").max(200),
    summary: z.string().trim().max(300).default(""),
    description: z.string().trim().max(5000).default(""),
    keywords: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    moq: z.coerce.number().int().min(1, "MOQ must be at least 1").max(100_000_000),
    moqUnit: z.string().trim().min(1, "Unit is required").max(30),
    currency: z.enum(["USD", "INR", "EUR"]).default("USD"),
    priceMin: optionalDecimal,
    priceMax: optionalDecimal,
    leadTimeDays: optionalInt(365),
    supportsSample: z.boolean().default(false),
    samplePrice: optionalDecimal,
    tiers: z.array(tierSchema).max(MAX_TIERS).default([]),
    media: z.array(mediaSchema).max(MAX_MEDIA).default([]),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (v.priceMax !== undefined && v.priceMin === undefined) issue("priceMin", "Enter the minimum price too");
    if (v.priceMin !== undefined && v.priceMax !== undefined && Number(v.priceMin) > Number(v.priceMax)) {
      issue("priceMax", "Maximum price must be at least the minimum");
    }
    if (v.samplePrice !== undefined && !v.supportsSample) issue("samplePrice", "Enable samples to set a sample price");
    let prevEnd = 0;
    v.tiers.forEach((t, i) => {
      if (t.minQty <= prevEnd) issue("tiers", `Tier ${i + 1}: quantity ranges must be ascending and not overlap`);
      if (t.maxQty !== undefined && t.maxQty < t.minQty) issue("tiers", `Tier ${i + 1}: max quantity is below min`);
      if (t.maxQty === undefined && i < v.tiers.length - 1) issue("tiers", `Tier ${i + 1}: only the last tier may be open-ended`);
      prevEnd = t.maxQty ?? Number.MAX_SAFE_INTEGER;
    });
  });

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductInputRaw = z.input<typeof productInputSchema>;

export interface ParsedProductForm {
  input: unknown;
  attrs: RawAttrs;
}

const str = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v : "");

/** Turns the product <form> into raw objects for productInputSchema + attribute validation. */
export function readProductForm(fd: FormData): ParsedProductForm {
  const tiers: unknown[] = [];
  for (let i = 0; i < MAX_TIERS; i++) {
    const minQty = str(fd.get(`tier_min_${i}`)).trim();
    const unitPrice = str(fd.get(`tier_price_${i}`)).trim();
    if (!minQty && !unitPrice) continue;
    tiers.push({ minQty, maxQty: str(fd.get(`tier_max_${i}`)).trim(), unitPrice });
  }
  const media = fd
    .getAll("media")
    .map((m) => str(m).split("|"))
    .filter((p) => p.length === 2)
    .map(([type, key]) => ({ type, key }));

  const attrs: RawAttrs = {};
  for (const key of new Set([...fd.keys()].filter((k) => k.startsWith("attr.")))) {
    const all = fd.getAll(key).map(str);
    attrs[key.slice(5)] = all.length > 1 ? all : all[0];
  }
  return {
    attrs,
    input: {
      title: str(fd.get("title")),
      summary: str(fd.get("summary")),
      description: str(fd.get("description")),
      keywords: str(fd.get("keywords"))
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      moq: str(fd.get("moq")),
      moqUnit: str(fd.get("moqUnit")),
      currency: str(fd.get("currency")) || "USD",
      priceMin: str(fd.get("priceMin")).trim(),
      priceMax: str(fd.get("priceMax")).trim(),
      leadTimeDays: str(fd.get("leadTimeDays")).trim(),
      supportsSample: fd.get("supportsSample") === "on",
      samplePrice: str(fd.get("samplePrice")).trim(),
      tiers,
      media,
    },
  };
}

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/* ───────── Bulk CSV ───────── */

export interface CsvProductRow {
  line: number;
  categorySlug: string;
  input: ProductInput;
}
export interface CsvError {
  line: number;
  message: string;
}

export const MAX_CSV_ROWS = 500;
export const CSV_TEMPLATE =
  "title,category_slug,moq,moq_unit,currency,price_min,price_max,lead_time_days,summary,keywords\n" +
  '"65W GaN Fast Charger",chargers,500,pieces,USD,4.20,5.60,15,"Compact dual-port charger","gan,charger,usb-c"\n';

export function parseProductCsv(text: string): { rows: CsvProductRow[]; errors: CsvError[] } {
  const records = parseCsvRecords(text);
  const rows: CsvProductRow[] = [];
  const errors: CsvError[] = [];
  if (records.length > MAX_CSV_ROWS) {
    return { rows, errors: [{ line: 0, message: `Too many rows (max ${MAX_CSV_ROWS} per upload)` }] };
  }
  records.forEach((rec, idx) => {
    const line = idx + 2; // header is line 1
    const categorySlug = rec["category_slug"] ?? "";
    if (!categorySlug) return void errors.push({ line, message: "category_slug is required" });
    const parsed = productInputSchema.safeParse({
      title: rec["title"],
      summary: rec["summary"] ?? "",
      moq: rec["moq"],
      moqUnit: rec["moq_unit"],
      currency: rec["currency"] || "USD",
      priceMin: rec["price_min"] ?? "",
      priceMax: rec["price_max"] ?? "",
      leadTimeDays: rec["lead_time_days"] ?? "",
      keywords: (rec["keywords"] ?? "").split(/[,;]/).map((k) => k.trim()).filter(Boolean),
    });
    if (!parsed.success) {
      const [first] = parsed.error.issues;
      return void errors.push({ line, message: `${String(first.path[0] ?? "row")}: ${first.message}` });
    }
    rows.push({ line, categorySlug, input: parsed.data });
  });
  return { rows, errors };
}
