import type { BaseProvider } from './base.interface.js';

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filter?: Record<string, unknown>;
}

export interface SearchResult<T = unknown> {
  items: T[];
  total: number;
}

export interface SearchProvider extends BaseProvider {
  readonly type: 'SEARCH';
  indexDocument<T extends Record<string, unknown>>(indexName: string, id: string, doc: T): Promise<boolean>;
  search<T = unknown>(indexName: string, query: string, options?: SearchOptions): Promise<SearchResult<T>>;
  deleteDocument(indexName: string, id: string): Promise<boolean>;
}
