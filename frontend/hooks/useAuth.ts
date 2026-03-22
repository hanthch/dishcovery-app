import { apiService } from '../services/Api.service';
import { useUserStore } from '../store/userStore';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// ── Real credentials ───────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID_IOS     = '326135021624-o5ou5pliff5e8tvlvspo6jrune760vgg.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = '326135021624-2uldrqbrcr69gp9uevuagdr63t42mghk.apps.googleusercontent.com';
const FACEBOOK_APP_ID          = '1213814033940168';
// ──────────────────────────────────────────────────────────────────────────

export function useAuth() {
  const { setUser, logout: storeLogout } = useUserStore();

  // ── Email / Password ──────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await apiService.login(email, password);
      setUser(user);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Sign in failed. Please check your credentials.';
      return { success: false, error: message };
    }
  };

  const signUp = async (payload: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    try {
      await apiService.signup(payload);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Sign up failed. Please try again.';
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    await storeLogout();
  };

  const forgotPassword = async (email: string) => {
    try {
      await apiService.requestPasswordReset(email);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to send reset code.';
      return { success: false, error: message };
    }
  };

  const verifyCode = async (email: string, code: string) => {
    try {
      await apiService.verifyResetCode(email, code);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Invalid or expired code.';
      return { success: false, error: message };
    }
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      await apiService.confirmResetPassword(email, code, newPassword);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to reset password.';
      return { success: false, error: message };
    }
  };
 const completeSocialLogin = async (
    provider: 'google' | 'facebook' | 'apple',
    tokens: { access_token?: string; identity_token?: string }
  ) => {
    try {
      const { user } = await apiService.socialLogin(provider, tokens);
      setUser(user);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        `${provider} sign-in failed. Please try again.`;
      return { success: false, error: message };
    }
  };

  return {
    signIn,
    signUp,
    signOut,
    forgotPassword,
    verifyCode,
    resetPassword,
    completeSocialLogin,
    GOOGLE_CLIENT_ID_IOS,
    GOOGLE_CLIENT_ID_ANDROID,
    FACEBOOK_APP_ID,
  };
}