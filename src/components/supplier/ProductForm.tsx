"use client";

import { useActionState } from "react";
import { saveProductAction } from "@/app/(supplier)/supplier/actions";
import { FormMessages } from "@/components/forms/Messages";
import { MediaField, type MediaItem } from "@/components/forms/MediaField";
import { Button, Field, Input, Select } from "@/components/ui";
import type { FormState } from "@/lib/form-state";

export interface FormAttr {
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "SELECT" | "MULTI_SELECT" | "BOOLEAN";
  unit?: string | null;
  options?: Array<{ value: string; label: string }> | null;
  isRequired: boolean;
}

interface Props {
  categoryId: string;
  categoryPath: string;
  productId?: string;
  attrs: FormAttr[];
  initial: Record<string, string | string[]>;
  media: MediaItem[];
  canSubmit: boolean;
  moderationNote?: string | null;
  tierSlots: number;
  maxMedia: number;
}

const area = "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm";

export function ProductForm({ categoryId, categoryPath, productId, attrs, initial, media, canSubmit, moderationNote, tierSlots, maxMedia }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProductAction, {});
  const val = (k: string): string => {
    const v = state.values?.[k] ?? initial[k];
    return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  };
  const multi = (k: string): string[] => {
    const v = state.values?.[k] ?? initial[k];
    return Array.isArray(v) ? v : v ? [v] : [];
  };
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={action} className="space-y-8" noValidate>
      <input type="hidden" name="categoryId" value={categoryId} />
      {productId && <input type="hidden" name="productId" value={productId} />}
      <FormMessages state={state} />
      {moderationNote && (
        <p role="alert" className="rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning">
          Reviewer feedback: {moderationNote}
        </p>
      )}
      <p className="text-sm text-muted">Category: <span className="font-medium text-ink">{categoryPath}</span></p>

      <section className="space-y-4">
        <h2 className="font-medium">Basics</h2>
        <Field label="Product title" error={err("title")}>{(p) => <Input {...p} name="title" required defaultValue={val("title")} />}</Field>
        <Field label="Short summary" error={err("summary")} hint="Up to 300 characters; shown on search cards.">
          {(p) => <Input {...p} name="summary" defaultValue={val("summary")} />}
        </Field>
        <Field label="Description" error={err("description")}>
          {(p) => <textarea {...p} name="description" rows={6} defaultValue={val("description")} className={area} />}
        </Field>
        <Field label="Keywords" error={err("keywords")} hint="Comma-separated, up to 10.">
          {(p) => <Input {...p} name="keywords" defaultValue={val("keywords")} />}
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Photos &amp; video</h2>
        {err("media") && <p role="alert" className="text-sm text-danger">{err("media")}</p>}
        <MediaField initial={media} max={maxMedia} />
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Price &amp; ordering</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Currency">
            {(p) => (
              <Select {...p} name="currency" defaultValue={val("currency") || "USD"}>
                <option value="USD">US$</option><option value="INR">₹ INR</option><option value="EUR">€ EUR</option>
              </Select>
            )}
          </Field>
          <Field label="Price from (per unit)" error={err("priceMin")}>{(p) => <Input {...p} name="priceMin" inputMode="decimal" defaultValue={val("priceMin")} />}</Field>
          <Field label="Price to (per unit)" error={err("priceMax")}>{(p) => <Input {...p} name="priceMax" inputMode="decimal" defaultValue={val("priceMax")} />}</Field>
          <Field label="Minimum order (MOQ)" error={err("moq")}>{(p) => <Input {...p} name="moq" inputMode="numeric" required defaultValue={val("moq")} />}</Field>
          <Field label="Unit" error={err("moqUnit")}>{(p) => <Input {...p} name="moqUnit" placeholder="pieces" required defaultValue={val("moqUnit")} />}</Field>
          <Field label="Lead time (days)" error={err("leadTimeDays")}>{(p) => <Input {...p} name="leadTimeDays" inputMode="numeric" defaultValue={val("leadTimeDays")} />}</Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Volume pricing (optional)</legend>
          {err("tiers") && <p role="alert" className="text-xs text-danger">{err("tiers")}</p>}
          {Array.from({ length: tierSlots }, (_, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <Input aria-label={`Tier ${i + 1} from quantity`} name={`tier_min_${i}`} inputMode="numeric" placeholder="From qty" defaultValue={val(`tier_min_${i}`)} />
              <Input aria-label={`Tier ${i + 1} to quantity`} name={`tier_max_${i}`} inputMode="numeric" placeholder="To qty (blank = and up)" defaultValue={val(`tier_max_${i}`)} />
              <Input aria-label={`Tier ${i + 1} unit price`} name={`tier_price_${i}`} inputMode="decimal" placeholder="Unit price" defaultValue={val(`tier_price_${i}`)} />
            </div>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-start gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="supportsSample" defaultChecked={state.values ? state.values.supportsSample === "on" : initial.supportsSample === "on"} /> Samples available
          </label>
          <Field label="Sample price" error={err("samplePrice")}>{(p) => <Input {...p} name="samplePrice" inputMode="decimal" className="w-40" defaultValue={val("samplePrice")} />}</Field>
        </div>
      </section>

      {attrs.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-medium">Specifications</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {attrs.map((a) => {
              const name = `attr.${a.key}`;
              const label = a.unit ? `${a.label} (${a.unit})${a.isRequired ? " *" : ""}` : `${a.label}${a.isRequired ? " *" : ""}`;
              if (a.type === "MULTI_SELECT") {
                const picked = multi(name);
                return (
                  <fieldset key={a.key}>
                    <legend className="mb-1.5 text-sm font-medium">{label}</legend>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {a.options?.map((o) => (
                        <label key={o.value} className="flex items-center gap-1.5">
                          <input type="checkbox" name={name} value={o.value} defaultChecked={picked.includes(o.value)} /> {o.label}
                        </label>
                      ))}
                    </div>
                    {err(name) && <p role="alert" className="mt-1 text-xs text-danger">{err(name)}</p>}
                  </fieldset>
                );
              }
              return (
                <Field key={a.key} label={label} error={err(name)}>
                  {(p) =>
                    a.type === "SELECT" || a.type === "BOOLEAN" ? (
                      <Select {...p} name={name} defaultValue={val(name)}>
                        <option value="">—</option>
                        {a.type === "BOOLEAN"
                          ? [<option key="t" value="true">Yes</option>, <option key="f" value="false">No</option>]
                          : a.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                    ) : (
                      <Input {...p} name={name} inputMode={a.type === "NUMBER" ? "decimal" : undefined} defaultValue={val(name)} />
                    )
                  }
                </Field>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>Save draft</Button>
        <Button type="submit" name="intent" value="submit" disabled={pending || !canSubmit}>Submit for review</Button>
        {!canSubmit && <span className="text-xs text-muted">Submitting unlocks once your company is verified.</span>}
      </div>
    </form>
  );
}
