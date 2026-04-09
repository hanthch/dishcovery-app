// useAuth.ts — auth hook, aligned with backend /auth/* endpoints
// All API calls delegate to apiService which handles token storage.
// Field mapping: signup payload concatenates firstName+lastName → full_name
// before sending, matching the backend's /register expectation.

import { apiService } from '../services/Api.service';
import { useUserStore } from '../store/userStore';

export function useAuth() {
  const { setUser, logout: storeLogout } = useUserStore();

  /* ── SIGN IN ─────────────────────────────────────────────── */
  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await apiService.login(email, password);
      setUser(user);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error   ||
        error?.message                 ||
        'Sign in failed. Please check your credentials.';
      return { success: false, error: message };
    }
  };

  /* ── SIGN UP ─────────────────────────────────────────────── */
  const signUp = async (payload: {
    username:     string;
    email:        string;
    password:     string;
    firstName?:   string;
    lastName?:    string;
    birthDate?:   string;
    phoneNumber?: string;
  }) => {
    try {
      // Backend /register accepts: email, password, username, full_name.
      // Concatenate split name fields here; backend ignores extra keys.
      const { user } = await apiService.signup({
        email:     payload.email,
        password:  payload.password,
        username:  payload.username,
        full_name: [payload.firstName, payload.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || payload.username,
      });
      setUser(user);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error   ||
        error?.message                 ||
        'Sign up failed. Please try again.';
      return { success: false, error: message };
    }
  };

  /* ── SIGN OUT ────────────────────────────────────────────── */
  const signOut = async () => {
    try {
      await storeLogout(); // handles AsyncStorage cleanup + apiService.logout()
    } catch (e) {
      console.error('[useAuth] signOut error:', e);
    }
  };

  /* ── FORGOT PASSWORD ─────────────────────────────────────── */
  const forgotPassword = async (email: string) => {
    try {
      await apiService.requestPasswordReset(email);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error   ||
        error?.message                 ||
        'Failed to send reset code.';
      return { success: false, error: message };
    }
  };

  /* ── VERIFY CODE ─────────────────────────────────────────── */
  const verifyCode = async (email: string, code: string) => {
    try {
      await apiService.verifyResetCode(email, code);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error   ||
        error?.message                 ||
        'Invalid or expired code.';
      return { success: false, error: message };
    }
  };

  /* ── RESET PASSWORD ──────────────────────────────────────── */
  const resetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      await apiService.confirmResetPassword(email, code, newPassword);
      return { success: true };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error   ||
        error?.message                 ||
        'Failed to reset password.';
      return { success: false, error: message };
    }
  };

  return { signIn, signUp, signOut, forgotPassword, verifyCode, resetPassword };
}