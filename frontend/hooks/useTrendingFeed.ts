import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Post } from '../types/post';

type TrendingFeedKey = 'all';

export function useTrendingFeed(feedKey: TrendingFeedKey = 'all') {
  return useInfiniteQuery<
    { data: Post[]; page: number },
    Error
  >(
    ['trending-feed', feedKey],
    async ({ pageParam = 1 }) => {
      const res = await api.get('/posts/trending', {
        params: {
          page: pageParam,
          limit: 10,
        },
      });

      return res.data;
    },
    {
      getNextPageParam: (lastPage) => {
        // If backend returns less than limit, no more pages
        if (!lastPage.data || lastPage.data.length < 10) {
          return undefined;
        }
        return lastPage.page + 1;
      },

      staleTime: 1000 * 30, // 30s freshness
      refetchOnWindowFocus: false,
    }
  );
}
