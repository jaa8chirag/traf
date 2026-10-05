import { describe, expect, it } from "vitest";
import { parseCsv } from "../../lib/csv";
import { planTaxonomy, slugify, taxonomyFromCsv } from "./taxonomy";

describe("slugify", () => {
  it("normalises names", () => {
    expect(slugify("Men's Clothing & Apparel")).toBe("mens-clothing-and-apparel");
    expect(slugify("  --Hello  World-- ")).toBe("hello-world");
  });
});

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and embedded newlines", () => {
    const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n"multi\nline",z\r\n');
    expect(rows).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["multi\nline", "z"]]);
  });
  it("ignores blank lines and a BOM", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("planTaxonomy", () => {
  it("builds paths, levels, leaves and parent-first order", () => {
    const plan = planTaxonomy([
      { name: "Electronics", children: [{ name: "Chargers", children: [{ name: "GaN" }] }, { name: "Cables" }] },
    ]);
    expect(plan.errors).toEqual([]);
    expect(plan.rows.map((r) => r.path)).toEqual(["electronics", "electronics/chargers", "electronics/cables", "electronics/chargers/gan"]);
    expect(plan.rows.find((r) => r.path === "electronics/cables")).toMatchObject({ level: 2, isLeaf: true, parentPath: "electronics" });
    expect(plan.rows.find((r) => r.path === "electronics")?.isLeaf).toBe(false);
  });

  it("disambiguates repeated names for ALL holders, independent of input order", () => {
    const a = planTaxonomy([
      { name: "Tools", children: [{ name: "Others" }] },
      { name: "Toys", children: [{ name: "Others" }] },
    ]);
    const b = planTaxonomy([
      { name: "Toys", children: [{ name: "Others" }] },
      { name: "Tools", children: [{ name: "Others" }] },
    ]);
    const slugs = (p: typeof a) => Object.fromEntries(p.rows.map((r) => [r.path, r.slug]));
    expect(slugs(a)["tools/others"]).toBe("tools-others");
    expect(slugs(a)["toys/others"]).toBe("toys-others");
    expect(slugs(a)).toEqual(slugs(b));
  });

  it("rejects empty names, duplicate siblings and depth over 4", () => {
    const plan = planTaxonomy([
      { name: "A", children: [{ name: "B", children: [{ name: "C", children: [{ name: "D", children: [{ name: "E" }] }] }] }] },
      { name: "A" },
      { name: "  " },
    ]);
    expect(plan.errors.join("\n")).toMatch(/Deeper than level 4/);
    expect(plan.errors.join("\n")).toMatch(/Duplicate sibling/);
    expect(plan.errors.join("\n")).toMatch(/Empty or unusable/);
  });

  it("is deterministic across runs", () => {
    const tree = [{ name: "X", children: [{ name: "Y" }, { name: "Z" }] }];
    expect(planTaxonomy(tree)).toEqual(planTaxonomy(tree));
  });
});

describe("taxonomyFromCsv", () => {
  it("merges shared prefixes into a tree and reads translations", () => {
    const tree = taxonomyFromCsv("l1,l2,l3,l1_hi\nFurniture,Office,Desks,फर्नीचर\nFurniture,Office,Chairs,\nFurniture,Home,,\n");
    expect(tree).toHaveLength(1);
    expect(tree[0].nameI18n).toEqual({ hi: "फर्नीचर" });
    expect(tree[0].children?.map((c) => c.name)).toEqual(["Office", "Home"]);
    expect(tree[0].children?.[0].children?.map((c) => c.name)).toEqual(["Desks", "Chairs"]);
  });
});
