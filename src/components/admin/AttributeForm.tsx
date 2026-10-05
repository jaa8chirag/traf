"use client";

import { useActionState, useState } from "react";
import { saveAttributeAction } from "@/app/(admin)/admin/actions";
import { FormMessages, pick } from "@/components/forms/Messages";
import { Button, Field, Input, Select } from "@/components/ui";
import type { FormState } from "@/lib/form-state";

export function AttributeForm({ categoryId }: { categoryId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAttributeAction, {});
  const [type, setType] = useState("TEXT");
  const err = (k: string) => state.fieldErrors?.[k];
  const choice = type === "SELECT" || type === "MULTI_SELECT";
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line bg-white p-5" noValidate>
      <h2 className="font-medium">Add or update an attribute</h2>
      <FormMessages state={state} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Key" error={err("key")} hint="Stable id, e.g. wattage. Saving an existing key updates it.">
          {(p) => <Input {...p} name="key" required defaultValue={pick(state, "key")} />}
        </Field>
        <Field label="Label" error={err("label")}>{(p) => <Input {...p} name="label" required defaultValue={pick(state, "label")} />}</Field>
        <Field label="Type">
          {(p) => (
            <Select {...p} name="type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="TEXT">Text</option><option value="NUMBER">Number</option><option value="SELECT">Single choice</option>
              <option value="MULTI_SELECT">Multiple choice</option><option value="BOOLEAN">Yes / No</option>
            </Select>
          )}
        </Field>
        <Field label="Unit" error={err("unit")}>{(p) => <Input {...p} name="unit" placeholder="W, mm, kg…" defaultValue={pick(state, "unit")} />}</Field>
        <Field label="Sort order" error={err("sortOrder")}>{(p) => <Input {...p} name="sortOrder" inputMode="numeric" defaultValue={pick(state, "sortOrder", "0")} />}</Field>
      </div>
      {choice && (
        <Field label="Options" error={err("optionsText")} hint="One per line: value or value|Label">
          {(p) => <textarea {...p} name="optionsText" rows={4} defaultValue={pick(state, "optionsText")} className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm" />}
        </Field>
      )}
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="isRequired" /> Required to submit</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isFilterable" /> Use as search filter</label>
      </div>
      <Button type="submit" disabled={pending}>Save attribute</Button>
    </form>
  );
}
