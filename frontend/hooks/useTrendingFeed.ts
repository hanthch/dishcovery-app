import { useInfiniteQuery } from '@tanstack/react-query';
import { apiService } from '../services/Api.service';
import type { Post } from '../types/post';

export interface TrendingFeedPage {
  data: Post[];
  page: number;
}

/**
 * Hook to fetch trending posts with infinite scroll
 * Uses React Query for caching and pagination
 */
export function useTrendingFeed() {
  return useInfiniteQuery<TrendingFeedPage, Error>({
    queryKey: ['trending-feed'],
    queryFn: async ({ pageParam }): Promise<TrendingFeedPage> => {
      const page = typeof pageParam === 'number' ? pageParam : 1;

      try {
        // Call apiService to get trending posts
        const posts = await apiService.getTrendingPosts(page, 'all');

        return {
          data: posts,
          page,
        };
      } catch (error) {
        console.error('[useTrendingFeed] Error fetching posts:', error);
        // Return empty array on error instead of throwing
        return {
          data: [],
          page,
        };
      }
    },

    getNextPageParam: (lastPage) => {
      // If we got less than 10 posts, assume no more pages
      if (!lastPage.data || lastPage.data.length < 10) {
        return undefined;
      }
      return lastPage.page + 1;
    },

    initialPageParam: 1,

    // Cache settings
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
  });
}