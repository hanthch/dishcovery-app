import { create } from 'zustand';
import { Alert } from 'react-native';
import apiService from '../services/Api.service';
import { useUserStore } from './userStore';
import { Post } from '../types/post';

interface CreatePostPayload {
  caption?: string;
  images?: string[];
  restaurantId?: string | null; 
  newRestaurant?: any;
  location?: any;
}

type FeedFilter = 'all' | 'newest' | 'popular';

interface PostsStoreState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  lastAction: null | 'restaurant_created';

    // ✅ feed state
  page: number;
  hasMore: boolean;
  filter: FeedFilter;

  setFilter: (filter: FeedFilter) => Promise<void>;
  fetchFeed: (opts?: { page?: number; filter?: FeedFilter; append?: boolean }) => Promise<void>;

  createPost: (payload: CreatePostPayload) => Promise<Post>;
  likePost: (postId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;
  removePost: (postId: string) => void;
}

export const usePostsStore = create<PostsStoreState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,
  lastAction: null,

  page: 1,
  hasMore: true,
  filter: 'all',

  setFilter: async (filter) => {
    set({ filter, page: 1, hasMore: true, posts: [] });
    await get().fetchFeed({ page: 1, filter, append: false });
  },

  fetchFeed: async (opts) => {
    const page = opts?.page ?? 1;
    const filter = opts?.filter ?? get().filter;
    const append = opts?.append ?? (page > 1);

    set({ loading: true, error: null });

    try {
      const result = await apiService.getTrendingPosts(page, filter);

      set((state) => ({
        posts: append ? [...state.posts, ...result.data] : result.data,
        page: result.page ?? page,
        hasMore: result.hasMore ?? false,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch feed', loading: false });
    }
  },

  createPost: async (payload) => {
    set({ loading: true, error: null });
    try {
      const newPost = await apiService.createPost({
        caption: payload.caption || undefined,
        images: payload.images || undefined,
        restaurantId: payload.restaurantId ?? undefined,

        newRestaurant: payload.newRestaurant || undefined,
        location: payload.location || undefined,
      });

      set((state) => ({
        posts: [newPost, ...state.posts],
        loading: false,
      }));

      if (payload.newRestaurant || payload.location) {
        set({ lastAction: 'restaurant_created' });
        useUserStore.getState().incrementContributions();
        const name = payload.newRestaurant?.name || payload.location?.name || 'địa điểm mới';
        triggerContributorReward(name);
      }

      return newPost;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create post', loading: false });
      throw error;
    }
  },

  likePost: async (postId) => {
    const previousPosts = get().posts;

    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              is_liked: !post.is_liked,
              likes_count: post.is_liked
                ? Math.max(0, (post.likes_count || 0) - 1)
                : (post.likes_count || 0) + 1,
            }
          : post
      ),
    }));

    try {
      const post = previousPosts.find((p) => p.id === postId);
      let res: { liked: boolean; likes_count: number };
      if (post?.is_liked)
        res = await apiService.unlikePost(postId);
      else
        res = await apiService.likePost(postId);

      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, is_liked: res.liked, likes_count: res.likes_count }
            : p
        ),
      }));
    } catch {
      set({ posts: previousPosts });
      Alert.alert('Lỗi', 'Không thể thực hiện hành động này');
    }
  },

  savePost: async (postId) => {
    const previousPosts = get().posts;

    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId ? { ...post, is_saved: !post.is_saved } : post
      ),
    }));

    try {
      const post = previousPosts.find((p) => p.id === postId);
      if (post?.is_saved) {
        await apiService.unsavePost(postId);
      } else {
        await apiService.savePost(postId);
      }
    } catch {
      set({ posts: previousPosts });
    }
  },

  removePost: (postId) => {
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== postId),
    }));
  },
}));

const triggerContributorReward = (name: string) => {
  Alert.alert(
    '🎉 Bạn là Người Tiền Phong!',
    `Cảm ơn bạn đã đóng góp quán "${name}" cho cộng đồng.\n+10 điểm Scout 🔥`,
    [{ text: 'Quá đã!' }]
  );
};