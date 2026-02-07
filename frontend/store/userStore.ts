import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/auth';
import { Post } from '../types/post';
import apiService from '../services/Api.service';

export interface UserStore {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  savedPosts: Post[];
  followers: User[];
  following: User[];
  error: string | null;

  // Authentication & Data Actions
  setUser: (user: User | null) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  fetchCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;

  // Social & Contribution Actions
  incrementContributions: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  
  // Saved Posts Logic
  setSavedPosts: (posts: Post[]) => void;
  addSavedPost: (post: Post) => void;
  removeSavedPost: (postId: string | number) => void;

  // Follower Logic
  setFollowers: (followers: User[]) => void;
  setFollowing: (following: User[]) => void;
  addFollower: (user: User) => void;
  removeFollower: (userId: string | number) => void;
}

const initialState = {
  user: null,
  isLoggedIn: false,
  isLoading: false,
  savedPosts: [],
  followers: [],
  following: [],
  error: null,
};

export const useUserStore = create<UserStore>((set, get) => ({
  ...initialState,

  /* ---------- AUTHENTICATION ---------- */
  setUser: (user) => set({ 
    user, 
    isLoggedIn: !!user 
  }),

  setIsLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  fetchCurrentUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await apiService.getCurrentUser();
      set({ user, isLoggedIn: true, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch user', isLoading: false });
    }
  },

  logout: async () => {
    try {
      // Clear persistence if you use it
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      await apiService.logout();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      set(initialState);
    }
  },

  /* ---------- CONTRIBUTIONS & REWARDS ---------- */
  /**
   * Updates local UI stats immediately when a new place is added
   */
  incrementContributions: () => {
    set((state) => ({
      user: state.user 
        ? { 
            ...state.user, 
            contributions: (state.user.contributions || 0) + 1,
            scout_points: (state.user.scout_points || 0) + 10 
          } 
        : null,
    }));
  },

  updateUserProfile: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  /* ---------- SAVED CONTENT ---------- */
  setSavedPosts: (posts) => set({ savedPosts: posts }),

  addSavedPost: (post) =>
    set((state) => {
      const exists = state.savedPosts.find((p) => String(p.id) === String(post.id));
      if (exists) return state;
      return { savedPosts: [...state.savedPosts, post] };
    }),

  removeSavedPost: (postId) =>
    set((state) => ({
      savedPosts: state.savedPosts.filter((post) => String(post.id) !== String(postId)),
    })),

  /* ---------- SOCIAL LOGIC ---------- */
  setFollowers: (followers) => set({ followers }),
  
  setFollowing: (following) => set({ following }),

  addFollower: (user) =>
    set((state) => ({
      followers: [...state.followers, user],
      user: state.user ? { 
        ...state.user, 
        followers_count: (state.user.followers_count || 0) + 1 
      } : null,
    })),

  removeFollower: (userId) =>
    set((state) => ({
      followers: state.followers.filter((f) => String(f.id) !== String(userId)),
      user: state.user ? { 
        ...state.user, 
        followers_count: Math.max(0, (state.user.followers_count || 0) - 1) 
      } : null,
    })),
}));
