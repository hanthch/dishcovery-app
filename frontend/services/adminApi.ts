import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AdminDashboardData,
  AdminUser,
  AdminUserUpdate,
  AdminPost,
  AdminRestaurant,
  AdminRestaurantUpdate,
  AdminReport,
  AdminReportStatus,
  AdminListResponse,
} from '../types/admin';

// EXPO_PUBLIC_API_URL already includes /api/v1 (e.g. http://192.168.52.104:3000/api/v1)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.dishcovery.app/api/v1';
const API = `${BASE_URL}/admin`;

const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem('authToken');
  return { Authorization: `Bearer ${token}` };
};

export const adminApi = {

  getDashboard: async (): Promise<AdminDashboardData> => {
    const headers = await getAuthHeader();
    const { data } = await axios.get(`${API}/dashboard`, { headers });
    return data.data;
  },

  getUsers: async (params?: {
    page?:   number;
    search?: string;
    role?:   string;
  }): Promise<AdminListResponse<AdminUser>> => {
    const headers = await getAuthHeader();
    const { data } = await axios.get(`${API}/users`, { headers, params });
    return data;
  },

  getUserById: async (id: string): Promise<AdminUser> => {
    const headers = await getAuthHeader();
    const { data } = await axios.get(`${API}/users/${id}`, { headers });
    return data.data;
  },

  updateUser: async (id: string, updates: AdminUserUpdate) => {
    const headers = await getAuthHeader();
    const { data } = await axios.patch(`${API}/users/${id}`, updates, { headers });
    return data;
  },

  deleteUser: async (id: string): Promise<void> => {
    const headers = await getAuthHeader();
    await axios.delete(`${API}/users/${id}`, { headers });
  },

  getPosts: async (params?: {
    page?:    number;
    search?:  string;
    flagged?: boolean;
  }): Promise<AdminListResponse<AdminPost>> => {
    const headers = await getAuthHeader();
    const { data } = await axios.get(`${API}/posts`, { headers, params });
    return data;
  },

  deletePost: async (id: string): Promise<void> => {
    const headers = await getAuthHeader();
    await axios.delete(`${API}/posts/${id}`, { headers });
  },

  flagPost: async (id: string, is_flagged: boolean, flag_reason?: string) => {
    const headers = await getAuthHeader();
    const { data } = await axios.patch(
      `${API}/posts/${id}/flag`,
      { is_flagged, flag_reason },
      { headers }
    );
    return data;
  },

  getRestaurants: async (params?: {
    page?:   number;
    search?: string;
    status?: string;
  }): Promise<AdminListResponse<AdminRestaurant>> => {
    const headers = await getAuthHeader();
    const { data } = await axios.get(`${API}/restaurants`, { headers, params });
    return data;
  },

  updateRestaurant: async (id: string, updates: AdminRestaurantUpdate) => {
    const headers = await getAuthHeader();
    const { data } = await axios.patch(`${API}/restaurants/${id}`, updates, { headers });
    return data;
  },

  deleteRestaurant: async (id: string): Promise<void> => {
    const headers = await getAuthHeader();
    await axios.delete(`${API}/restaurants/${id}`, { headers });
  },

  getReports: async (params?: {
    page?:   number;
    status?: string;
  }): Promise<AdminListResponse<AdminReport>> => {
    const headers = await getAuthHeader();
    const { data } = await axios.get(`${API}/reports`, { headers, params });
    return data;
  },

  resolveReport: async (
    id:               string,
    status:           AdminReportStatus,
    resolution_note?: string
  ) => {
    const headers = await getAuthHeader();
    const { data } = await axios.patch(
      `${API}/reports/${id}`,
      { status, resolution_note },
      { headers }
    );
    return data;
  },

  getMe: async (): Promise<AdminUser> => {
    const headers = await getAuthHeader();
    const { data } = await axios.get(`${API}/me`, { headers });
    return data.data;
  },
};