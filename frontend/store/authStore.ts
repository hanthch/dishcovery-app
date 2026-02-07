import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState } from '@/types/auth';

// 1. Extend the interface
interface AuthStore extends AuthState {
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // 2. Add the missing properties to the initial state
      user: null,
      token: null,
      loading: false,
      isAuthenticated: false, // Default to false
      error: null,           // Default to null

      // 3. Update actions to handle the new state
      setAuth: (user, token) => 
        set({ 
          user, 
          token, 
          isAuthenticated: true, 
          loading: false, 
          error: null 
        }),
      
      clearAuth: () => 
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          error: null 
        }),
      
      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error, loading: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);