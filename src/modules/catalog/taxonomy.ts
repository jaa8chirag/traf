// Pure taxonomy planning (no I/O): turns a JSON tree or CSV paths into an ordered,
// validated list of category rows. Applied to the DB by taxonomy-apply.ts.
import { parseCsvRecords } from "../../lib/csv";

export const MAX_LEVEL = 4;

export interface TaxonomyNode {
  name: string;
  nameI18n?: Record<string, string>;
  children?: TaxonomyNode[];
}

export interface PlannedCategory {
  /** Canonical identity: slash-joined segment slugs, e.g. "consumer-electronics/mobile-accessories". */
  path: string;
  parentPath: string | null;
  level: number;
  name: string;
  /** Globally unique URL slug (disambiguated when the same name appears more than once). */
  slug: string;
  sortOrder: number;
  isLeaf: boolean;
  nameI18n?: Record<string, string>;
}

export interface TaxonomyPlan {
  /** Parent-before-child order. */
  rows: PlannedCategory[];
  errors: string[];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** CSV columns: l1,l2,l3,l4 (names). Optional `<level>_<locale>` columns, e.g. l1_hi, hold translations. */
export function taxonomyFromCsv(text: string): TaxonomyNode[] {
  const roots: TaxonomyNode[] = [];
  for (const rec of parseCsvRecords(text)) {
    let siblings = roots;
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const name = rec[`l${level}`]?.trim();
      if (!name) break;
      let node = siblings.find((n) => n.name === name);
      if (!node) {
        node = { name, children: [] };
        siblings.push(node);
      }
      const i18n: Record<string, string> = {};
      for (const [k, v] of Object.entries(rec)) {
        const m = k.match(new RegExp(`^l${level}_([a-z]{2,3})$`));
        if (m && v) i18n[m[1]] = v;
      }
      if (Object.keys(i18n).length) node.nameI18n = { ...node.nameI18n, ...i18n };
      siblings = node.children ?? (node.children = []);
    }
  }
  return roots;
}

export function planTaxonomy(tree: TaxonomyNode[]): TaxonomyPlan {
  const errors: string[] = [];
  const rows: PlannedCategory[] = [];

  const walk = (nodes: TaxonomyNode[], parentPath: string | null, level: number): void => {
    const seen = new Set<string>();
    nodes.forEach((n, idx) => {
      const name = n.name?.trim();
      const seg = name ? slugify(name) : "";
      const where = `${parentPath ?? "(root)"} > ${name || "(empty)"}`;
      if (!seg) return void errors.push(`Empty or unusable name at ${where}`);
      if (level > MAX_LEVEL) return void errors.push(`Deeper than level ${MAX_LEVEL}: ${where}`);
      if (seen.has(seg)) return void errors.push(`Duplicate sibling "${name}" under ${parentPath ?? "(root)"}`);
      seen.add(seg);

      const path = parentPath ? `${parentPath}/${seg}` : seg;
      const kids = n.children ?? [];
      rows.push({
        path,
        parentPath,
        level,
        name,
        slug: seg, // finalised below
        sortOrder: idx,
        isLeaf: kids.length === 0,
        nameI18n: n.nameI18n,
      });
      if (kids.length) walk(kids, path, level + 1);
    });
  };
  walk(tree, null, 1);

  // Slugs must be globally unique. If a segment slug repeats, EVERY holder is disambiguated
  // (order-independent => stable across re-imports): parent-prefixed first, full path last.
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.slug, (counts.get(r.slug) ?? 0) + 1);
  for (const r of rows) {
    if ((counts.get(r.slug) ?? 0) > 1) {
      const parentSeg = r.parentPath?.split("/").pop();
      r.slug = parentSeg ? `${parentSeg}-${r.slug}` : r.slug;
    }
  }
  const counts2 = new Map<string, number>();
  for (const r of rows) counts2.set(r.slug, (counts2.get(r.slug) ?? 0) + 1);
  for (const r of rows) {
    if ((counts2.get(r.slug) ?? 0) > 1) r.slug = r.path.replaceAll("/", "-");
  }
  const dup = new Set<string>();
  for (const r of rows) {
    if (dup.has(r.slug)) errors.push(`Unresolvable slug collision: ${r.slug}`);
    dup.add(r.slug);
  }

  // Stable level order keeps parent-before-child while allowing batched inserts per level.
  rows.sort((a, b) => a.level - b.level);
  return { rows, errors };
}
