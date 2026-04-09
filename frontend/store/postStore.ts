import { create } from 'zustand';
import { Alert } from 'react-native';
import apiService from '../services/Api.service';
import { useUserStore } from './userStore';
import type { Post, CreatePostPayload } from '../types/post';

interface PostsStoreState {
  posts:      Post[];
  loading:    boolean;
  error:      string | null;
  lastAction: 'restaurant_created' | null;

  createPost: (payload: CreatePostPayload) => Promise<Post>;
  fetchFeed:  (page?: number) => Promise<void>;
  likePost:   (postId: string) => Promise<void>;
  savePost:   (postId: string) => Promise<void>;
  removePost: (postId: string) => void;
  resetLastAction: () => void;
}

export const usePostsStore = create<PostsStoreState>((set, get) => ({
  posts:      [],
  loading:    false,
  error:      null,
  lastAction: null,

  // ── CREATE POST ─────────────────────────────────────────────────────────────
  createPost: async (payload) => {
    set({ loading: true, error: null });
    try {
      const newPost = await apiService.createPost({
        caption:       payload.caption,
        images:        payload.images,
        restaurantId:  payload.restaurantId ?? undefined,  // UUID string
        newRestaurant: payload.newRestaurant,
        location:      payload.location,
      });

      set(state => ({
        posts:   [newPost, ...state.posts],
        loading: false,
      }));

      if (payload.newRestaurant) {
        set({ lastAction: 'restaurant_created' });
        useUserStore.getState().incrementContributions();
        const name = payload.newRestaurant.name || 'địa điểm mới';
        Alert.alert(
          'Bạn là Người Tiền Phong!',
          `Cảm ơn bạn đã đóng góp quán "${name}" cho cộng đồng.\n+10 điểm Scout 🔥`,
          [{ text: 'Quá đã!' }]
        );
      }

      return newPost;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Failed to create post';
      set({ error: msg, loading: false });
      throw error;
    }
  },

  // ── FETCH FEED ─────────────────────────────────────────────────────────────
  fetchFeed: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const result = await apiService.getTrendingPosts(page);
      set(state => ({
        posts:   page === 1 ? result.data : [...state.posts, ...result.data],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch feed', loading: false });
    }
  },

  // ── LIKE (optimistic) ───────────────────────────────────────────────────────
  likePost: async (postId) => {
    const prevPosts = get().posts;
    const post      = prevPosts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.is_liked ?? false;

    set(state => ({
      posts: state.posts.map(p =>
        p.id === postId
          ? {
              ...p,
              is_liked:    !wasLiked,
              likes_count: Math.max(0, (p.likes_count ?? 0) + (wasLiked ? -1 : 1)),
            }
          : p
      ),
    }));

    try {
      if (wasLiked) await apiService.unlikePost(postId);
      else          await apiService.likePost(postId);
    } catch {
      set({ posts: prevPosts });
      Alert.alert('Lỗi', 'Không thể thực hiện hành động này');
    }
  },

  savePost: async (postId) => {
    const prevPosts = get().posts;
    const post      = prevPosts.find(p => p.id === postId);
    if (!post) return;

    const wasSaved = post.is_saved ?? false;

    // FIX: also update saves_count optimistically — previously only is_saved toggled
    set(state => ({
      posts: state.posts.map(p =>
        p.id === postId
          ? {
              ...p,
              is_saved:    !wasSaved,
              saves_count: Math.max(0, (p.saves_count ?? 0) + (wasSaved ? -1 : 1)),
            }
          : p
      ),
    }));

    try {
      if (wasSaved) await apiService.unsavePost(postId);
      else          await apiService.savePost(postId);
    } catch {
      // Revert fully on failure
      set({ posts: prevPosts });
    }
  },

  // ── REMOVE ─────────────────────────────────────────────────────────────────
  removePost: (postId) =>
    set(state => ({ posts: state.posts.filter(p => p.id !== postId) })),

  resetLastAction: () => set({ lastAction: null }),
}));