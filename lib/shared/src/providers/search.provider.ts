export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
  resourceType: string;
  metadata?: Record<string, unknown>;
}

export interface SearchQuery {
  query: string;
  filters?: Record<string, string | string[]>;
  limit?: number;
  offset?: number;
}

export interface SearchFacet {
  field: string;
  values: Array<{ value: string; count: number }>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets?: SearchFacet[];
}

export interface ISearchProvider {
  search(query: SearchQuery): Promise<SearchResponse>;
  index(id: string, document: Record<string, unknown>): Promise<void>;
  remove(id: string): Promise<void>;
  reindexAll(): Promise<{ indexed: number; errors: number }>;
}
