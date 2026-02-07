import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Restaurant } from '../types/restaurant';
import { SearchResult, PaginatedPostResponse, PostSearchParams, PlaceSearchResult } from '../types/search';
import { User, LoginResponse, SignupRequest } from '../types/auth';
import { Post, Comment } from '../types/post';

declare var __DEV__: boolean;

const API_BASE_URL = __DEV__
  ? 'http://172.16.4.176:3000/api/v1'  
  : 'https://api.dishcovery.app/api/v1';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'userData';

// Create axios instance with better timeout and retry config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    } catch (error) {
      console.error('[API] Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ✓ ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      console.error(`[API] ✗ ${error.config?.url} - ${error.response.status}`, error.response.data);
      
      if (error.response.status === 401) {
        // Unauthorized - clear tokens
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('[API] ✗ Network Error - No response received:', error.message);
      console.error('[API] Check if backend is running at:', API_BASE_URL);
    } else {
      // Error setting up request
      console.error('[API] ✗ Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

class ApiService {
  // ---------- AUTH ----------

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user, token } = res.data.data;

      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      return { user, token };
    } catch (error) {
      console.error('[ApiService] Login error:', error);
      throw error;
    }
  }

  async signup(payload: SignupRequest): Promise<LoginResponse> {
    try {
      const { data } = await apiClient.post('/auth/register', payload);
      const { user, token } = data.data;

      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      return { user, token };
    } catch (error) {
      console.error('[ApiService] Signup error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('[ApiService] Logout error:', error);
    } finally {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      console.error('[ApiService] Password reset request error:', error);
      throw error;
    }
  }

  async verifyResetCode(email: string, code: string): Promise<void> {
    try {
      await apiClient.post('/auth/verify-code', { email, code });
    } catch (error) {
      console.error('[ApiService] Verify code error:', error);
      throw error;
    }
  }

  async confirmResetPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', { email, code, password: newPassword });
    } catch (error) {
      console.error('[ApiService] Reset password error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const { data } = await apiClient.get('/auth/me');
      return data.data;
    } catch (error) {
      console.error('[ApiService] Get current user error:', error);
      throw error;
    }
  }

  // ---------- RESTAURANTS & LOCATIONS ----------

  async getRestaurants(filters?: {
    type?: string;
    price?: string;
    cuisine?: string;
    rating?: number;
    page?: number;
    limit?: number;
  }): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants', { params: filters });
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get restaurants error:', error);
      return []; 
    }
  }

  async getRestaurantById(id: string | number): Promise<Restaurant> {
    try {
      const { data } = await apiClient.get(`/restaurants/${id}`);
      return data.data;
    } catch (error) {
      console.error('[ApiService] Get restaurant by ID error:', error);
      throw error;
    }
  }

  async getSavedRestaurants(): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/users/me/saved-restaurants');
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get saved restaurants error:', error);
      return [];
    }
  }

  async getTopTen(): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants/top10');
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get top 10 error:', error);
      return [];
    }
  }

  async getRestaurantsByCategory(category: string, page = 1, limit = 20): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get(`/restaurants/category/${category}`, {
        params: { page, limit }
      });
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get restaurants by category error:', error);
      return [];
    }
  }

  async getRestaurantLandmarkNotes(id: string | number): Promise<any[]> {
    try {
      const { data } = await apiClient.get(`/restaurants/${id}/landmark-notes`);
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get landmark notes error:', error);
      return [];
    }
  }

  async saveRestaurant(id: string | number): Promise<void> {
    try {
      await apiClient.post(`/restaurants/${id}/save`);
    } catch (error) {
      console.error('[ApiService] Save restaurant error:', error);
      throw error;
    }
  }

  async unsaveRestaurant(id: string | number): Promise<void> {
    try {
      await apiClient.post(`/restaurants/${id}/unsave`);
    } catch (error) {
      console.error('[ApiService] Unsave restaurant error:', error);
      throw error;
    }
  }

  async isRestaurantSaved(id: string | number): Promise<boolean> {
    try {
      const { data } = await apiClient.get(`/restaurants/${id}/is-saved`);
      return data.saved || false;
    } catch (error) {
      console.error('[ApiService] Check if restaurant saved error:', error);
      return false;
    }
  }

  async searchRestaurants(query: string, limit = 20): Promise<Restaurant[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/restaurants/search', { 
        params: { q: query, limit } 
      });
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Search restaurants error:', error);
      return [];
    }
  }

  async getFoodMarkets(): Promise<any[]> {
    try {
      const { data } = await apiClient.get('/restaurants/markets/list');
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get food markets error:', error);
      return [];
    }
  }

  // ---------- POSTS ----------

  async getTrendingPosts(page = 1, filter = 'all'): Promise<Post[]> {
    try {
      const { data } = await apiClient.get('/posts/trending', { 
        params: { page, filter } 
      });
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get trending posts error:', error);
      return [];
    }
  }

  async getPostById(id: string | number): Promise<Post> {
    try {
      const { data } = await apiClient.get(`/posts/${id}`);
      return data.data;
    } catch (error) {
      console.error('[ApiService] Get post by ID error:', error);
      throw error;
    }
  }

  async getPostsByUserId(userId: string | number): Promise<Post[]> {
    try {
      const { data } = await apiClient.get(`/users/${userId}/posts`);
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get posts by user ID error:', error);
      return [];
    }
  }

  async getSavedPosts(): Promise<Post[]> {
    try {
      const { data } = await apiClient.get('/users/me/saved-posts');
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get saved posts error:', error);
      return [];
    }
  }

  async createPost(payload: {
    caption?: string;
    images?: string[];
    restaurantId?: number;
    newRestaurant?: any;
    location?: any;
  }): Promise<Post> {
    try {
      const { data } = await apiClient.post('/posts', payload);
      return data.data;
    } catch (error) {
      console.error('[ApiService] Create post error:', error);
      throw error;
    }
  }

  async likePost(id: string | number): Promise<void> {
    try {
      await apiClient.post(`/posts/${id}/like`);
    } catch (error) {
      console.error('[ApiService] Like post error:', error);
      throw error;
    }
  }

  async unlikePost(id: string | number): Promise<void> {
    try {
      await apiClient.delete(`/posts/${id}/like`);
    } catch (error) {
      console.error('[ApiService] Unlike post error:', error);
      throw error;
    }
  }

  async savePost(id: string | number): Promise<void> {
    try {
      await apiClient.post(`/posts/${id}/save`);
    } catch (error) {
      console.error('[ApiService] Save post error:', error);
      throw error;
    }
  }

  async unsavePost(id: string | number): Promise<void> {
    try {
      await apiClient.delete(`/posts/${id}/save`);
    } catch (error) {
      console.error('[ApiService] Unsave post error:', error);
      throw error;
    }
  }

  // ---------- COMMENTS ----------

  async getPostComments(postId: string | number): Promise<Comment[]> {
    try {
      const { data } = await apiClient.get(`/posts/${postId}/comments`);
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Get post comments error:', error);
      return [];
    }
  }

  async addComment(postId: string | number, content: string): Promise<Comment> {
    try {
      const { data } = await apiClient.post(`/posts/${postId}/comments`, { 
        content 
      });
      return data.data;
    } catch (error) {
      console.error('[ApiService] Add comment error:', error);
      throw error;
    }
  }

  // ---------- SEARCH ----------

  async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/places/search', {
        params: { q: query },
      });
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Search places error:', error);
      return [];
    }
  }

  async universalSearch(query: string, filter: 'newest' | 'popular' = 'newest'): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/search', { params: { q: query, filter } });
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Universal search error:', error);
      return [];
    }
  }

  async searchPosts(query: string): Promise<Post[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/posts/search', { 
        params: { q: query } 
      });
      return data.data || [];
    } catch (error) {
      console.error('[ApiService] Search posts error:', error);
      return [];
    }
  }
  
  async searchTrendingPosts(params: PostSearchParams): Promise<PaginatedPostResponse> {
    try {
      const { data } = await apiClient.get('/posts/search', { params });
      return {
        data: data.data || [],
        page: data.page ?? params.page ?? 1,
      };
    } catch (error) {
      console.error('[ApiService] Search trending posts error:', error);
      return { data: [], page: params.page ?? 1 };
    }
  }

  // ---------- SOCIAL / PROFILE ----------

  async getUserProfile(userId: string | number): Promise<User> {
    try {
      const { data } = await apiClient.get(`/users/${userId}`);
      return data.data;
    } catch (error) {
      console.error('[ApiService] Get user profile error:', error);
      throw error;
    }
  }

  async followUser(userId: string | number): Promise<void> {
    try {
      await apiClient.post(`/users/${userId}/follow`);
    } catch (error) {
      console.error('[ApiService] Follow user error:', error);
      throw error;
    }
  }

  async unfollowUser(userId: string | number): Promise<void> {
    try {
      await apiClient.post(`/users/${userId}/unfollow`);
    } catch (error) {
      console.error('[ApiService] Unfollow user error:', error);
      throw error;
    }
  }

  // ---------- GOOGLE MAPS INTEGRATION ----------

  
  getGoogleMapsDirectionsUrl(lat: number, lng: number, placeName?: string): string {
    const destination = placeName ? encodeURIComponent(placeName) : `${lat},${lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }

  getGoogleMapsUrl(lat: number, lng: number, placeName?: string): string {
    // On mobile, this will open the Google Maps app if installed
    const query = placeName ? encodeURIComponent(placeName) : `${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }


  // ---------- STORAGE HELPERS ----------

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('[ApiService] Get token error:', error);
      return null;
    }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('[ApiService] Get stored user error:', error);
      return null;
    }
  }

  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('[ApiService] Save token error:', error);
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('[ApiService] Save user error:', error);
    }
  }

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('[ApiService] Remove token error:', error);
    }
  }

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('[ApiService] Remove user error:', error);
    }
  }

  // ---------- NETWORK DIAGNOSTICS ----------

  /**
   * Test backend connection
   * Useful for debugging network issues
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.get('/health', { timeout: 5000 });
      return { 
        success: true, 
        message: `Connected to backend at ${API_BASE_URL}` 
      };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        return { 
          success: false, 
          message: 'Connection timeout - backend is not responding' 
        };
      } else if (error.request && !error.response) {
        return { 
          success: false, 
          message: `Cannot reach backend at ${API_BASE_URL}. Check if:\n1. Backend is running\n2. IP address is correct\n3. Phone and computer are on same WiFi` 
        };
      } else {
        return { 
          success: false, 
          message: `Connection error: ${error.message}` 
        };
      }
    }
  }
}

export const apiService = new ApiService();
export default apiService;
export { apiClient };