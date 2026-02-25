import { apiService } from '../../services/Api.service';
import { useUserStore } from '../../store/userStore';

export function useAuth() {
  const { setUser, logout: storeLogout } = useUserStore();

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
  }) => {
    try {
      const { user } = await apiService.signup(payload);
      setUser(user);
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
    await storeLogout(); // handles AsyncStorage cleanup + apiService.logout()
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

  return { signIn, signUp, signOut, forgotPassword, verifyCode, resetPassword };
}