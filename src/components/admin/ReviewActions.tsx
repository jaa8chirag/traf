"use client";

import { useActionState } from "react";
import { FormMessages } from "@/components/forms/Messages";
import { Button, Field } from "@/components/ui";
import type { FormState } from "@/lib/form-state";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/** Approve / reject-with-reason controls shared by the verification and product queues. */
export function ReviewActions({ id, approve, reject }: { id: string; approve: Action; reject: Action }) {
  const [approveState, approveAction, approving] = useActionState<FormState, FormData>(approve, {});
  const [rejectState, rejectAction, rejecting] = useActionState<FormState, FormData>(reject, {});
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form action={approveAction} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <FormMessages state={approveState} />
        <Button type="submit" disabled={approving || rejecting}>Approve</Button>
      </form>
      <form action={rejectAction} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <FormMessages state={rejectState} />
        <Field label="Reason for rejection (shown to the supplier)">
          {(p) => <textarea {...p} name="note" rows={3} required className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm" defaultValue={typeof rejectState.values?.note === "string" ? rejectState.values.note : ""} />}
        </Field>
        <Button type="submit" variant="danger" disabled={approving || rejecting}>Reject</Button>
      </form>
    </div>
  );
}
