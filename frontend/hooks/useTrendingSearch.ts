import { useInfiniteQuery } from '@tanstack/react-query';
import { apiService } from '../services/Api.service';
import { Post } from '../types/post';

interface UseTrendingSearchOptions {
  query?: string;
  hashtag?: string | null;
  sort?: 'newest' | 'popular';
  enabled?: boolean;
}

interface TrendingSearchPage {
  data: Post[];
  page: number;
}

export function useTrendingSearch(
  options: UseTrendingSearchOptions = {}
) {
  const {
    query = '',
    hashtag = null,
    sort = 'newest',
    enabled = true, // Default to true if not provided
  } = options;

  return useInfiniteQuery<TrendingSearchPage, Error>({
    queryKey: ['trending-search', query, hashtag, sort],

    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === 'number' ? pageParam : 1;

      return apiService.searchTrendingPosts({
        q: query || undefined,
        hashtag: hashtag || undefined,
        sort,
        page,
        limit: 10,
      });
    },

    getNextPageParam: (lastPage) => {
      if (!lastPage.data || lastPage.data.length < 10) {
        return undefined;
      }
      return lastPage.page + 1;
    },

    initialPageParam: 1,

    enabled: enabled && Boolean(query || hashtag),
  });
}