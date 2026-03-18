import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState } from '@/types/auth';

interface AuthStore extends AuthState {
  setAuth:    (user: User, token: string) => void;
  clearAuth:  () => void;
  setLoading: (loading: boolean) => void;
  setError:   (error: string | null) => void;
  // Derived helper — avoids scattering user.role === 'admin' everywhere
  isAdmin:    () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      loading:         false,
      isAuthenticated: false,
      error:           null,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true, loading: false, error: null }),

      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false, error: null }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error, loading: false }),

      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name:    'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);