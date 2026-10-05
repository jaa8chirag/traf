export type SearchIndex = "products" | "suppliers";

export interface SearchDoc {
  id: string;
  [field: string]: unknown;
}

type Scalar = string | number | boolean;

/** Engine-neutral filter clause. Clauses in a list are ANDed; values inside `in` are ORed. */
export type FilterClause =
  | { field: string; in: Scalar[] }
  | { field: string; gte?: number; lte?: number };

export interface SearchQuery {
  q: string;
  filter: FilterClause[];
  /** Fields to return value counts for. */
  facets: string[];
  /** e.g. ["priceMinUsd:asc"]. Empty = relevance. */
  sort: string[];
  page: number;
  pageSize: number;
}

export interface SearchResult {
  hits: SearchDoc[];
  total: number;
  facets: Record<string, Record<string, number>>;
  processingMs: number;
}

export interface IndexSettings {
  searchable: string[];
  filterable: string[];
  sortable: string[];
  /** Engine ranking rules, most important first. */
  ranking: string[];
  maxFacetValues: number;
}

export interface SearchProvider {
  /** Create the index if needed and apply settings. Safe to call repeatedly. */
  configure(index: SearchIndex, settings: IndexSettings): Promise<void>;
  upsert(index: SearchIndex, docs: SearchDoc[]): Promise<void>;
  remove(index: SearchIndex, ids: string[]): Promise<void>;
  query(index: SearchIndex, query: SearchQuery): Promise<SearchResult>;
  /** Several queries in one round trip (used for disjunctive facet counts). */
  multiQuery(index: SearchIndex, queries: SearchQuery[]): Promise<SearchResult[]>;
  /** Build a fresh index from batches and atomically swap it in (zero-downtime reindex). */
  rebuild(index: SearchIndex, settings: IndexSettings, batches: AsyncIterable<SearchDoc[]>): Promise<number>;
}
