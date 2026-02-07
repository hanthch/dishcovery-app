import { create } from 'zustand';
import { Alert } from 'react-native';
import apiService from '../services/Api.service';
import { useUserStore } from './userStore';
import { Post } from '../types/post';

interface CreatePostPayload {
  caption?: string;
  images?: string[];
  restaurantId?: string | number | null;
  newRestaurant?: any;
  location?: any;
}

interface PostsStoreState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  lastAction: null | 'restaurant_created';
  
  // Actions
  createPost: (payload: CreatePostPayload) => Promise<Post>;
  fetchFeed: (page?: number) => Promise<void>;
  likePost: (postId: string | number) => Promise<void>;
  savePost: (postId: string | number) => Promise<void>;
  removePost: (postId: string | number) => void;
}

export const usePostsStore = create<PostsStoreState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,
  lastAction: null,

  /* =========================
      CREATE POST
  ========================= */
  createPost: async (payload) => {
    set({ loading: true, error: null });
    try {
      const newPost = await apiService.createPost({
        // FIX: Change '|| null' to '|| undefined' to satisfy TypeScript strict types
        caption: payload.caption || undefined,
        images: payload.images || undefined, 
        restaurantId: payload.restaurantId ? Number(payload.restaurantId) : undefined,
        
        // This includes our Step B data (cuisine, price_range, openingHours)
        newRestaurant: payload.newRestaurant || undefined,
        location: payload.location || undefined,
      });

      set((state) => ({
        posts: [newPost, ...state.posts],
        loading: false,
      }));

      // Contribution Reward Logic
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

  /* =========================
      FETCH FEED
  ========================= */
  fetchFeed: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const data = await apiService.getTrendingPosts(page);
      set((state) => ({
        posts: page === 1 ? data : [...state.posts, ...data],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch feed', loading: false });
    }
  },

  /* =========================
      LIKE (Optimistic & Fix)
  ========================= */
  likePost: async (postId) => {
    const previousPosts = get().posts;

    set((state) => ({
      posts: state.posts.map((post) =>
        String(post.id) === String(postId)
          ? {
              ...post,
              is_liked: !post.is_liked,
              likes_count: post.is_liked ? Math.max(0, (post.likes_count || 0) - 1) : (post.likes_count || 0) + 1,
            }
          : post
      ),
    }));

    try {
      const post = previousPosts.find(p => String(p.id) === String(postId));
      if (post?.is_liked) {
        await apiService.unlikePost(String(postId));
      } else {
        await apiService.likePost(String(postId));
      }
    } catch (error) {
      set({ posts: previousPosts });
      Alert.alert('Lỗi', 'Không thể thực hiện hành động này');
    }
  },

  /* =========================
      SAVE (Optimistic & Fix)
  ========================= */
  savePost: async (postId) => {
    const previousPosts = get().posts;

    set((state) => ({
      posts: state.posts.map((post) =>
        String(post.id) === String(postId) 
          ? { ...post, is_saved: !post.is_saved } 
          : post
      ),
    }));

    try {
      const post = previousPosts.find(p => String(p.id) === String(postId));
      if (post?.is_saved) {
        await apiService.unsavePost(String(postId));
      } else {
        await apiService.savePost(String(postId));
      }
    } catch (error) {
      set({ posts: previousPosts });
    }
  },

  removePost: (postId) => {
    set((state) => ({
      posts: state.posts.filter((post) => String(post.id) !== String(postId)),
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