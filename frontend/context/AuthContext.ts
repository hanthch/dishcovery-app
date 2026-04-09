import React from 'react';

export interface AuthContextType {
  isLoading: boolean;
  isSignout: boolean;
  userToken: string | null;
  user: any;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (userData: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, code: string, password: string) => Promise<{ success: boolean; error?: string }>;
  restoreToken: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType>({
  isLoading: true,
  isSignout: false,
  userToken: null,
  user: null,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  forgotPassword: async () => ({ success: false }),
  verifyCode: async () => ({ success: false }),
  resetPassword: async () => ({ success: false }),
  restoreToken: async () => {},
});
