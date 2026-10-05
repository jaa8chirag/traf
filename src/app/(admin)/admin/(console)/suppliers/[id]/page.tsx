import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { approveCompanyAction, rejectCompanyAction } from "@/app/(admin)/admin/actions";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { Badge, Card } from "@/components/ui";
import { requireStaff } from "@/modules/identity";
import { getCompanyForReview } from "@/modules/supplier";

export const metadata: Metadata = { title: "Review supplier", robots: { index: false, follow: false } };

export default async function ReviewSupplier({ params }: PageProps<"/admin/suppliers/[id]">) {
  const { id } = await params;
  const session = await requireStaff("supplier.verify");
  const c = await getCompanyForReview(session, id);
  if (!c) notFound();
  const row = (label: string, value: string | number | null | undefined) => (
    <div className="flex gap-3 py-1.5 text-sm"><dt className="w-40 shrink-0 text-muted">{label}</dt><dd>{value || "—"}</dd></div>
  );
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{c.name}</h1>
        <Badge tone={c.status === "PENDING_VERIFICATION" ? "info" : "neutral"}>{c.status.replaceAll("_", " ").toLowerCase()}</Badge>
      </div>
      <Card>
        <dl>
          {row("Owner", c.owner.email)}
          {row("Showroom address", `/s/${c.slug}`)}
          {row("Business type", c.businessType.replaceAll("_", " ").toLowerCase())}
          {row("R&D", c.rd.join(", "))}
          {row("Location", [c.address, c.city, c.province, c.country].filter(Boolean).join(", "))}
          {row("Founded", c.yearFounded)}
          {row("Employees", c.employeeBand)}
          {row("Website", c.website)}
          {row("About", c.description)}
        </dl>
      </Card>
      <section className="space-y-2">
        <h2 className="font-medium">Documents</h2>
        {c.documents.length === 0 && <p className="text-sm text-danger">No documents uploaded.</p>}
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {c.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <a href={d.viewUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">{d.type.replaceAll("_", " ").toLowerCase()}</a>
              <Badge tone={d.state === "APPROVED" ? "success" : d.state === "REJECTED" ? "danger" : "warning"}>{d.state.toLowerCase()}</Badge>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">Links expire after 5 minutes; reload the page for fresh ones.</p>
      </section>
      {c.status === "PENDING_VERIFICATION" ? (
        <ReviewActions id={c.id} approve={approveCompanyAction} reject={rejectCompanyAction} />
      ) : (
        <p className="text-sm text-muted">This company is not awaiting review.</p>
      )}
    </div>
  );
}
