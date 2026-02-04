
export type SearchSort = 'new' | 'popular';

export type SearchFilters = {
  keyword?: string;
  hashtags?: string[];
  sort?: SearchSort;
};
