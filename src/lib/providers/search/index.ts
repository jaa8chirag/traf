import { env } from "@/lib/env";
import { MeiliSearchProvider } from "./meili";
import type { SearchProvider } from "./types";

let instance: SearchProvider | undefined;

export function searchProvider(): SearchProvider {
  const e = env();
  instance ??= new MeiliSearchProvider({ host: e.MEILISEARCH_HOST, apiKey: e.MEILISEARCH_MASTER_KEY, prefix: e.MEILISEARCH_INDEX_PREFIX });
  return instance;
}

export type { SearchProvider, SearchDoc, SearchIndex, SearchQuery, SearchResult, FilterClause, IndexSettings } from "./types";
