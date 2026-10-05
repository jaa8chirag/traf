"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, type FormState } from "@/lib/form-state";
import { requireSupplier } from "@/modules/identity";
import {
  addCompanyDocument,
  removeCompanyDocument,
  submitForVerification,
  updateCompanyProfile,
} from "@/modules/supplier";
import { deleteProduct, importProductsCsv, readProductForm, saveProduct } from "@/modules/catalog";

const str = (fd: FormData, k: string): string => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export async function saveCompanyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { session, company } = await requireSupplier();
  const res = await updateCompanyProfile(session, company.companyId, {
    name: str(fd, "name"),
    slug: str(fd, "slug"),
    businessType: str(fd, "businessType"),
    rd: fd.getAll("rd"),
    country: str(fd, "country"),
    province: str(fd, "province"),
    city: str(fd, "city"),
    address: str(fd, "address"),
    description: str(fd, "description"),
    yearFounded: str(fd, "yearFounded"),
    employeeBand: str(fd, "employeeBand"),
    website: str(fd, "website"),
    logoKey: str(fd, "logoKey"),
  });
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors, values: formValues(fd) };
  revalidatePath("/supplier", "layout");
  return { ok: true, message: "Company profile saved", values: formValues(fd) };
}

export async function addDocumentAction(type: string, key: string): Promise<{ error?: string }> {
  const { session, company } = await requireSupplier();
  const res = await addCompanyDocument(session, company.companyId, { type, key });
  if (!res.ok) return { error: res.error };
  revalidatePath("/supplier/verification");
  return {};
}

export async function removeDocumentAction(fd: FormData): Promise<void> {
  const { session, company } = await requireSupplier();
  await removeCompanyDocument(session, company.companyId, str(fd, "id"));
  revalidatePath("/supplier/verification");
}

export async function submitVerificationAction(): Promise<FormState> {
  const { session, company } = await requireSupplier();
  const res = await submitForVerification(session, company.companyId);
  if (!res.ok) return { error: res.error };
  revalidatePath("/supplier", "layout");
  return { ok: true, message: "Submitted. Our team will review your documents." };
}

export async function saveProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { session, company } = await requireSupplier();
  const { input, attrs } = readProductForm(fd);
  const productId = str(fd, "productId") || undefined;
  const res = await saveProduct(session, {
    companyId: company.companyId,
    productId,
    categoryId: str(fd, "categoryId"),
    input,
    attrs,
    submit: str(fd, "intent") === "submit",
  });
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors, values: formValues(fd) };
  revalidatePath("/supplier/products");
  redirect(`/supplier/products?saved=${res.value.status}`);
}

export async function deleteProductAction(fd: FormData): Promise<void> {
  const { session, company } = await requireSupplier();
  await deleteProduct(session, company.companyId, str(fd, "id"));
  revalidatePath("/supplier/products");
}

export async function importCsvAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { session, company } = await requireSupplier();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file" };
  if (file.size > 1024 * 1024) return { error: "CSV must be smaller than 1 MB" };
  const res = await importProductsCsv(session, company.companyId, await file.text());
  if (!res.ok) return { error: res.error };
  revalidatePath("/supplier/products");
  const { created, errors } = res.value;
  return {
    ok: created > 0 || errors.length === 0,
    message: `${created} draft product${created === 1 ? "" : "s"} created.`,
    error: errors.length ? errors.slice(0, 20).map((e) => `Line ${e.line}: ${e.message}`).join("\n") + (errors.length > 20 ? `\n…and ${errors.length - 20} more` : "") : undefined,
  };
}
