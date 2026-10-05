import { Meilisearch, type Index, type SearchParams, type SearchResponse } from "meilisearch";
import type { FilterClause, IndexSettings, SearchDoc, SearchIndex, SearchProvider, SearchQuery, SearchResult } from "./types";

export interface MeiliConfig {
  host: string;
  apiKey: string;
  prefix: string;
}

const quote = (v: string | number | boolean): string => (typeof v === "string" ? JSON.stringify(v) : String(v));

/** Compile engine-neutral clauses into Meilisearch filter expressions (array = AND). */
export function compileFilter(clauses: FilterClause[]): string[] {
  const out: string[] = [];
  for (const c of clauses) {
    if ("in" in c) {
      if (c.in.length === 0) continue;
      out.push(c.in.length === 1 ? `${c.field} = ${quote(c.in[0])}` : `(${c.in.map((v) => `${c.field} = ${quote(v)}`).join(" OR ")})`);
    } else {
      if (c.gte !== undefined) out.push(`${c.field} >= ${c.gte}`);
      if (c.lte !== undefined) out.push(`${c.field} <= ${c.lte}`);
    }
  }
  return out;
}

function toParams(q: SearchQuery): SearchParams {
  const filter = compileFilter(q.filter);
  return {
    // Finite pagination => exact totalHits (offset/limit only gives an estimate). pageSize 0 = facets only.
    ...(q.pageSize === 0 ? { limit: 0 } : { page: Math.max(1, q.page), hitsPerPage: q.pageSize }),
    ...(filter.length ? { filter } : {}),
    ...(q.facets.length ? { facets: q.facets } : {}),
    ...(q.sort.length ? { sort: q.sort } : {}),
  };
}

function toResult(r: SearchResponse): SearchResult {
  const facets: Record<string, Record<string, number>> = {};
  for (const [k, v] of Object.entries(r.facetDistribution ?? {})) facets[k] = { ...v };
  const total = "totalHits" in r && typeof r.totalHits === "number" ? r.totalHits : (r.estimatedTotalHits ?? r.hits.length);
  return { hits: r.hits as SearchDoc[], total, facets, processingMs: r.processingTimeMs };
}

export class MeiliSearchProvider implements SearchProvider {
  private client: Meilisearch;

  constructor(private cfg: MeiliConfig) {
    this.client = new Meilisearch({ host: cfg.host, apiKey: cfg.apiKey });
  }

  private uid = (index: SearchIndex): string => `${this.cfg.prefix}${index}`;
  private idx = (index: SearchIndex): Index => this.client.index(this.uid(index));

  private async applySettings(uid: string, s: IndexSettings): Promise<void> {
    await this.client
      .index(uid)
      .updateSettings({
        searchableAttributes: s.searchable,
        filterableAttributes: s.filterable,
        sortableAttributes: s.sortable,
        rankingRules: s.ranking,
        faceting: { maxValuesPerFacet: s.maxFacetValues, sortFacetValuesBy: { "*": "count" } },
        pagination: { maxTotalHits: 20000 },
        typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
      })
      .waitTask();
  }

  async configure(index: SearchIndex, settings: IndexSettings): Promise<void> {
    const uid = this.uid(index);
    if (!(await this.exists(uid))) await this.client.createIndex(uid, { primaryKey: "id" }).waitTask();
    await this.applySettings(uid, settings);
  }

  private async exists(uid: string): Promise<boolean> {
    try {
      await this.client.getIndex(uid);
      return true;
    } catch {
      return false;
    }
  }

  async upsert(index: SearchIndex, docs: SearchDoc[]): Promise<void> {
    if (docs.length) await this.idx(index).addDocuments(docs).waitTask();
  }

  async remove(index: SearchIndex, ids: string[]): Promise<void> {
    if (ids.length) await this.idx(index).deleteDocuments(ids).waitTask();
  }

  async query(index: SearchIndex, q: SearchQuery): Promise<SearchResult> {
    return toResult(await this.idx(index).search(q.q, toParams(q)));
  }

  async multiQuery(index: SearchIndex, queries: SearchQuery[]): Promise<SearchResult[]> {
    if (!queries.length) return [];
    const res = await this.client.multiSearch({ queries: queries.map((q) => ({ indexUid: this.uid(index), q: q.q, ...toParams(q) })) });
    return res.results.map((r) => toResult(r as SearchResponse));
  }

  async rebuild(index: SearchIndex, settings: IndexSettings, batches: AsyncIterable<SearchDoc[]>): Promise<number> {
    const live = this.uid(index);
    const tmp = `${live}__build`;
    await this.client.deleteIndexIfExists(tmp);
    await this.client.createIndex(tmp, { primaryKey: "id" }).waitTask();
    await this.applySettings(tmp, settings);

    let n = 0;
    for await (const batch of batches) {
      if (!batch.length) continue;
      await this.client.index(tmp).addDocuments(batch).waitTask({ timeout: 120_000 });
      n += batch.length;
    }
    if (!(await this.exists(live))) await this.client.createIndex(live, { primaryKey: "id" }).waitTask();
    await this.client.swapIndexes([{ indexes: [live, tmp], rename: false }]).waitTask();
    await this.client.deleteIndexIfExists(tmp);
    return n;
  }
}
