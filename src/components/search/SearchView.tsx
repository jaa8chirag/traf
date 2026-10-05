import Link from "next/link";
import { ProductCard, SupplierCard } from "@/components/public/Cards";
import { EmptyState, Pagination } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  DEFAULT_PARAMS, buildQuery, toggleAttr, toggleMulti,
  type FacetBlock, type MultiGroup, type SearchOutcome, type SearchParams, type SortKey, type Tab,
} from "@/modules/search";

interface Props {
  outcome: SearchOutcome;
  params: SearchParams;
  /** Path the links are built on ("/search", "/c/a/b", "/suppliers"...). */
  basePath: string;
  /** Params that live in the path / are fixed by the page and must not appear in the query string. */
  omit?: ReadonlyArray<keyof SearchParams>;
  /** Tabs offered on this page. */
  tabs?: ReadonlyArray<Tab>;
}

const TAB_LABEL: Record<Tab, string> = { products: "Products", suppliers: "Suppliers", secured: "Secured Trading" };
const SORT_LABEL: Record<SortKey, string> = { relevance: "Best match", newest: "Newest", price_asc: "Price: low to high", price_desc: "Price: high to low", moq_asc: "Lowest MOQ" };
const VISIBLE_OPTIONS = 6;

export function SearchView({ outcome, params, basePath, omit = [], tabs = ["products", "suppliers", "secured"] }: Props) {
  const href = (p: SearchParams): string => {
    const q = buildQuery(p, omit);
    return q ? `${basePath}?${q}` : basePath;
  };
  const isSuppliers = params.tab === "suppliers";
  const sorts: SortKey[] = isSuppliers ? ["relevance", "newest"] : ["relevance", "newest", "price_asc", "price_desc", "moq_asc"];
  const chips = activeChips(params, outcome.facets);
  const filterCount = chips.length;

  return (
    <div className="space-y-6">
      {outcome.degraded && (
        <p role="status" className="rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning">
          Advanced search is temporarily unavailable. Showing basic results without filters.
        </p>
      )}

      {tabs.length > 1 && (
        <nav aria-label="Result type" className="flex flex-wrap gap-2 text-sm">
          {tabs.map((t) => {
            const active = params.tab === t;
            const count = outcome.tabCounts[t];
            return (
              <Link key={t} href={href({ ...DEFAULT_PARAMS, tab: t, q: params.q, cat: params.cat })} aria-current={active ? "page" : undefined}
                className={cn("rounded-full px-4 py-1.5", active ? "bg-ink text-paper" : "border border-line bg-white hover:border-ink")}>
                {TAB_LABEL[t]} <span className={active ? "text-paper/70" : "text-muted"}>({count})</span>
              </Link>
            );
          })}
        </nav>
      )}

      {outcome.subcategories.length > 0 && (
        <nav aria-label="Sub-categories">
          <ul className="flex flex-wrap gap-2">
            {outcome.subcategories.map((c) => (
              <li key={c.path}>
                <Link href={`/c/${c.path}${params.q ? `?q=${encodeURIComponent(params.q)}` : ""}`} className="inline-block rounded-full border border-line bg-white px-4 py-1.5 text-sm hover:border-ink">
                  {c.name} <span className="text-muted">({c.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Active filters">
          {chips.map((c) => (
            <Link key={c.key} href={href(c.remove)} rel="nofollow" className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-3 py-1 hover:bg-line">
              {c.label} <span aria-hidden>✕</span><span className="sr-only">remove filter</span>
            </Link>
          ))}
          <Link href={href({ ...DEFAULT_PARAMS, tab: params.tab, q: params.q, cat: params.cat })} rel="nofollow" className="underline">Clear all</Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <details className="filters group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium lg:hidden">
            <span>Filters{filterCount ? ` (${filterCount})` : ""}</span><span aria-hidden>▾</span>
          </summary>
          <aside aria-label="Filters" className="mt-3 space-y-5 lg:mt-0">
            {outcome.facets.map((b) => <FacetSection key={b.id} block={b} params={params} href={href} />)}
            {!isSuppliers && <RangeForm params={params} basePath={basePath} omit={omit} />}
          </aside>
        </details>

        <section aria-label="Results" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted" aria-live="polite">{outcome.total.toLocaleString("en-US")} result{outcome.total === 1 ? "" : "s"}{params.q ? ` for “${params.q}”` : ""}</p>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Sort">
              {sorts.map((s) => (
                <Link key={s} href={href({ ...params, sort: s, page: 1 })} rel="nofollow" aria-current={params.sort === s ? "true" : undefined}
                  className={cn("rounded-full px-3 py-1", params.sort === s ? "bg-ink text-paper" : "hover:bg-paper-2")}>
                  {SORT_LABEL[s]}
                </Link>
              ))}
            </div>
          </div>

          <h2 className="sr-only">{isSuppliers ? "Suppliers" : "Products"}</h2>
          {outcome.total === 0 ? (
            <EmptyState title="No results found">
              Try fewer filters or a different keyword.{" "}
              {filterCount > 0 && <Link href={href({ ...DEFAULT_PARAMS, tab: params.tab, q: params.q, cat: params.cat })} className="underline">Clear all filters</Link>}
            </EmptyState>
          ) : isSuppliers ? (
            <div className="grid gap-4 md:grid-cols-2">{outcome.suppliers.map((s) => <SupplierCard key={s.id} s={s} />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{outcome.products.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 3} />)}</div>
          )}
          <Pagination page={outcome.page} pageCount={outcome.pageCount} hrefFor={(n) => href({ ...params, page: n })} />
        </section>
      </div>
    </div>
  );
}

/* ───────── Facets ───────── */

function nextFor(p: SearchParams, b: FacetBlock, value: string): SearchParams {
  if (b.group === "audited") return { ...p, audited: !p.audited, page: 1 };
  if (b.group === "sample") return { ...p, sample: !p.sample, page: 1 };
  if (b.group.startsWith("attr:")) return toggleAttr(p, b.group.slice(5), value);
  return toggleMulti(p, b.group as MultiGroup, value);
}

function FacetSection({ block, params, href }: { block: FacetBlock; params: SearchParams; href: (p: SearchParams) => string }) {
  const visible = block.options.slice(0, VISIBLE_OPTIONS);
  const rest = block.options.slice(VISIBLE_OPTIONS);
  const row = (o: FacetBlock["options"][number]) => (
    <li key={o.value}>
      <Link href={href(nextFor(params, block, o.value))} rel="nofollow" aria-pressed={o.selected}
        className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-paper-2", o.count === 0 && !o.selected && "opacity-50")}>
        <span aria-hidden className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]", o.selected ? "border-ink bg-ink text-paper" : "border-line bg-white")}>{o.selected ? "✓" : ""}</span>
        <span className="min-w-0 flex-1 truncate">{o.label}</span>
        <span className="text-xs text-muted">{o.count}</span>
      </Link>
    </li>
  );
  return (
    <details open className="rounded-xl border border-line bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">{block.label}</summary>
      <ul className="space-y-0.5 px-2 pb-3">
        {visible.map(row)}
        {rest.length > 0 && (
          <li>
            <details className="group/more">
              <summary className="cursor-pointer list-none rounded-lg px-2 py-1.5 text-sm text-muted hover:text-ink">Show {rest.length} more</summary>
              <ul className="space-y-0.5">{rest.map(row)}</ul>
            </details>
          </li>
        )}
      </ul>
    </details>
  );
}

/** Price / MOQ ranges: a plain GET form so it works without JavaScript. */
function RangeForm({ params, basePath, omit }: { params: SearchParams; basePath: string; omit: ReadonlyArray<keyof SearchParams> }) {
  const carried = new URLSearchParams(buildQuery({ ...params, priceMin: null, priceMax: null, moqMax: null, page: 1 }, omit));
  const input = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm";
  return (
    <form action={basePath} className="space-y-3 rounded-xl border border-line bg-white p-4">
      {[...carried.entries()].map(([k, v], i) => <input key={`${k}-${i}`} type="hidden" name={k} value={v} />)}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Price (US$)</legend>
        <div className="flex items-center gap-2">
          <input aria-label="Minimum price in US dollars" name="priceMin" inputMode="decimal" placeholder="Min" defaultValue={params.priceMin ?? ""} className={input} />
          <span aria-hidden>–</span>
          <input aria-label="Maximum price in US dollars" name="priceMax" inputMode="decimal" placeholder="Max" defaultValue={params.priceMax ?? ""} className={input} />
        </div>
      </fieldset>
      <label className="block space-y-2 text-sm font-medium">
        Max. MOQ
        <input name="moqMax" inputMode="numeric" placeholder="e.g. 500" defaultValue={params.moqMax ?? ""} className={cn(input, "font-normal")} />
      </label>
      <button type="submit" className="h-10 w-full rounded-full bg-ink text-sm font-medium text-paper hover:bg-ink-2">Apply</button>
    </form>
  );
}

/* ───────── Active filter chips ───────── */

interface Chip { key: string; label: string; remove: SearchParams }

function activeChips(p: SearchParams, facets: FacetBlock[]): Chip[] {
  const label = (group: string, value: string): string => facets.find((b) => b.group === group)?.options.find((o) => o.value === value)?.label ?? value;
  const chips: Chip[] = [];
  for (const g of ["biz", "rd", "tier", "loc", "cert"] as const) for (const v of p[g]) chips.push({ key: `${g}:${v}`, label: label(g, v), remove: toggleMulti(p, g, v) });
  for (const [k, vs] of Object.entries(p.attrs)) for (const v of vs) chips.push({ key: `attr:${k}:${v}`, label: `${facets.find((b) => b.group === `attr:${k}`)?.label ?? k}: ${label(`attr:${k}`, v)}`, remove: toggleAttr(p, k, v) });
  if (p.audited) chips.push({ key: "audited", label: "Audited", remove: { ...p, audited: false, page: 1 } });
  if (p.sample) chips.push({ key: "sample", label: "Samples available", remove: { ...p, sample: false, page: 1 } });
  if (p.priceMin !== null || p.priceMax !== null) chips.push({ key: "price", label: `Price US$ ${p.priceMin ?? 0}${p.priceMax !== null ? ` – ${p.priceMax}` : "+"}`, remove: { ...p, priceMin: null, priceMax: null, page: 1 } });
  if (p.moqMax !== null) chips.push({ key: "moq", label: `MOQ ≤ ${p.moqMax}`, remove: { ...p, moqMax: null, page: 1 } });
  return chips;
}
