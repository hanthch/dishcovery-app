import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Restaurant, BackendFilterParams } from '../types/restaurant';
import { Post, Comment } from '../types/post';
import { User, LoginResponse, SignupRequest } from '../types/auth';

declare var __DEV__: boolean;

const API_BASE_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.52.104:3000/api/v1')
  : 'https://api.dishcovery.app/api/v1';
const TOKEN_KEY = 'authToken';
const USER_KEY  = 'userData';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) config.headers.Authorization = `Bearer ${token}`;
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    } catch (e) {
      console.error('[API] Request interceptor error:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ✓ ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      const url    = error.config?.url ?? '';
      const status = error.response.status;
      if (status === 401 && url.includes('/auth/me')) {
        console.warn('[API] /auth/me — no active session, clearing stored tokens');
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      } else {
        // All other HTTP errors are genuine problems — keep as error
        console.error(`[API] ${url} - ${status}`, error.response.data);
      }
    } else if (error.request) {
      console.error('[API] Network Error — is backend running at:', API_BASE_URL);
    } else {
      console.error('[API] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

export interface PlaceSearchResult {
  type: 'restaurant' | 'new_place';
  id?: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  google_maps_url?: string | null;
  image?: string | null;
  food_types?: string[];
  rating?: number | null;
  verified?: boolean;
  status?: string;
  top_rank_this_week?: number | null;
  posts_count?: number;
}

export interface SearchResult {
  type: 'post' | 'restaurant' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  landmark?: string | null;
  data: any;
}

export interface PaginatedPostResponse {
  data: Post[];
  page: number;
  hasMore?: boolean;
}

export interface PostSearchParams {
  q?: string;
  hashtag?: string;
  sort?: 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface CloudinarySignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  resourceType: 'image' | 'video';
}

export interface CloudinaryUploadedAsset {
  secure_url: string;
  public_id: string;
  resourceType: string;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
}

/** Payload for POST /restaurants/:id/reviews */
export interface ReviewPayload {
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
  dish_name?: string;
  dish_price?: string;
}

/** Shape returned by POST /restaurants/:id/reviews and GET /restaurants/:id */
export interface ReviewResponse {
  id: string;
  rating: number;
  title?: string;
  text?: string;
  content?: string;
  likes: number;
  images: string[];
  dish_name?: string;
  dish_price?: string;   // stored as text in DB; displayed as-is in UI
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

class ApiService {
  // ──────────────────────────────────────────────────────
  // Auth
  // ──────────────────────────────────────────────────────
  async socialLogin(
    provider: 'google' | 'facebook' | 'apple',
    tokens: { access_token?: string; identity_token?: string }
  ): Promise<LoginResponse> {
    const res = await apiClient.post('/auth/social', {
      provider,
      ...tokens,
    });
    const { user, token } = res.data.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return { user, token };
  }
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post('/auth/login', { email, password });
    const { user, token } = res.data.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return { user, token };
  }

  async signup(payload: SignupRequest): Promise<LoginResponse> {
    const { data } = await apiClient.post('/auth/register', payload);
    const { user, token } = data.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return { user, token };
  }

  async logout(): Promise<void> {
    try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
    finally { await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]); }
  }

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  async verifyResetCode(email: string, code: string): Promise<void> {
    await apiClient.post('/auth/verify-code', { email, code });
  }

  async confirmResetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    await apiClient.post('/auth/reset-password', { email, code, password: newPassword });
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await apiClient.get('/auth/me');
      return data.data;
    } catch (error: any) {
      // 401 = not logged in (expected). Any other status is a real problem.
      if (error?.response?.status !== 401) {
        console.error('[ApiService] getCurrentUser unexpected error:', error);
      }
      return null;
    }
  }

  // ──────────────────────────────────────────────────────
  // Restaurants
  // ──────────────────────────────────────────────────────
  async getRestaurants(filters?: BackendFilterParams): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants', { params: filters });
      return data.data ?? [];
    } catch (error) {
      console.error('[ApiService] getRestaurants error:', error);
      return [];
    }
  }
  
  async getTopTen(): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants/top-rated');
      return data.data ?? [];
    } catch (error) {
      console.error('[ApiService] getTopTen error:', error);
      return [];
    }
  }

  async getNewRestaurants(limit = 10): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants/category/moi-nhat', {
        params: { limit },
      });
      return data.data ?? [];
    } catch (error) {
      console.error('[ApiService] getNewRestaurants error:', error);
      return [];
    }
  }

  /**
   * Fetch restaurants for a category slug.
   * The backend GET /restaurants/category/:category handles:
   *   - food type slugs  (bun-pho, cafe, mon-viet …)
   *   - price tier slugs (binh-dan, gia-hop-ly …)
   *   - vibe slugs       (top-rated, moi-nhat)
   */
  async getRestaurantsByCategory(
    category: string,
    page = 1,
    limit = 20
  ): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get(`/restaurants/category/${category}`, {
        params: { page, limit },
      });
      return data.data ?? [];
    } catch (error) {
      console.error('[ApiService] getRestaurantsByCategory error:', error);
      return [];
    }
  }

  async getMarketRestaurants(): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants/markets/list');
      return data.data ?? [];
    } catch (error) {
      console.error('[ApiService] getMarketRestaurants error:', error);
      return [];
    }
  }

  async getRestaurantById(id: string): Promise<Restaurant> {
    const { data } = await apiClient.get(`/restaurants/${id}`);
    // Backend returns the restaurant object directly (not wrapped in .data)
    return (data?.id ? data : data?.data) as Restaurant;
  }

  async createRestaurant(payload: {
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    food_types?: string[];
    price_range?: string | number | null;
    opening_hours?: string | null;
    cover_image?: string | null;
    photos?: string[];
  }): Promise<Restaurant> {
    const { data } = await apiClient.post('/restaurants', payload);
    return data;
  }

  async getRestaurantLandmarkNotes(id: string): Promise<any[]> {
    try {
      const { data } = await apiClient.get(`/restaurants/${id}/landmark-notes`);
      return data.data ?? [];
    } catch (error) {
      console.error('[ApiService] getRestaurantLandmarkNotes error:', error);
      return [];
    }
  }

  async isRestaurantSaved(id: string): Promise<boolean> {
    try {
      const { data } = await apiClient.get(`/restaurants/${id}/is-saved`);
      return data.saved ?? false;
    } catch { return false; }
  }

  async saveRestaurant(id: string): Promise<void> {
    await apiClient.post(`/restaurants/${id}/save`);
  }

  async unsaveRestaurant(id: string): Promise<void> {
    await apiClient.post(`/restaurants/${id}/unsave`);
  }

  async getSavedRestaurants(): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/users/me/saved-restaurants');
      return data.data ?? [];
    } catch { return []; }
  }

  // ──────────────────────────────────────────────────────
  // Posts
  // ──────────────────────────────────────────────────────
  async getTrendingPosts(
    page = 1,
    filter: 'all' | 'newest' | 'popular' = 'all'
  ): Promise<PaginatedPostResponse> {
    try {
      const { data } = await apiClient.get('/posts/trending', {
        params: { page, filter },
      });
      return {
        data:    data.data    ?? [],
        page:    data.page    ?? page,
        hasMore: data.hasMore ?? false,
      };
    } catch (error) {
      console.error('[ApiService] getTrendingPosts error:', error);
      return { data: [], page, hasMore: false };
    }
  }

  async searchPosts(query: string): Promise<Post[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/posts/search', { params: { q: query } });
      return data.data ?? [];
    } catch { return []; }
  }

  async searchTrendingPosts(params: PostSearchParams): Promise<PaginatedPostResponse> {
    try {
      const { data } = await apiClient.get('/posts/search', { params });
      return {
        data:    data.data    ?? [],
        page:    data.page    ?? params.page ?? 1,
        hasMore: data.hasMore,
      };
    } catch {
      return { data: [], page: params.page ?? 1 };
    }
  }

  async getPostById(id: string): Promise<Post> {
    const { data } = await apiClient.get(`/posts/${id}`);
    return data.data;
  }

  async createPost(payload: {
    caption?:       string;
    images?:        string[];
    restaurantId?:  string;
    newRestaurant?: {
      isNew: true;
      name: string;
      address: string;
      openingHours?: string;
      cuisine?: string[];
      price_range?: number;
      landmark_notes?: string;
      lat?: number | null;
      lng?: number | null;
    };
    location?: {
      name: string;
      address?: string;
      lat?: number | null;
      lng?: number | null;
    };
  }): Promise<Post> {
    const { data } = await apiClient.post('/posts', payload);
    return data.data;
  }

  async likePost(id: string): Promise<{ liked: boolean; likes_count: number }> {
    const { data } = await apiClient.post(`/posts/${id}/like`);
    return data;
  }

  async unlikePost(id: string): Promise<{ liked: boolean; likes_count: number }> {
    const { data } = await apiClient.delete(`/posts/${id}/like`);
    return data;
  }

  async savePost(id: string): Promise<void> {
    await apiClient.post(`/posts/${id}/save`);
  }

  async unsavePost(id: string): Promise<void> {
    await apiClient.delete(`/posts/${id}/save`);
  }

  async getSavedPosts(): Promise<Post[]> {
    try {
      const { data } = await apiClient.get('/users/me/saved-posts');
      return data.data ?? [];
    } catch { return []; }
  }

  async getPostComments(postId: string): Promise<Comment[]> {
    try {
      const { data } = await apiClient.get(`/posts/${postId}/comments`);
      return data.data ?? [];
    } catch { return []; }
  }

  async addComment(postId: string, content: string): Promise<Comment> {
    const { data } = await apiClient.post(`/posts/${postId}/comments`, { content });
    return data.data;
  }

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
  }

  // ──────────────────────────────────────────────────────
  // Search
  // ──────────────────────────────────────────────────────
  async universalSearch(
    query: string,
    filter: 'newest' | 'popular' = 'newest'
  ): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/search', { params: { q: query, filter } });
      return data.data ?? [];
    } catch { return []; }
  }

  async searchRestaurants(
    query: string,
    limit = 20,
    filters?: { type?: string; price?: string; rating?: number }
  ): Promise<Restaurant[]> {
    if (!query.trim() && filters?.type == null && filters?.price == null && filters?.rating == null) return [];
    try {
      const { data } = await apiClient.get('/restaurants/search', {
        params: {
          q:      query.trim() || undefined,
          limit,
          type:   filters?.type   || undefined,
          price:  filters?.price  || undefined,
          rating: filters?.rating || undefined,
        },
      });
      return Array.isArray(data) ? data : (data.data ?? []);
    } catch (error) {
      console.error('[ApiService] searchRestaurants error:', error);
      return [];
    }
  }

  async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/places/search', { params: { q: query } });
      return data.data ?? [];
    } catch (error) {
      console.error('[ApiService] searchPlaces error:', error);
      return [];
    }
  }

  async checkPlaceDuplicate(
    name: string,
    address?: string
  ): Promise<{ hasDuplicates: boolean; suggestions: PlaceSearchResult[] }> {
    if (!name.trim()) return { hasDuplicates: false, suggestions: [] };
    try {
      const { data } = await apiClient.get('/places/check-duplicate', {
        params: { name, address },
      });
      return {
        hasDuplicates: data.hasDuplicates ?? false,
        suggestions:   data.suggestions   ?? [],
      };
    } catch (error) {
      console.warn('[ApiService] checkPlaceDuplicate error (non-fatal):', error);
      return { hasDuplicates: false, suggestions: [] };
    }
  }

  // ──────────────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────────────
  async getUserProfile(userId: string): Promise<User> {
    const { data } = await apiClient.get(`/users/${userId}`);
    return data.data;
  }

  async getUserPosts(userId: string, page = 1): Promise<Post[]> {
    try {
      const { data } = await apiClient.get(`/users/${userId}/posts`, { params: { page } });
      return data.data ?? [];
    } catch { return []; }
  }

  async followUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/follow`);
  }

  async unfollowUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/unfollow`);
  }

  async updateProfile(updates: {
    username?: string;
    full_name?: string;
    bio?: string;
    avatar_url?: string;
  }): Promise<User> {
    const { data } = await apiClient.patch('/users/me', updates);
    return data.data;
  }

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
  }

  async getUserFollowers(userId: string, page = 1): Promise<User[]> {
    try {
      const { data } = await apiClient.get(`/users/${userId}/followers`, { params: { page } });
      return data.data ?? [];
    } catch { return []; }
  }

  async getUserFollowing(userId: string, page = 1): Promise<User[]> {
    try {
      const { data } = await apiClient.get(`/users/${userId}/following`, { params: { page } });
      return data.data ?? [];
    } catch { return []; }
  }

  // ──────────────────────────────────────────────────────
  // App Config
  // ──────────────────────────────────────────────────────
  /**
   * Fetch the app's dynamic category/tab/price configuration from the backend.
   * Called once on startup by useAppConfig — result is module-cached.
   * Falls back gracefully; caller should never throw.
   */
  async getAppConfig(): Promise<any> {
    try {
      const { data } = await apiClient.get('/restaurants/config');
      return data.data ?? {};
    } catch (error) {
      console.warn('[ApiService] getAppConfig error (using local fallback):', error);
      return {};
    }
  }

  // ──────────────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────────────
  getGoogleMapsUrl(lat: number, lng: number, placeName?: string): string {
    const query = placeName ? encodeURIComponent(placeName) : `${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  getGoogleMapsDirectionsUrl(lat: number, lng: number, placeName?: string): string {
    const dest = placeName ? encodeURIComponent(placeName) : `${lat},${lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }

  async getToken(): Promise<string | null> {
    try { return await AsyncStorage.getItem(TOKEN_KEY); }
    catch { return null; }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  async saveUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await apiClient.get('/health', { timeout: 5000 });
      return { success: true, message: `Connected to ${API_BASE_URL}` };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        return { success: false, message: 'Connection timeout — backend not responding' };
      }
      if (error.request && !error.response) {
        return {
          success: false,
          message: `Cannot reach ${API_BASE_URL}\n1. Is backend running?\n2. Is IP correct?\n3. Same WiFi network?`,
        };
      }
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  // ────────────────────────────────────────────────────────
  // Restaurants — landmark notes (write)
  // ────────────────────────────────────────────────────────

  /**
   * POST /restaurants/:id/landmark-notes
   * Auth required.
   * Response: { data: LandmarkNote }
   */
  async createLandmarkNote(restaurantId: string, text: string): Promise<any> {
    try {
      const { data } = await apiClient.post(
        `/restaurants/${restaurantId}/landmark-notes`,
        { text }
      );
      return data.data;
    } catch (error) {
      console.error('[ApiService] createLandmarkNote error:', error);
      throw error;
    }
  }

  // ────────────────────────────────────────────────────────
  // Restaurants — reviews
  // ────────────────────────────────────────────────────────

  /**
   * GET /restaurants/:id/reviews
   * Paginated list of all reviews. page 1 returns first 10 sorted by likes (default) or newest.
   */
  async getRestaurantReviews(
    restaurantId: string,
    page = 1,
    limit = 10,
    sort: 'likes' | 'newest' = 'likes'
  ): Promise<{
    data: ReviewResponse[];
    page: number;
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { data } = await apiClient.get(
        `/restaurants/${restaurantId}/reviews`,
        { params: { page, limit, sort } }
      );
      return {
        data:    data.data    ?? [],
        page:    data.page    ?? page,
        total:   data.total   ?? 0,
        hasMore: data.hasMore ?? false,
      };
    } catch (error) {
      console.error('[ApiService] getRestaurantReviews error:', error);
      return { data: [], page, total: 0, hasMore: false };
    }
  }

  /**
   * POST /restaurants/:id/reviews
   * Auth required. Also recalculates the restaurant average rating in DB.
   * Response: { data: ReviewResponse }
   */
  async createReview(
    restaurantId: string,
    payload: ReviewPayload
  ): Promise<ReviewResponse> {
    try {
      const { data } = await apiClient.post(
        `/restaurants/${restaurantId}/reviews`,
        payload
      );
      return data.data;
    } catch (error) {
      console.error('[ApiService] createReview error:', error);
      throw error;
    }
  }

  /**
   * DELETE /restaurants/:id/reviews/:reviewId
   * Auth required. Only the review owner can delete.
   * Response: { success: true }
   */
  async deleteReview(restaurantId: string, reviewId: string): Promise<void> {
    try {
      await apiClient.delete(`/restaurants/${restaurantId}/reviews/${reviewId}`);
    } catch (error) {
      console.error('[ApiService] deleteReview error:', error);
      throw error;
    }
  }

  /**
   * POST /restaurants/:id/reviews/:reviewId/like
   * Auth required. Increments review like count by 1.
   * Response: { success: true, likes: number }
   */
  async likeReview(
    restaurantId: string,
    reviewId: string
  ): Promise<{ likes: number }> {
    try {
      const { data } = await apiClient.post(
        `/restaurants/${restaurantId}/reviews/${reviewId}/like`
      );
      return { likes: data.likes ?? 0 };
    } catch (error) {
      console.error('[ApiService] likeReview error:', error);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────
  // Cloudinary
  // ──────────────────────────────────────────────────────
  async getCloudinarySignature(params?: {
    folder?: string;
    resourceType?: 'image' | 'video';
  }): Promise<CloudinarySignResponse> {
    const { data } = await apiClient.post('/upload/sign-cloudinary', params || {});
    return data.data;
  }

  async uploadFileToCloudinary(
    file: {
      uri: string;
      mimeType?: string | null;
      fileName?: string | null;
      type?: 'image' | 'video' | string | null;
    },
    options?: { folder?: string }
  ): Promise<CloudinaryUploadedAsset> {
    const isVideo =
      file.type === 'video' ||
      (file.mimeType?.startsWith('video/') ?? false);

    const resourceType: 'image' | 'video' = isVideo ? 'video' : 'image';

    const sign = await this.getCloudinarySignature({
      folder: options?.folder,
      resourceType,
    });

    const uploadUrl = `https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      name:
        file.fileName ||
        `${isVideo ? 'video' : 'image'}-${Date.now()}${isVideo ? '.mp4' : '.jpg'}`,
    } as any);
    formData.append('api_key', sign.apiKey);
    formData.append('timestamp', String(sign.timestamp));
    formData.append('folder', sign.folder);
    formData.append('signature', sign.signature);

    const res = await fetch(uploadUrl, { method: 'POST', body: formData });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || 'Cloudinary upload failed');
    }

    return {
      secure_url:   json.secure_url,
      public_id:    json.public_id,
      resourceType: json.resource_type,
      format:       json.format,
      width:        json.width,
      height:       json.height,
      duration:     json.duration,
    };
  }

  async uploadManyToCloudinary(
    files: Array<{
      uri: string;
      mimeType?: string | null;
      fileName?: string | null;
      type?: 'image' | 'video' | string | null;
    }>,
    options?: { folder?: string }
  ): Promise<CloudinaryUploadedAsset[]> {
    const results: CloudinaryUploadedAsset[] = [];
    for (const file of files) {
      const uploaded = await this.uploadFileToCloudinary(file, options);
      results.push(uploaded);
    }
    return results;
  }

  async submitReport(payload: {
    type: 'post' | 'user' | 'restaurant';
    reason: string;
    post_id?: string;
    target_user_id?: string;
    restaurant_id?: string;
  }) {
    const { data } = await apiClient.post('/reports', payload);
    return data;
  }
}

export const apiService = new ApiService();
export default apiService;
export { apiClient };