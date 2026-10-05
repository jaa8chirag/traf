import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/supplier/ProductForm";
import { MAX_MEDIA, MAX_TIERS, getCategoryChain, getEffectiveAttributes, getProductForEdit } from "@/modules/catalog";
import { requireSupplier } from "@/modules/identity";
import { getCompanyStatus } from "@/modules/supplier";

export const metadata: Metadata = { title: "Edit product", robots: { index: false } };

export default async function EditProductPage({ params }: PageProps<"/supplier/products/[id]">) {
  const { id } = await params;
  const { session, company } = await requireSupplier();
  const product = await getProductForEdit(session, company.companyId, id);
  if (!product) notFound();

  const [chain, defs, status] = await Promise.all([
    getCategoryChain(product.categoryId),
    getEffectiveAttributes(product.categoryId),
    getCompanyStatus(session, company.companyId),
  ]);

  const initial: Record<string, string | string[]> = {
    title: product.title,
    summary: product.summary ?? "",
    description: product.description ?? "",
    keywords: product.keywords.join(", "),
    currency: product.currency,
    priceMin: product.priceMin?.toString() ?? "",
    priceMax: product.priceMax?.toString() ?? "",
    moq: String(product.moq),
    moqUnit: product.moqUnit,
    leadTimeDays: product.leadTimeDays?.toString() ?? "",
    samplePrice: product.samplePrice?.toString() ?? "",
    ...(product.supportsSample ? { supportsSample: "on" } : {}),
  };
  product.priceTiers.forEach((t, i) => {
    initial[`tier_min_${i}`] = String(t.minQty);
    initial[`tier_max_${i}`] = t.maxQty?.toString() ?? "";
    initial[`tier_price_${i}`] = t.unitPrice.toString();
  });
  for (const [k, v] of Object.entries(product.attrs)) initial[`attr.${k}`] = v;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit product</h1>
        {product.status === "LIVE" && <p className="mt-1 text-sm text-muted">Saving changes sends this live product back for review.</p>}
      </div>
      <ProductForm
        categoryId={product.categoryId}
        categoryPath={chain.map((c) => c.name).join(" › ")}
        productId={product.id}
        attrs={defs.map((d) => ({ key: d.key, label: d.label, type: d.type, unit: d.unit, options: d.options ? [...d.options] : null, isRequired: d.isRequired }))}
        initial={initial}
        media={product.media.map((m) => ({ type: m.type === "VIDEO" ? "VIDEO" : "IMAGE", key: m.url, viewUrl: m.viewUrl }))}
        canSubmit={status === "VERIFIED"}
        moderationNote={product.status === "REJECTED" ? product.moderationNote : null}
        tierSlots={MAX_TIERS}
        maxMedia={MAX_MEDIA}
      />
    </div>
  );
}
