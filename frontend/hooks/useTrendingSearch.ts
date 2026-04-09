/**
 * hooks/useTrendingSearch.ts
 * ───────────────────────────
 * Infinite-scroll search for posts (captions + hashtags).
 * Uses React Query v5 (useInfiniteQuery) + apiService.searchTrendingPosts().
 *
 * Backend: GET /posts/search?q=&hashtag=&sort=&page=&limit=
 *   sort 'new'     → ORDER BY created_at  DESC  (backend default)
 *   sort 'popular' → ORDER BY likes_count  DESC
 *
 * IMPORTANT: backend posts.js uses sort='new'|'popular',
 * NOT 'newest'|'popular'. This hook uses the backend values directly.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiService }        from '../services/Api.service';
import type { Post }          from '../types/post';

interface UseTrendingSearchOptions {
  query?:   string;
  hashtag?: string | null;
  /** Backend sort param: 'new' | 'popular' */
  sort?:    'new' | 'popular';
  enabled?: boolean;
}

interface TrendingSearchPage {
  data:    Post[];
  page:    number;
  hasMore: boolean;
}

export function useTrendingSearch(options: UseTrendingSearchOptions = {}) {
  const {
    query   = '',
    hashtag = null,
    sort    = 'new',
    enabled = true,
  } = options;

  return useInfiniteQuery<TrendingSearchPage, Error>({
    queryKey: ['trending-search', query, hashtag, sort],

    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === 'number' ? pageParam : 1;

      const result = await apiService.searchTrendingPosts({
        q:       query   || undefined,
        hashtag: hashtag || undefined,
        sort,
        page,
        limit: 10,
      });

      return {
        data:    result.data,
        page,
        hasMore: result.hasMore ?? (result.data.length === 10),
      };
    },

    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,

    initialPageParam: 1,

    // Only fire when there's a query to search for
    enabled: enabled && Boolean(query || hashtag),

    staleTime:            15_000,      // 15 s — search results stale faster
    gcTime:               2 * 60_000,
    refetchOnWindowFocus: false,
    retry:                1,
  });
}

/** Flatten all pages into a single Post[]. */
export function flattenSearchPages(
  data: ReturnType<typeof useTrendingSearch>['data']
): Post[] {
  return data?.pages.flatMap(p => p.data) ?? [];
}