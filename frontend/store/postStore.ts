import { create } from 'zustand';
import { Alert } from 'react-native';
import apiService from '../services/api';
import { useUserStore } from './userStore';

type CreatePostPayload = {
  caption?: string;
  images?: string[];

  restaurantId?: number;
  newRestaurant?: any;

  location?: any;
};

type PostsState = {
  lastAction: null | 'restaurant_created';

  publishPost: (payload: CreatePostPayload) => Promise<void>;

  likePost: (postId: number) => Promise<void>;
  savePost: (postId: number) => Promise<void>;
};

export const usePostsStore = create<PostsState>((set) => ({
  lastAction: null,

  /* =========================
     CREATE POST
  ========================= */
  publishPost: async (payload) => {
    const res = await apiService.createPost({
      caption: payload.caption || null,
      images: payload.images || null,
      restaurantId: payload.restaurantId || null,
      newRestaurant: payload.newRestaurant || null,
      location: payload.location || null,
    });

    // 🎉 CONTRIBUTOR REWARD
    if (payload.newRestaurant && res?.data) {
      set({ lastAction: 'restaurant_created' });

      useUserStore
        .getState()
        .incrementContributions();

      triggerContributorReward(payload.newRestaurant.name);
    }
  },

  /* =========================
     LIKE
  ========================= */
  likePost: async (postId) => {
    await apiService.likePost(postId);
  },

  /* =========================
     SAVE
  ========================= */
  savePost: async (postId) => {
    await apiService.savePost(postId);
  },
}));

/* =========================
   REWARD UI
========================= */
const triggerContributorReward = (name: string) => {
  Alert.alert(
    '🎉 Bạn là Người Tiền Phong!',
    `Cảm ơn bạn đã đóng góp quán "${name}" cho cộng đồng.\n+10 điểm Scout 🔥`,
    [{ text: 'Quá đã!' }]
  );
};
