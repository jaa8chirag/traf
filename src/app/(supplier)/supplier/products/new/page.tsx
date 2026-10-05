import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPicker } from "@/components/forms/CategoryPicker";
import { ProductForm } from "@/components/supplier/ProductForm";
import { MAX_MEDIA, MAX_TIERS, getCategoryChain, getEffectiveAttributes } from "@/modules/catalog";
import { requireSupplier } from "@/modules/identity";
import { getCompanyStatus } from "@/modules/supplier";

export const metadata: Metadata = { title: "New product", robots: { index: false } };

export default async function NewProductPage({ searchParams }: PageProps<"/supplier/products/new">) {
  const { session, company } = await requireSupplier();
  const sp = await searchParams;
  const categoryId = typeof sp.category === "string" ? sp.category : null;

  if (!categoryId) {
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">New product</h1>
        <p className="text-sm text-muted">Pick the most specific category. It decides which specification fields you will fill in.</p>
        <CategoryPicker basePath="/supplier/products/new" />
      </div>
    );
  }
  const chain = await getCategoryChain(categoryId);
  const leaf = chain[chain.length - 1];
  if (!leaf?.isLeaf) notFound();
  const defs = await getEffectiveAttributes(categoryId);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">New product</h1>
      <ProductForm
        categoryId={categoryId}
        categoryPath={chain.map((c) => c.name).join(" › ")}
        attrs={defs.map((d) => ({ key: d.key, label: d.label, type: d.type, unit: d.unit, options: d.options ? [...d.options] : null, isRequired: d.isRequired }))}
        initial={{ moq: "1", moqUnit: "pieces", currency: "USD" }}
        media={[]}
        canSubmit={(await getCompanyStatus(session, company.companyId)) === "VERIFIED"}
        tierSlots={MAX_TIERS}
        maxMedia={MAX_MEDIA}
      />
    </div>
  );
}
