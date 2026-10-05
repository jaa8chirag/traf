import { describe, expect, it } from "vitest";
import { mergeDefinitions, validateAttributeValues, type AttrDef } from "./attributes";
import { parseProductCsv, productInputSchema, readProductForm } from "./product-schemas";

const defs: AttrDef[] = [
  { id: "a1", key: "wattage", label: "Wattage", type: "NUMBER", unit: "W", isRequired: true },
  { id: "a2", key: "color", label: "Colour", type: "SELECT", isRequired: false, options: [{ value: "red", label: "Red" }, { value: "blue", label: "Blue" }] },
  { id: "a3", key: "ports", label: "Ports", type: "MULTI_SELECT", isRequired: false, options: [{ value: "usb-a", label: "USB-A" }, { value: "usb-c", label: "USB-C" }] },
  { id: "a4", key: "foldable", label: "Foldable", type: "BOOLEAN", isRequired: false },
  { id: "a5", key: "model", label: "Model", type: "TEXT", isRequired: false },
];

describe("validateAttributeValues", () => {
  it("accepts valid values and types them", () => {
    const r = validateAttributeValues(defs, { wattage: "65", color: "red", ports: ["usb-a", "usb-c"], foldable: "true", model: " X1 " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.find((v) => v.attributeId === "a1")?.valueNumber).toBe("65");
    expect(r.values.find((v) => v.attributeId === "a4")?.valueBool).toBe(true);
    expect(r.values.find((v) => v.attributeId === "a5")?.valueText).toBe("X1");
    expect(r.values.find((v) => v.attributeId === "a3")?.valueJson).toEqual(["usb-a", "usb-c"]);
  });

  it("rejects bad types, unknown options and missing required values", () => {
    const r = validateAttributeValues(defs, { wattage: "abc", color: "green", ports: ["hdmi"], foldable: "maybe" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["color", "foldable", "ports", "wattage"]);
    const missing = validateAttributeValues(defs, {});
    expect(!missing.ok && missing.errors.wattage).toMatch(/required/);
  });

  it("ignores keys that are not defined for the category", () => {
    const r = validateAttributeValues(defs, { wattage: "10", injected: "x" });
    expect(r.ok && r.values).toHaveLength(1);
  });
});

describe("mergeDefinitions", () => {
  it("lets a child override its parent's key", () => {
    const merged = mergeDefinitions([[{ key: "color", v: 1 }, { key: "size", v: 1 }], [{ key: "color", v: 2 }]]);
    expect(merged).toEqual([{ key: "color", v: 2 }, { key: "size", v: 1 }]);
  });
});

const base = { title: "Aluminium Phone Stand", moq: "100", moqUnit: "pieces" };

describe("productInputSchema", () => {
  it("accepts a minimal valid product", () => {
    expect(productInputSchema.safeParse(base).success).toBe(true);
  });
  it("enforces price order and decimals", () => {
    expect(productInputSchema.safeParse({ ...base, priceMin: "5", priceMax: "3" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, priceMin: "5.123" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, priceMax: "3" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, priceMin: "3", priceMax: "3" }).success).toBe(true);
  });
  it("validates price tiers", () => {
    const ok = [{ minQty: 100, maxQty: 499, unitPrice: "5" }, { minQty: 500, unitPrice: "4.5" }];
    expect(productInputSchema.safeParse({ ...base, tiers: ok }).success).toBe(true);
    expect(productInputSchema.safeParse({ ...base, tiers: [{ minQty: 100, maxQty: 600, unitPrice: "5" }, { minQty: 500, unitPrice: "4" }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, tiers: [{ minQty: 100, unitPrice: "5" }, { minQty: 500, unitPrice: "4" }] }).success).toBe(false);
  });
  it("rejects a sample price when samples are off, and MOQ < 1", () => {
    expect(productInputSchema.safeParse({ ...base, samplePrice: "9" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, moq: "0" }).success).toBe(false);
  });
});

describe("readProductForm", () => {
  it("collects tiers, media, keywords and dynamic attributes", () => {
    const fd = new FormData();
    fd.set("title", "Aluminium Phone Stand");
    fd.set("moq", "100");
    fd.set("moqUnit", "pieces");
    fd.set("keywords", "stand, phone ,  ");
    fd.set("tier_min_0", "100");
    fd.set("tier_price_0", "5");
    fd.append("media", "IMAGE|public/products/c1/a.jpg");
    fd.append("attr.ports", "usb-a");
    fd.append("attr.ports", "usb-c");
    fd.set("attr.wattage", "65");
    const { input, attrs } = readProductForm(fd);
    const parsed = productInputSchema.parse(input);
    expect(parsed.keywords).toEqual(["stand", "phone"]);
    expect(parsed.tiers).toHaveLength(1);
    expect(parsed.media[0]).toEqual({ type: "IMAGE", key: "public/products/c1/a.jpg" });
    expect(attrs).toEqual({ ports: ["usb-a", "usb-c"], wattage: "65" });
  });
});

describe("parseProductCsv", () => {
  it("returns valid rows and row-level errors with line numbers", () => {
    const csv =
      "title,category_slug,moq,moq_unit,price_min,price_max\n" +
      "Good Widget Pro,chargers,100,pieces,1.5,2\n" +
      "Bad,chargers,100,pieces,1,2\n" +
      "No Category Here,,100,pieces,1,2\n" +
      "Price Order Bad,chargers,10,pieces,9,2\n";
    const { rows, errors } = parseProductCsv(csv);
    expect(rows.map((r) => r.line)).toEqual([2]);
    expect(errors.map((e) => e.line)).toEqual([3, 4, 5]);
  });
  it("caps the number of rows", () => {
    const body = Array.from({ length: 501 }, () => "Widget Thing,x,1,pcs").join("\n");
    const { errors } = parseProductCsv(`title,category_slug,moq,moq_unit\n${body}`);
    expect(errors[0].message).toMatch(/Too many rows/);
  });
});
