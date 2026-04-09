import { create } from 'zustand';
import { User } from '../types/auth';
import { Post } from '../types/post';
import apiService from '../services/Api.service';

export interface UserStore {
  user:       User | null;
  isLoggedIn: boolean;
  isLoading:  boolean;
  savedPosts: Post[];
  followers:  User[];
  following:  User[];
  error:      string | null;

  // Auth
  setUser:           (user: User | null) => void;
  setIsLoggedIn:     (v: boolean) => void;
  setIsLoading:      (v: boolean) => void;
  fetchCurrentUser:  () => Promise<void>;
  logout:            () => Promise<void>;

  // Profile
  updateUserProfile:      (updates: Partial<User>) => void;
  incrementContributions: () => void;

  // Saved posts
  setSavedPosts:   (posts: Post[]) => void;
  addSavedPost:    (post: Post) => void;
  removeSavedPost: (postId: string) => void;

  // Social
  setFollowers:   (users: User[]) => void;
  setFollowing:   (users: User[]) => void;
  addFollower:    (user: User) => void;
  removeFollower: (userId: string) => void;
}

const INITIAL: Pick<UserStore,
  'user' | 'isLoggedIn' | 'isLoading' | 'savedPosts' | 'followers' | 'following' | 'error'
> = {
  user:       null,
  isLoggedIn: false,
  isLoading:  false,
  savedPosts: [],
  followers:  [],
  following:  [],
  error:      null,
};

export const useUserStore = create<UserStore>((set, get) => ({
  ...INITIAL,

  /* ── AUTH ───────────────────────────────────────────────── */
  setUser: (user) =>
    set({ user, isLoggedIn: !!user }),

  setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),

  setIsLoading: (isLoading) => set({ isLoading }),

  fetchCurrentUser: async () => {
     await apiService.ready();

    const token = await apiService.getToken();
    if (!token) {
      set({ isLoggedIn: false, isLoading: false });
      return;
    }

    if (get().isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const user = await apiService.getCurrentUser();
      set({ user, isLoggedIn: true, isLoading: false });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        set({ ...INITIAL });
      } else {
        set({
          error:     e?.message || 'Failed to fetch user',
          isLoading: false,
        });
      }
    }
  },

  logout: async () => {
    try {
      // apiService.logout() posts to /auth/logout AND clears AsyncStorage
      // internally — no need to call multiRemove here separately.
      await apiService.logout();
    } catch (e) {
      console.error('[userStore] logout error:', e);
    } finally {
      set({ ...INITIAL });
    }
  },

  /* ── PROFILE ────────────────────────────────────────────── */
  updateUserProfile: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  incrementContributions: () =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            contributions: (state.user.contributions ?? 0) + 1,
            scout_points:  (state.user.scout_points  ?? 0) + 10,
          }
        : null,
    })),

  /* ── SAVED POSTS ────────────────────────────────────────── */
  setSavedPosts: (posts) => set({ savedPosts: posts }),

  addSavedPost: (post) =>
    set((state) => {
      const already = state.savedPosts.some(p => p.id === post.id);
      return already ? state : { savedPosts: [...state.savedPosts, post] };
    }),

  removeSavedPost: (postId) =>
    set((state) => ({
      savedPosts: state.savedPosts.filter(p => String(p.id) !== String(postId)),
    })),

  /* ── SOCIAL ─────────────────────────────────────────────── */
  setFollowers: (followers) => set({ followers }),
  setFollowing: (following) => set({ following }),

  addFollower: (user) =>
    set((state) => ({
      followers: [...state.followers, user],
      user: state.user
        ? { ...state.user, followers_count: (state.user.followers_count ?? 0) + 1 }
        : null,
    })),

  removeFollower: (userId) =>
    set((state) => ({
      followers: state.followers.filter(f => f.id !== userId),
      user: state.user
        ? {
            ...state.user,
            followers_count: Math.max(0, (state.user.followers_count ?? 0) - 1),
          }
        : null,
    })),
}));