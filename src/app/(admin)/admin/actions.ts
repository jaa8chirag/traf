"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, type FormState } from "@/lib/form-state";
import { requireStaff } from "@/modules/identity";
import { approveCompany, rejectCompany } from "@/modules/supplier";
import { approveProduct, deleteAttribute, rejectProduct, saveAttribute } from "@/modules/catalog";

const str = (fd: FormData, k: string): string => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export async function approveCompanyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireStaff();
  const res = await approveCompany(session, str(fd, "id"));
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers?done=approved");
}

export async function rejectCompanyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireStaff();
  const res = await rejectCompany(session, str(fd, "id"), str(fd, "note"));
  if (!res.ok) return { error: res.error, values: formValues(fd) };
  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers?done=rejected");
}

export async function approveProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireStaff();
  const res = await approveProduct(session, str(fd, "id"));
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/products");
  redirect("/admin/products?done=approved");
}

export async function rejectProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireStaff();
  const res = await rejectProduct(session, str(fd, "id"), str(fd, "note"));
  if (!res.ok) return { error: res.error, values: formValues(fd) };
  revalidatePath("/admin/products");
  redirect("/admin/products?done=rejected");
}

export async function saveAttributeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireStaff();
  const categoryId = str(fd, "categoryId");
  const res = await saveAttribute(session, categoryId, {
    key: str(fd, "key"),
    label: str(fd, "label"),
    type: str(fd, "type"),
    unit: str(fd, "unit") || undefined,
    optionsText: str(fd, "optionsText") || undefined,
    isRequired: fd.get("isRequired") === "on",
    isFilterable: fd.get("isFilterable") === "on",
    sortOrder: str(fd, "sortOrder") || 0,
  });
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors, values: formValues(fd) };
  revalidatePath(`/admin/categories/${categoryId}`);
  return { ok: true, message: "Attribute saved" };
}

export async function deleteAttributeAction(fd: FormData): Promise<void> {
  const session = await requireStaff();
  await deleteAttribute(session, str(fd, "id"));
  revalidatePath(`/admin/categories/${str(fd, "categoryId")}`);
}
