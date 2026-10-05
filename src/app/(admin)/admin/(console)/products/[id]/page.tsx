import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { approveProductAction, rejectProductAction } from "@/app/(admin)/admin/actions";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { Badge, Card } from "@/components/ui";
import { getProductForReview } from "@/modules/catalog";
import { requireStaff } from "@/modules/identity";

export const metadata: Metadata = { title: "Review product", robots: { index: false, follow: false } };

function attrValue(a: { valueText: string | null; valueNumber: { toString(): string } | null; valueBool: boolean | null; valueJson: unknown }): string {
  if (Array.isArray(a.valueJson)) return a.valueJson.join(", ");
  if (a.valueBool !== null) return a.valueBool ? "Yes" : "No";
  return a.valueNumber?.toString() ?? a.valueText ?? "—";
}

export default async function ReviewProduct({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const session = await requireStaff("product.moderate");
  const p = await getProductForReview(session, id);
  if (!p) notFound();
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{p.title}</h1>
        <Badge tone={p.status === "PENDING_REVIEW" ? "info" : "neutral"}>{p.status.replaceAll("_", " ").toLowerCase()}</Badge>
      </div>
      <p className="text-sm text-muted">{p.company.name} · {p.category.name}</p>
      {p.media.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {p.media.map((m) => (
            <li key={m.id} className="aspect-square overflow-hidden rounded-xl border border-line bg-paper-2">
              {m.type === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element -- direct object-storage URL
                <img src={m.viewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <a href={m.viewUrl} target="_blank" rel="noopener noreferrer" className="flex h-full items-center justify-center text-xs underline">Video</a>
              )}
            </li>
          ))}
        </ul>
      )}
      <Card className="space-y-2 text-sm">
        <p><span className="text-muted">Price:</span> {p.priceMin ? `${p.currency} ${p.priceMin.toString()}–${p.priceMax?.toString()}` : "—"} · <span className="text-muted">MOQ:</span> {p.moq} {p.moqUnit}</p>
        {p.priceTiers.length > 0 && (
          <p><span className="text-muted">Tiers:</span> {p.priceTiers.map((t) => `${t.minQty}${t.maxQty ? `–${t.maxQty}` : "+"} @ ${t.unitPrice.toString()}`).join(" · ")}</p>
        )}
        {p.summary && <p>{p.summary}</p>}
        {p.description && <p className="whitespace-pre-line text-muted">{p.description}</p>}
      </Card>
      {p.attributes.length > 0 && (
        <Card>
          <dl className="grid gap-x-6 sm:grid-cols-2">
            {p.attributes.map((a) => (
              <div key={a.id} className="flex gap-3 py-1 text-sm"><dt className="w-32 shrink-0 text-muted">{a.attribute.label}</dt><dd>{attrValue(a)}{a.attribute.unit ? ` ${a.attribute.unit}` : ""}</dd></div>
            ))}
          </dl>
        </Card>
      )}
      {p.status === "PENDING_REVIEW" ? (
        <ReviewActions id={p.id} approve={approveProductAction} reject={rejectProductAction} />
      ) : (
        <p className="text-sm text-muted">This product is not awaiting review.</p>
      )}
    </div>
  );
}
