import { create } from 'zustand';
import { User, Post } from '../types';

export interface UserStore {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  savedPosts: Post[];
  followers: User[];
  following: User[];

  setUser: (user: User | null) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setSavedPosts: (posts: Post[]) => void;
  addSavedPost: (post: Post) => void;
  removeSavedPost: (postId: string) => void;
  setFollowers: (followers: User[]) => void;
  setFollowing: (following: User[]) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  addFollower: (user: User) => void;
  removeFollower: (userId: string) => void;

  logout: () => void;
}

const initialState = {
  user: null,
  isLoggedIn: false,
  isLoading: false,
  savedPosts: [],
  followers: [],
  following: [],
};

export const useUserStore = create<UserStore>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setIsLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  setSavedPosts: (posts) => set({ savedPosts: posts }),
  addSavedPost: (post) =>
    set((state) => {
      const exists = state.savedPosts.find((p) => p.id === post.id);
      if (exists) return state;
      return { savedPosts: [...state.savedPosts, post] };
    }),

  removeSavedPost: (postId) =>
    set((state) => ({
      savedPosts: state.savedPosts.filter((post) => post.id !== postId),
    })),

  setFollowers: (followers) => set({ followers }),
  setFollowing: (following) => set({ following }),

  updateUserProfile: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  addFollower: (user) =>
    set((state) => ({
      followers: [...state.followers, user],
      user: state.user ? { ...state.user, followersCount: state.user.followersCount + 1 } : null,
    })),

  removeFollower: (userId) =>
    set((state) => ({
      followers: state.followers.filter((f) => f.id !== userId),
      user: state.user ? { ...state.user, followersCount: Math.max(0, state.user.followersCount - 1) } : null,
    })),

  logout: () => set(initialState),
}));
