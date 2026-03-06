// ─── store/postStore.ts ───────────────────────────────────────────────────────
import { create } from 'zustand';
import { Alert } from 'react-native';
import apiService from '../services/Api.service';
import { useUserStore } from './userStore';
import { Post } from '../types/post';

interface CreatePostPayload {
  caption?: string;
  images?: string[];
  restaurantId?: string | null;  // FIX: string UUID only — posts.js uses it directly as FK
  newRestaurant?: any;
  location?: any;
}

type FeedFilter = 'newest' | 'popular';

interface PostsStoreState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  lastAction: null | 'restaurant_created';

    // ✅ feed state
  page: number;
  hasMore: boolean;
  filter: FeedFilter;

  // actions
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
  filter: 'newest',

  // ✅ switch filter cleanly
  setFilter: async (filter) => {
    set({ filter, page: 1, hasMore: true, posts: [] });
    await get().fetchFeed({ page: 1, filter, append: false });
  },

  // ✅ fetch feed with pagination + filter
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

  // ── CREATE POST ─────────────────────────────────────────────────────────
  createPost: async (payload) => {
    set({ loading: true, error: null });
    try {
      const newPost = await apiService.createPost({
        caption: payload.caption || undefined,
        images: payload.images || undefined,

        // FIX: was Number(payload.restaurantId) — broke UUID string FK
        // posts.js destructures restaurantId from req.body and uses it
        // directly as restaurant_id (UUID string) in Supabase insert
        restaurantId: payload.restaurantId ?? undefined,

        newRestaurant: payload.newRestaurant || undefined,
        location: payload.location || undefined,
      });

      set((state) => ({
        posts: [newPost, ...state.posts],
        loading: false,
      }));

      // Contribution reward when user added a new place to DB
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

  // ── LIKE (optimistic) ───────────────────────────────────────────────────
  likePost: async (postId) => {
    const previousPosts = get().posts;

    // Toggle optimistically
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
      if (post?.is_liked)
        // Was liked → unlike: DELETE /posts/:id/like → { liked: false, likes_count }
        await apiService.unlikePost(postId);
      else
        // Was not liked → like: POST /posts/:id/like → { liked: true, likes_count }
        await apiService.likePost(postId);
    } catch {
      set({ posts: previousPosts });
      Alert.alert('Lỗi', 'Không thể thực hiện hành động này');
    }
  },

  // ── SAVE (optimistic) ───────────────────────────────────────────────────
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
        // Was saved → unsave: DELETE /posts/:id/save → { saved: false }
        await apiService.unsavePost(postId);
      } else {
        // Was not saved → save: POST /posts/:id/save → { saved: true }
        await apiService.savePost(postId);
      }
    } catch {
      set({ posts: previousPosts });
    }
  },

  // ── REMOVE ──────────────────────────────────────────────────────────────
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
