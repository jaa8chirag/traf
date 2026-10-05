// Pure validation of product spec values against a category's AttributeDefinitions.
export type AttributeKind = "TEXT" | "NUMBER" | "SELECT" | "MULTI_SELECT" | "BOOLEAN";

export interface AttrDef {
  id: string;
  key: string;
  label: string;
  type: AttributeKind;
  unit?: string | null;
  options?: ReadonlyArray<{ value: string; label: string }> | null;
  isRequired: boolean;
  isFilterable?: boolean;
}

export interface AttrValue {
  attributeId: string;
  valueText: string | null;
  valueNumber: string | null; // decimal string
  valueBool: boolean | null;
  valueJson: string[] | null;
}

export type RawAttrs = Record<string, string | string[] | undefined>;

export type AttrResult =
  | { ok: true; values: AttrValue[] }
  | { ok: false; errors: Record<string, string> };

const MAX_TEXT = 300;
const empty = (v: string | string[] | undefined): v is undefined | "" | [] =>
  v === undefined || (Array.isArray(v) ? v.length === 0 : v.trim() === "");

export function validateAttributeValues(defs: readonly AttrDef[], raw: RawAttrs): AttrResult {
  const errors: Record<string, string> = {};
  const values: AttrValue[] = [];

  for (const def of defs) {
    const input = raw[def.key];
    if (empty(input)) {
      if (def.isRequired) errors[def.key] = `${def.label} is required`;
      continue;
    }
    const base: AttrValue = { attributeId: def.id, valueText: null, valueNumber: null, valueBool: null, valueJson: null };
    const single = Array.isArray(input) ? input[0] : input;

    switch (def.type) {
      case "TEXT": {
        const text = single.trim();
        if (text.length > MAX_TEXT) errors[def.key] = `${def.label} must be at most ${MAX_TEXT} characters`;
        else values.push({ ...base, valueText: text });
        break;
      }
      case "NUMBER": {
        const s = single.trim();
        if (!/^-?\d+(\.\d+)?$/.test(s) || !Number.isFinite(Number(s)) || Math.abs(Number(s)) > 1e12) {
          errors[def.key] = `${def.label} must be a number`;
        } else values.push({ ...base, valueNumber: s });
        break;
      }
      case "BOOLEAN": {
        const s = single.trim().toLowerCase();
        if (s !== "true" && s !== "false") errors[def.key] = `${def.label} must be yes or no`;
        else values.push({ ...base, valueBool: s === "true" });
        break;
      }
      case "SELECT": {
        const allowed = new Set((def.options ?? []).map((o) => o.value));
        if (!allowed.has(single)) errors[def.key] = `${def.label}: choose one of the listed options`;
        else values.push({ ...base, valueText: single });
        break;
      }
      case "MULTI_SELECT": {
        const picked = Array.isArray(input) ? input : [input];
        const allowed = new Set((def.options ?? []).map((o) => o.value));
        if (picked.some((p) => !allowed.has(p))) errors[def.key] = `${def.label}: choose only listed options`;
        else values.push({ ...base, valueJson: [...new Set(picked)] });
        break;
      }
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}

/** Merge ancestor-first definition lists so a child category can override a parent's key. */
export function mergeDefinitions<T extends { key: string }>(chainRootFirst: ReadonlyArray<readonly T[]>): T[] {
  const byKey = new Map<string, T>();
  for (const defs of chainRootFirst) for (const d of defs) byKey.set(d.key, d);
  return [...byKey.values()];
}
