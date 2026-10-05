export type SearchIndex = "products" | "suppliers";

export interface SearchDoc {
  id: string;
  [field: string]: unknown;
}

export interface SearchQuery {
  q: string;
  filters?: Record<string, string | number | boolean | Array<string | number>>;
  facets?: string[];
  sort?: string[];
  page: number;
  pageSize: number;
}

export interface SearchResult {
  hits: SearchDoc[];
  total: number;
  facets: Record<string, Record<string, number>>;
}

export interface SearchProvider {
  upsert(index: SearchIndex, docs: SearchDoc[]): Promise<void>;
  remove(index: SearchIndex, ids: string[]): Promise<void>;
  query(index: SearchIndex, q: SearchQuery): Promise<SearchResult>;
}
