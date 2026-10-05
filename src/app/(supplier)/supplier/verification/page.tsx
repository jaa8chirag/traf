import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentsManager } from "@/components/supplier/DocumentsManager";
import { Badge, Card } from "@/components/ui";
import { requireSupplier } from "@/modules/identity";
import { getCompanyForOwner } from "@/modules/supplier";

export const metadata: Metadata = { title: "Verification", robots: { index: false } };

const copy = {
  DRAFT: { tone: "warning", label: "Not submitted", text: "Complete your company info, upload your business licence, then submit for review." },
  PENDING_VERIFICATION: { tone: "info", label: "Under review", text: "Our team is reviewing your documents. This usually takes 1–2 business days." },
  VERIFIED: { tone: "success", label: "Verified", text: "Your company is verified. You can now submit products for review." },
  REJECTED: { tone: "danger", label: "Changes requested", text: "Review the notes on your documents, fix the issues and resubmit." },
  SUSPENDED: { tone: "danger", label: "Suspended", text: "Contact support to restore your account." },
} as const;

export default async function VerificationPage() {
  const { session, company: access } = await requireSupplier();
  const c = await getCompanyForOwner(session, access.companyId);
  if (!c) notFound();
  const info = copy[c.status];
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Verification</h1>
      <Card className="space-y-1">
        <Badge tone={info.tone}>{info.label}</Badge>
        <p className="pt-2 text-sm text-muted">{info.text}</p>
      </Card>
      <section className="space-y-3">
        <h2 className="font-medium">Documents</h2>
        <DocumentsManager
          status={c.status}
          docs={c.documents.map((d) => ({ id: d.id, type: d.type, state: d.state, reviewNote: d.reviewNote, viewUrl: d.viewUrl }))}
        />
      </section>
    </div>
  );
}
