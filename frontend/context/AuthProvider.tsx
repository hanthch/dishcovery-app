import React, { useEffect, useReducer, useMemo } from 'react';
import { AuthContext, AuthContextType } from './AuthContext';
import {apiService} from '../services/Api.service';
import { User, SignupRequest } from '../types/auth';

type AuthState = {
  isLoading: boolean;
  isSignout: boolean;
  userToken: string | null;
  user: User | null;
};

type AuthAction =
  | { type: 'RESTORE_TOKEN'; token: string | null; user: User | null }
  | { type: 'SIGN_IN'; token: string; user: User }
  | { type: 'SIGN_UP'; token: string; user: User }
  | { type: 'SIGN_OUT' };

const initialState: AuthState = {
  isLoading: true,
  isSignout: false,
  userToken: null,
  user: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return { 
        ...state, 
        userToken: action.token, 
        user: action.user, 
        isLoading: false 
      };
    case 'SIGN_IN':
    case 'SIGN_UP':
      return { 
        ...state, 
        isSignout: false, 
        userToken: action.token, 
        user: action.user 
      };
    case 'SIGN_OUT':
      return { 
        ...state, 
        isSignout: true, 
        userToken: null, 
        user: null 
      };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await apiService.getToken();
        const user = await apiService.getStoredUser();
        dispatch({ type: 'RESTORE_TOKEN', token, user });
      } catch (e) {
        console.error('Error restoring token:', e);
        dispatch({ type: 'RESTORE_TOKEN', token: null, user: null });
      }
    };
    bootstrapAsync();
  }, []);

  const authContextValue: AuthContextType = useMemo(() => ({
    isLoading: state.isLoading,
    isSignout: state.isSignout,
    userToken: state.userToken,
    user: state.user,

    signIn: async (email: string, password: string) => {
      try {
        const data = await apiService.login(email, password);
        dispatch({ type: 'SIGN_IN', token: data.token, user: data.user });
        return { success: true };
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Login failed';
        return { success: false, error: errorMessage };
      }
    },

    signUp: async (userData: SignupRequest) => {
      try {
        const data = await apiService.signup(userData);
        dispatch({
          type: 'SIGN_UP',
          token: data.token,
          user: data.user,
        });
        return { success: true };
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error || 'Signup failed';
        return { success: false, error: errorMessage };
      }
    },

    signOut: async () => {
      try {
        await apiService.logout();
        dispatch({ type: 'SIGN_OUT' });
      } catch (error) {
        console.error('Sign out error:', error);
        // Still clear local state even if API call fails
        dispatch({ type: 'SIGN_OUT' });
      }
    },

    forgotPassword: async (email: string) => {
      try {
        await apiService.requestPasswordReset(email);
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.response?.data?.error || 'Failed to send verification code' 
        };
      }
    },

    verifyCode: async (email: string, code: string) => {
      try {
        await apiService.verifyResetCode(email, code);
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.response?.data?.error || 'Invalid or expired code' 
        };
      }
    },

   
    resetPassword: async (email: string, code: string, password: string) => {
      try {
        await apiService.confirmResetPassword(email, code, password);
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.response?.data?.error || 'Failed to reset password' 
        };
      }
    },

   
    restoreToken: async () => {
      try {
        const token = await apiService.getToken();
        const user = await apiService.getStoredUser();
        dispatch({ type: 'RESTORE_TOKEN', token, user });
      } catch (error) {
        console.error('Restore token error:', error);
        dispatch({ type: 'RESTORE_TOKEN', token: null, user: null });
      }
    },
  }), [state]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};