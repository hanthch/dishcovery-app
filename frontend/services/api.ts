import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your machine's local IP for physical device testing
const BASE_URL = 'http://192.168.1.XX:3000/api/v1'; 

/**
 * 1. THE ENGINE (apiClient)
 * This is the raw Axios instance. Do not call .forgotPassword() on this.
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor to automatically attach JWT tokens
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 2. THE BRAIN (apiService / dataService)
 * This is where your custom methods live. Call these in your components.
 */
export const apiService = {
  /* --- AUTHENTICATION --- */
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data.data;
  },

  signup: async (userData: any) => {
    const res = await apiClient.post('/auth/register', userData);
    return res.data.data;
  },

  // Fixed: Property now exists on the service object
  forgotPassword: (email: string) => 
    apiClient.post('/auth/forgot-password', { email }),

  verifyCode: (email: string, code: string) => 
    apiClient.post('/auth/verify-code', { email, code }),

  resetPassword: (email: string, code: string, pass: string) => 
    apiClient.post('/auth/reset-password', { email, code, password: pass }),

  /* --- POSTS & SOCIAL (The Database Loop) --- */
  getTrending: async (page = 1, filter = 'all') => {
    const res = await apiClient.get('/posts/trending', { 
      params: { page, filter } 
    });
    return res.data;
  },

  // Logic B: Sends location metadata to backend to "Seed" new restaurants
  createPost: async (payload: {
    caption: string;
    image_url: string;
    restaurantData: {
      name: string;
      address: string;
      googleMapsUrl: string;
      landmarkNotes: string; // The Street Wisdom
    };
    visibility: string;
  }) => {
    const res = await apiClient.post('/posts', payload);
    return res.data;
  },

  likePost: (postId: string) => apiClient.post(`/posts/${postId}/like`),

  /* --- RESTAURANTS & DISCOVERY --- */
  getTopTen: async () => {
    const res = await apiClient.get('/restaurants/top10');
    return res.data.data;
  },

  searchInternal: async (query: string) => {
    const res = await apiClient.get('/restaurants/search', { params: { q: query } });
    return res.data.data;
  },

  getRestaurantDetail: (id: string) => 
    apiClient.get(`/restaurants/${id}`).then(res => res.data.data),
  
  /* --- MAPS HELPER --- */
  getMapLink: (address: string) => 
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
};

/**
 * 3. BRIDGING
 * Export as both names to satisfy imports in trending.tsx and postsStore.ts
 */
export const dataService = apiService;
export default apiService;