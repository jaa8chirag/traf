import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyForm, type CompanyFormData } from "@/components/supplier/CompanyForm";
import { requireSupplier } from "@/modules/identity";
import { getCompanyForOwner } from "@/modules/supplier";

export const metadata: Metadata = { title: "Company info", robots: { index: false } };

export default async function CompanyPage() {
  const { session, company: access } = await requireSupplier();
  const c = await getCompanyForOwner(session, access.companyId);
  if (!c) notFound();
  const data: CompanyFormData = {
    name: c.name,
    slug: c.slug,
    businessType: c.businessType,
    rd: c.rd,
    country: c.country,
    province: c.province ?? "",
    city: c.city ?? "",
    address: c.address ?? "",
    description: c.description ?? "",
    yearFounded: c.yearFounded?.toString() ?? "",
    employeeBand: c.employeeBand ?? "",
    website: c.website ?? "",
    logoKey: c.logoUrl ?? "",
    logoViewUrl: c.logoViewUrl,
    slugLocked: c.status === "VERIFIED",
  };
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Company info</h1>
      <CompanyForm company={data} locked={c.status === "VERIFIED"} />
    </div>
  );
}
