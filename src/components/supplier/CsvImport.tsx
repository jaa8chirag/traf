"use client";

import { useActionState } from "react";
import { importCsvAction } from "@/app/(supplier)/supplier/actions";
import { FormMessages } from "@/components/forms/Messages";
import { Button } from "@/components/ui";
import type { FormState } from "@/lib/form-state";

export function CsvImport() {
  const [state, action, pending] = useActionState<FormState, FormData>(importCsvAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormMessages state={state} />
      <input type="file" name="file" accept=".csv,text/csv" required className="block text-sm" />
      <Button type="submit" disabled={pending}>{pending ? "Importing…" : "Import products"}</Button>
    </form>
  );
}
