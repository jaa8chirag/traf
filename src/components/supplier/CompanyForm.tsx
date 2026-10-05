"use client";

import { useActionState, useState } from "react";
import { saveCompanyAction } from "@/app/(supplier)/supplier/actions";
import { FormMessages, pick } from "@/components/forms/Messages";
import { UploadButton } from "@/components/forms/uploads";
import { Button, Field, Input, Select } from "@/components/ui";
import { COUNTRIES } from "@/lib/countries";
import type { FormState } from "@/lib/form-state";

export interface CompanyFormData {
  name: string;
  slug: string;
  businessType: string;
  rd: string[];
  country: string;
  province: string;
  city: string;
  address: string;
  description: string;
  yearFounded: string;
  employeeBand: string;
  website: string;
  logoKey: string;
  logoViewUrl: string | null;
  slugLocked: boolean;
}

const BUSINESS_TYPES: Array<[string, string]> = [
  ["MANUFACTURER", "Manufacturer"],
  ["TRADING_COMPANY", "Trading company"],
  ["GROUP_CORP", "Group corporation"],
  ["OTHER", "Other"],
];
const RD: Array<[string, string]> = [["OEM", "OEM"], ["ODM", "ODM"], ["OWN_BRAND", "Own brand"]];
const BANDS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export function CompanyForm({ company, locked }: { company: CompanyFormData; locked: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCompanyAction, {});
  const [logo, setLogo] = useState({ key: company.logoKey, url: company.logoViewUrl });
  const v = (k: keyof CompanyFormData) => pick(state, k, String(company[k] ?? ""));
  const err = (k: string) => state.fieldErrors?.[k];
  const rdSelected = Array.isArray(state.values?.rd) ? state.values.rd : typeof state.values?.rd === "string" ? [state.values.rd] : company.rd;

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessages state={state} />
      <input type="hidden" name="logoKey" value={logo.key} />

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-line bg-white text-xs text-muted">
          {logo.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- direct object-storage URL
            <img src={logo.url} alt="Company logo" className="h-full w-full object-contain" />
          ) : (
            "No logo"
          )}
        </div>
        <UploadButton purpose="company-logo" accept="image/jpeg,image/png,image/webp" label="Upload logo" onUploaded={(f) => setLogo({ key: f.key, url: f.publicUrl })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" error={err("name")}>
          {(p) => <Input {...p} name="name" required defaultValue={v("name") === "My company" ? "" : v("name")} />}
        </Field>
        <Field label="Showroom address" error={err("slug")} hint={locked ? "Locked after verification" : "tarf.example/s/your-address"}>
          {(p) => <Input {...p} name="slug" required readOnly={locked} defaultValue={v("slug")} />}
        </Field>
        <Field label="Business type" error={err("businessType")}>
          {(p) => (
            <Select {...p} name="businessType" defaultValue={v("businessType")}>
              {BUSINESS_TYPES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </Select>
          )}
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">R&amp;D capability</legend>
          <div className="flex gap-4 pt-2 text-sm">
            {RD.map(([val, label]) => (
              <label key={val} className="flex items-center gap-1.5">
                <input type="checkbox" name="rd" value={val} defaultChecked={rdSelected.includes(val)} /> {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Country" error={err("country")}>
          {(p) => (
            <Select {...p} name="country" defaultValue={v("country")}>
              {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Province / state" error={err("province")}>
          {(p) => <Input {...p} name="province" required defaultValue={v("province")} />}
        </Field>
        <Field label="City" error={err("city")}>
          {(p) => <Input {...p} name="city" required defaultValue={v("city")} />}
        </Field>
        <Field label="Address" error={err("address")}>
          {(p) => <Input {...p} name="address" defaultValue={v("address")} />}
        </Field>
        <Field label="Year founded" error={err("yearFounded")}>
          {(p) => <Input {...p} name="yearFounded" inputMode="numeric" defaultValue={v("yearFounded")} />}
        </Field>
        <Field label="Employees" error={err("employeeBand")}>
          {(p) => (
            <Select {...p} name="employeeBand" defaultValue={v("employeeBand")}>
              <option value="">—</option>
              {BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Website" error={err("website")}>
          {(p) => <Input {...p} name="website" type="url" placeholder="https://" defaultValue={v("website")} />}
        </Field>
      </div>

      <Field label="About your company" error={err("description")} hint="Shown on your showroom. Max 3000 characters.">
        {(p) => (
          <textarea {...p} name="description" rows={5} defaultValue={v("description")} className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm" />
        )}
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
