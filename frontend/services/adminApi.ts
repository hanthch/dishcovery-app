import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AdminDashboardData,
  AdminUser,
  AdminUserUpdate,
  AdminPost,
  AdminPostUpdate,
  AdminRestaurant,
  AdminRestaurantUpdate,
  AdminReport,
  AdminReportStatus,
  AdminListResponse,
} from '../types/admin';

const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL || 'https://api.dishcovery.app/api/v1');

const API = `${BASE_URL}/admin`;

/* ── Shared auth header ─────────────────────────────────────────── */
async function authHeader(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

/* ── Central error handler ──────────────────────────────────────── */
function handleError(e: unknown, context: string): never {
  const err = e as AxiosError<{ error?: string; message?: string }>;
  const msg =
    err.response?.data?.message ||
    err.response?.data?.error   ||
    err.message                 ||
    'Unknown error';
  console.error(`[adminApi] ${context}:`, msg);
  throw new Error(msg);
}

/* ── API object ─────────────────────────────────────────────────── */
export const adminApi = {

  /* ── Dashboard ── */
  getDashboard: async (): Promise<AdminDashboardData> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${API}/dashboard`, { headers });
      return data.data as AdminDashboardData;
    } catch (e) { handleError(e, 'getDashboard'); }
  },

  /* ── Users ── */
  getUsers: async (params?: {
    page?:   number;
    search?: string;
    role?:   string;
    limit?:  number;
  }): Promise<AdminListResponse<AdminUser>> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${API}/users`, { headers, params });
      return data as AdminListResponse<AdminUser>;
    } catch (e) { handleError(e, 'getUsers'); }
  },

  getUserById: async (id: string): Promise<AdminUser> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${API}/users/${id}`, { headers });
      return data.data as AdminUser;
    } catch (e) { handleError(e, 'getUserById'); }
  },

  updateUser: async (id: string, updates: AdminUserUpdate): Promise<AdminUser> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.patch(`${API}/users/${id}`, updates, { headers });
      return data.data as AdminUser;
    } catch (e) { handleError(e, 'updateUser'); }
  },

  deleteUser: async (id: string): Promise<void> => {
    try {
      const headers = await authHeader();
      await axios.delete(`${API}/users/${id}`, { headers });
    } catch (e) { handleError(e, 'deleteUser'); }
  },

  /* ── Posts ── */
  getPosts: async (params?: {
    page?:    number;
    search?:  string;
    flagged?: boolean;
    limit?:   number;
  }): Promise<AdminListResponse<AdminPost>> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${API}/posts`, { headers, params });
      return data as AdminListResponse<AdminPost>;
    } catch (e) { handleError(e, 'getPosts'); }
  },

  deletePost: async (id: string): Promise<void> => {
    try {
      const headers = await authHeader();
      await axios.delete(`${API}/posts/${id}`, { headers });
    } catch (e) { handleError(e, 'deletePost'); }
  },

  flagPost: async (
    id: string,
    is_flagged: boolean,
    flag_reason?: string
  ): Promise<AdminPost> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.patch(
        `${API}/posts/${id}/flag`,
        { is_flagged, flag_reason: is_flagged ? (flag_reason ?? 'Admin flagged') : null },
        { headers }
      );
      return data.data as AdminPost;
    } catch (e) { handleError(e, 'flagPost'); }
  },

  /* ── Restaurants ── */
  getRestaurants: async (params?: {
    page?:   number;
    search?: string;
    status?: string;
    limit?:  number;
  }): Promise<AdminListResponse<AdminRestaurant>> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${API}/restaurants`, { headers, params });
      return data as AdminListResponse<AdminRestaurant>;
    } catch (e) { handleError(e, 'getRestaurants'); }
  },

  updateRestaurant: async (
    id: string,
    updates: AdminRestaurantUpdate
  ): Promise<AdminRestaurant> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.patch(`${API}/restaurants/${id}`, updates, { headers });
      return data.data as AdminRestaurant;
    } catch (e) { handleError(e, 'updateRestaurant'); }
  },

  deleteRestaurant: async (id: string): Promise<void> => {
    try {
      const headers = await authHeader();
      await axios.delete(`${API}/restaurants/${id}`, { headers });
    } catch (e) { handleError(e, 'deleteRestaurant'); }
  },

  /* ── Reports ── */
  getReports: async (params?: {
    page?:   number;
    status?: AdminReportStatus | string;
    limit?:  number;
  }): Promise<AdminListResponse<AdminReport>> => {
    try {
      const headers = await authHeader();
      // Default status to 'pending' if not specified — matches backend default
      const queryParams = { status: 'pending', ...params };
      const { data } = await axios.get(`${API}/reports`, { headers, params: queryParams });
      return data as AdminListResponse<AdminReport>;
    } catch (e) { handleError(e, 'getReports'); }
  },

  resolveReport: async (
    id:               string,
    status:           'resolved' | 'dismissed',
    resolution_note?: string
  ): Promise<AdminReport> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.patch(
        `${API}/reports/${id}`,
        { status, resolution_note: resolution_note ?? null },
        { headers }
      );
      return data.data as AdminReport;
    } catch (e) { handleError(e, 'resolveReport'); }
  },

  /* ── Admin profile ── */
  getMe: async (): Promise<AdminUser> => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get(`${API}/me`, { headers });
      return data.data as AdminUser;
    } catch (e) { handleError(e, 'getMe'); }
  },
};