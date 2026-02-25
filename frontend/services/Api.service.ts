// ─── services/Api_service.ts ──────────────────────────────────────────────────
// All response shapes verified against backend routes:
//   posts.js, restaurants.js, users.js, auth.js, search.js, places.js
//
// PLACES FLOW (create-post-modal → NewPlaceFormModal):
//   searchPlaces()        → GET /places/search
//                           Returns existing restaurants + new_place sentinel
//   checkPlaceDuplicate() → GET /places/check-duplicate
//                           Fuzzy name match — warns before creating duplicates

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Restaurant, BackendFilterParams } from '../types/restaurant';
import { Post, Comment } from '../types/post';
import { User, LoginResponse, SignupRequest } from '../types/auth';

declare var __DEV__: boolean;

const API_BASE_URL = __DEV__
  ? process.env.EXPO_PUBLIC_API_URL || 'http://192.168.52.104:3000/api/v1'
  : 'https://api.dishcovery.app/api/v1';
const TOKEN_KEY = 'authToken';
const USER_KEY  = 'userData';

// ── Axios instance ─────────────────────────────────────────────────────────────
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
      console.error(
        `[API] ✗ ${error.config?.url} - ${error.response.status}`,
        error.response.data
      );
      if (error.response.status === 401) {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      }
    } else if (error.request) {
      console.error('[API] ✗ Network Error — is backend running at:', API_BASE_URL);
    } else {
      console.error('[API] ✗ Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ── Shared response types ──────────────────────────────────────────────────────

// places.js GET /places/search → { data: PlaceSearchResult[] }
// places.js GET /places/check-duplicate → { hasDuplicates, suggestions: PlaceSearchResult[] }
export interface PlaceSearchResult {
  type: 'restaurant' | 'new_place';
  id?: string;                    // only when type === 'restaurant'
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

// search.js GET /search → { data: SearchResult[] }
export interface SearchResult {
  type: 'post' | 'restaurant' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  landmark?: string | null;
  data: any;
}

// posts.js GET /posts/trending → { data: Post[], page, hasMore }
export interface PaginatedPostResponse {
  data: Post[];
  page: number;
  hasMore?: boolean;
}

export interface PostSearchParams {
  q?: string;
  hashtag?: string;
  sort?: 'new' | 'popular';
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
class ApiService {

  // ════════════════════════════════════════════════════════════
  // AUTH
  // auth.js routes
  // ════════════════════════════════════════════════════════════

  // POST /auth/login → { data: { user, token } }
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post('/auth/login', { email, password });
    const { user, token } = res.data.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return { user, token };
  }

  // POST /auth/register → { data: { user, token } }
  async signup(payload: SignupRequest): Promise<LoginResponse> {
    const { data } = await apiClient.post('/auth/register', payload);
    const { user, token } = data.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return { user, token };
  }

  // POST /auth/logout → { message }  (JWT is stateless — client clears token)
  async logout(): Promise<void> {
    try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
    finally { await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]); }
  }

  // POST /auth/forgot-password → { message }
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  // POST /auth/verify-code → { message }
  async verifyResetCode(email: string, code: string): Promise<void> {
    await apiClient.post('/auth/verify-code', { email, code });
  }

  // POST /auth/reset-password → { message }
  async confirmResetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    await apiClient.post('/auth/reset-password', { email, code, password: newPassword });
  }

  // GET /auth/me → { data: User }
  async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  }

  // ════════════════════════════════════════════════════════════
  // RESTAURANTS
  // restaurants.js routes
  // ════════════════════════════════════════════════════════════

  // GET /restaurants → { data: Restaurant[], page, limit, total, hasMore }
  async getRestaurants(filters?: BackendFilterParams): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants', { params: filters });
      return Array.isArray(data) ? data : (data.data ?? []);
    } catch (error) {
      console.error('[ApiService] getRestaurants error:', error);
      return [];
    }
  }

  // GET /restaurants/top-rated → Restaurant[]  (plain array, no wrapper)
  async getTopTen(): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants/top-rated');
      return Array.isArray(data) ? data : (data.data ?? []);
    } catch (error) {
      console.error('[ApiService] getTopTen error:', error);
      return [];
    }
  }

  // GET /restaurants/category/:category → Restaurant[]  (plain array, no wrapper)
  // :category is a SLUG_MAP key: 'mon-viet' | 'mon-thai' | 'mon-han' |
  //   'mon-au-my' | 'mon-nhat' | 'mon-trung' | 'mon-an' | 'khac'
  async getRestaurantsByCategory(
    category: string,
    page = 1,
    limit = 20
  ): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get(`/restaurants/category/${category}`, {
        params: { page, limit },
      });
      return Array.isArray(data) ? data : (data.data ?? []);
    } catch (error) {
      console.error('[ApiService] getRestaurantsByCategory error:', error);
      return [];
    }
  }

  // GET /restaurants/markets/list → { data: Restaurant[] }
  async getMarketRestaurants(): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants/markets/list');
      return data.data ?? [];
    } catch (error) {
      console.error('[ApiService] getMarketRestaurants error:', error);
      return [];
    }
  }

  // GET /restaurants/:id → Restaurant  (object directly, no { data } wrapper)
  // normalizeRestaurant() in backend sets all field aliases — no remapping needed
  async getRestaurantById(id: string): Promise<Restaurant> {
    const { data } = await apiClient.get(`/restaurants/${id}`);
    return data;
  }

  // GET /restaurants/:id/landmark-notes → { data: LandmarkNote[] }
  async getRestaurantLandmarkNotes(id: string): Promise<any[]> {
    try {
      const { data } = await apiClient.get(`/restaurants/${id}/landmark-notes`);
      return data.data ?? [];
    } catch (error) {
      console.error('[ApiService] getRestaurantLandmarkNotes error:', error);
      return [];
    }
  }

  // GET /restaurants/:id/is-saved → { saved: boolean }
  async isRestaurantSaved(id: string): Promise<boolean> {
    try {
      const { data } = await apiClient.get(`/restaurants/${id}/is-saved`);
      return data.saved ?? false;
    } catch { return false; }
  }

  // POST /restaurants/:id/save → { success: true, saved: true }
  async saveRestaurant(id: string): Promise<void> {
    await apiClient.post(`/restaurants/${id}/save`);
  }

  // POST /restaurants/:id/unsave → { success: true, saved: false }
  async unsaveRestaurant(id: string): Promise<void> {
    await apiClient.post(`/restaurants/${id}/unsave`);
  }

  // GET /users/me/saved-restaurants → { data: Restaurant[] }
  async getSavedRestaurants(): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/users/me/saved-restaurants');
      return data.data ?? [];
    } catch { return []; }
  }

  // ════════════════════════════════════════════════════════════
  // POSTS
  // posts.js routes
  // ════════════════════════════════════════════════════════════

  // GET /posts/trending → { data: Post[], page, hasMore }
  // filter: 'all' (trending first then newest) | 'newest' | 'popular'
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

  // GET /posts/search → { data: Post[], page }
  // Simple string search — returns flat Post array
  async searchPosts(query: string): Promise<Post[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/posts/search', { params: { q: query } });
      return data.data ?? [];
    } catch { return []; }
  }

  // GET /posts/search → { data: Post[], page, hasMore? }
  // Full-params search — returns paginated response
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

  // GET /posts/:id → { data: Post }
  async getPostById(id: string): Promise<Post> {
    const { data } = await apiClient.get(`/posts/${id}`);
    return data.data;
  }

  // POST /posts → { data: Post }  (status 201)
  //
  // Body shape:
  //   caption      string | undefined
  //   images       string[] | undefined    — URIs after upload
  //   restaurantId string | undefined      — existing DB restaurant UUID (NEVER convert to number)
  //   newRestaurant object | undefined     — { isNew:true, name, address, openingHours,
  //                                           cuisine, price_range, landmark_notes, lat, lng }
  //                                          backend runs createRestaurantFromNewPlace()
  //   location     object | undefined      — raw location tag, no DB insert
  //                                          { name, address, lat, lng }
  //
  // Flow in posts.js:
  //   1. newRestaurant.isNew → INSERT restaurants + landmark_notes → use new UUID
  //   2. restaurantId        → use that UUID directly as FK
  //   3. neither             → post has no restaurant tag
  async createPost(payload: {
    caption?:       string;
    images?:        string[];
    restaurantId?:  string;   // string UUID — never number
    newRestaurant?: {
      isNew: true;
      name: string;
      address: string;
      openingHours?: string;
      cuisine?: string[];
      price_range?: number;   // 1–4 int → mapPriceRange() in posts.js
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

  // POST /posts/:id/like → { liked: true, likes_count: number }
  async likePost(id: string): Promise<{ liked: boolean; likes_count: number }> {
    const { data } = await apiClient.post(`/posts/${id}/like`);
    return data;
  }

  // DELETE /posts/:id/like → { liked: false, likes_count: number }
  async unlikePost(id: string): Promise<{ liked: boolean; likes_count: number }> {
    const { data } = await apiClient.delete(`/posts/${id}/like`);
    return data;
  }

  // POST /posts/:id/save → { saved: true }
  async savePost(id: string): Promise<void> {
    await apiClient.post(`/posts/${id}/save`);
  }

  // DELETE /posts/:id/save → { saved: false }
  async unsavePost(id: string): Promise<void> {
    await apiClient.delete(`/posts/${id}/save`);
  }

  // GET /users/me/saved-posts → { data: Post[] }
  async getSavedPosts(): Promise<Post[]> {
    try {
      const { data } = await apiClient.get('/users/me/saved-posts');
      return data.data ?? [];
    } catch { return []; }
  }

  // ════════════════════════════════════════════════════════════
  // COMMENTS
  // posts.js routes
  // ════════════════════════════════════════════════════════════

  // GET /posts/:id/comments → { data: Comment[] }
  async getPostComments(postId: string): Promise<Comment[]> {
    try {
      const { data } = await apiClient.get(`/posts/${postId}/comments`);
      return data.data ?? [];
    } catch { return []; }
  }

  // POST /posts/:id/comments  body: { content } → { data: Comment }
  async addComment(postId: string, content: string): Promise<Comment> {
    const { data } = await apiClient.post(`/posts/${postId}/comments`, { content });
    return data.data;
  }

  // ════════════════════════════════════════════════════════════
  // SEARCH
  // search.js routes
  // ════════════════════════════════════════════════════════════

  // GET /search → { data: SearchResult[] }
  // Federated: returns restaurants + posts + users mixed, sorted restaurants first
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

  // GET /search — filters to only restaurant results, maps to Restaurant[]
  async searchRestaurants(query: string, limit = 20): Promise<Restaurant[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/search', { params: { q: query, limit } });
      const results: SearchResult[] = data.data ?? [];
      return results
        .filter(r => r.type === 'restaurant')
        .map(r => r.data as Restaurant);
    } catch { return []; }
  }

  // ════════════════════════════════════════════════════════════
  // PLACES
  // places.js routes — power the location-tag picker in create-post-modal
  // ════════════════════════════════════════════════════════════

  // GET /places/search?q= → { data: PlaceSearchResult[] }
  //
  // Returns:
  //   1. Existing DB restaurants matching the query  (type='restaurant')
  //   2. A single sentinel at the end                (type='new_place')
  //
  // UI usage in create-post-modal:
  //   - type='restaurant' rows  → tap to tag without creating anything new
  //   - type='new_place' row    → tap to open NewPlaceFormModal
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

  // GET /places/check-duplicate?name=&address= → { hasDuplicates, suggestions }
  //
  // Called by NewPlaceFormModal on name field blur BEFORE the user submits,
  // to warn them if a near-identical restaurant already exists in the DB.
  //
  // Response:
  //   { hasDuplicates: boolean, suggestions: PlaceSearchResult[] }  (up to 3)
  //
  // UI usage in NewPlaceFormModal:
  //   hasDuplicates=true  → shows yellow warning banner with suggestion rows
  //     → user taps suggestion → calls onPickExisting() → tags existing restaurant
  //     → user taps "Bỏ qua" → dismisses banner, proceeds to add new anyway
  //   hasDuplicates=false → no banner, form submits normally
  //
  // Non-fatal: if this call fails the user can still proceed to create a new place.
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
      // Non-fatal — if check fails, let user proceed anyway
      console.warn('[ApiService] checkPlaceDuplicate error (non-fatal):', error);
      return { hasDuplicates: false, suggestions: [] };
    }
  }

  // ════════════════════════════════════════════════════════════
  // USERS
  // users.js routes
  // ════════════════════════════════════════════════════════════

  // GET /users/:id → { data: User & { is_following, is_own_profile } }
  async getUserProfile(userId: string): Promise<User> {
    const { data } = await apiClient.get(`/users/${userId}`);
    return data.data;
  }

  // GET /users/:id/posts → { data: Post[], page }
  async getUserPosts(userId: string, page = 1): Promise<Post[]> {
    try {
      const { data } = await apiClient.get(`/users/${userId}/posts`, { params: { page } });
      return data.data ?? [];
    } catch { return []; }
  }

  // POST /users/:id/follow → { following: true }
  async followUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/follow`);
  }

  // POST /users/:id/unfollow → { following: false }
  async unfollowUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/unfollow`);
  }

  // ════════════════════════════════════════════════════════════
  // GOOGLE MAPS  (client-side helpers — no backend call)
  // ════════════════════════════════════════════════════════════

  // Search URL — opens native Maps app on mobile
  getGoogleMapsUrl(lat: number, lng: number, placeName?: string): string {
    const query = placeName ? encodeURIComponent(placeName) : `${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  // Directions URL
  getGoogleMapsDirectionsUrl(lat: number, lng: number, placeName?: string): string {
    const dest = placeName ? encodeURIComponent(placeName) : `${lat},${lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }

  // ════════════════════════════════════════════════════════════
  // STORAGE HELPERS
  // ════════════════════════════════════════════════════════════

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

  // ════════════════════════════════════════════════════════════
  // DIAGNOSTICS
  // ════════════════════════════════════════════════════════════

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
}

export const apiService = new ApiService();
export default apiService;
export { apiClient };