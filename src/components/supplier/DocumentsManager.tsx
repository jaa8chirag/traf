"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDocumentAction, removeDocumentAction, submitVerificationAction } from "@/app/(supplier)/supplier/actions";
import { FormMessages } from "@/components/forms/Messages";
import { UploadButton } from "@/components/forms/uploads";
import { Badge, Button, Select } from "@/components/ui";
import type { FormState } from "@/lib/form-state";

export interface DocRow {
  id: string;
  type: string;
  state: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  viewUrl: string;
}

const TYPES: Array<[string, string]> = [
  ["BUSINESS_LICENCE", "Business licence (required)"],
  ["TAX_REGISTRATION", "Tax registration"],
  ["FACTORY_PHOTO", "Factory photo"],
  ["ID_PROOF", "Owner ID proof"],
  ["OTHER", "Other"],
];
const tone = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

export function DocumentsManager({ docs, status }: { docs: DocRow[]; status: string }) {
  const router = useRouter();
  const [type, setType] = useState("BUSINESS_LICENCE");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [submitState, submit, submitting] = useActionState<FormState>(submitVerificationAction, {});
  const editable = status === "DRAFT" || status === "REJECTED";

  return (
    <div className="space-y-5">
      {docs.length === 0 ? (
        <p className="text-sm text-muted">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <a href={d.viewUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  {TYPES.find(([t]) => t === d.type)?.[1].replace(" (required)", "") ?? d.type}
                </a>
                {d.reviewNote && <p className="mt-0.5 text-xs text-danger">Reviewer note: {d.reviewNote}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={tone[d.state]}>{d.state.toLowerCase()}</Badge>
                {d.state !== "APPROVED" && (
                  <form action={removeDocumentAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit" variant="ghost" size="sm">Remove</Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="flex flex-wrap items-start gap-3">
          <Select aria-label="Document type" value={type} onChange={(e) => setType(e.target.value)} className="w-64">
            {TYPES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </Select>
          <UploadButton
            purpose="company-document"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            label="Upload document"
            onUploaded={async (f) => {
              const res = await addDocumentAction(type, f.key);
              setError(res.error ?? null);
              startTransition(() => router.refresh());
            }}
          />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {editable && (
        <form action={submit} className="space-y-3 border-t border-line pt-5">
          <FormMessages state={submitState} />
          <Button type="submit" disabled={submitting}>
            {status === "REJECTED" ? "Resubmit for verification" : "Submit for verification"}
          </Button>
        </form>
      )}
    </div>
  );
}
