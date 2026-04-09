import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Restaurant, BackendFilterParams } from '../types/restaurant';
import type { Post, Comment, PostLikesResponse } from '../types/post';
import type { User, LoginResponse, SignupRequest } from '../types/auth';

declare var __DEV__: boolean;

// ── Base URL ──────────────────────────────────────────────────────────────────
const API_BASE_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.2.142:3000/api/v1')
  : 'https://api.dishcovery.app/api/v1';

const TOKEN_KEY = 'authToken';
const USER_KEY  = 'userData';

// ── Axios instance ────────────────────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
});

let _tokenCache: string | null = null;

// Boot promise — loads token from AsyncStorage once at startup so every
// request in the same tick already has the token in the cache.
const _bootPromise: Promise<void> = AsyncStorage.getItem(TOKEN_KEY)
  .then((t) => { _tokenCache = t; })
  .catch(() => { _tokenCache = null; });

// Attach Bearer token to every request — reads from in-memory cache
apiClient.interceptors.request.use(
  (config) => {
    try {
      if (_tokenCache) config.headers.Authorization = `Bearer ${_tokenCache}`;
      if (__DEV__) console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    } catch (e) {
      console.error('[API] Request interceptor error:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global error logging + 401 cleanup
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) console.log(`[API] ${response.config.url} — ${response.status}`);
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      console.error(
        `[API] ${error.config?.url} — ${error.response.status}`,
        error.response.data
      );
      if (error.response.status === 401) {
        _tokenCache = null;
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      }
    } else if (error.request) {
      console.error('[API] ✗ Network error — backend at:', API_BASE_URL);
    } else {
      console.error('[API] ✗ Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ── Shared response / payload types ──────────────────────────────────────────

export interface CloudinarySignResponse {
  cloudName:    string;
  apiKey:       string;
  timestamp:    number;
  folder:       string;
  signature:    string;
  resourceType: 'image' | 'video';
}

export interface CloudinaryUploadedAsset {
  secure_url:   string;
  public_id:    string;
  resourceType: string;
  format?:      string;
  width?:       number;
  height?:      number;
  duration?:    number;
}

export interface PlaceSearchResult {
  type:                'restaurant' | 'new_place';
  id?:                 string;
  name:                string;
  address:             string;
  lat:                 number | null;
  lng:                 number | null;
  google_maps_url?:    string | null;
  image?:              string | null;
  food_types?:         string[];
  rating?:             number | null;
  verified?:           boolean;
  status?:             string;
  top_rank_this_week?: number | null;
  posts_count?:        number;
}

export interface SearchResult {
  type:      'post' | 'restaurant' | 'user';
  id:        string;
  title:     string;
  subtitle?: string;
  image?:    string | null;
  landmark?: string | null;
  data:      any;
}

export interface PaginatedPostResponse {
  data:     Post[];
  page:     number;
  hasMore?: boolean;
}

export interface PostSearchParams {
  q?:       string;
  hashtag?: string;
  sort?:    'new' | 'popular';
  page?:    number;
  limit?:   number;
}

export interface SubmitReportPayload {
  type:            'post' | 'user' | 'restaurant';
  reason:          string;
  post_id?:        string;
  target_user_id?: string;
  restaurant_id?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
class ApiService {

  async ready(): Promise<void> {
    return _bootPromise;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH   — /auth/* routes
  // ══════════════════════════════════════════════════════════════════════════

  /** POST /auth/login → { data: { user, token } } */
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post('/auth/login', {
      email:    email.trim().toLowerCase(),
      password,
    });
    const payload = res.data?.data ?? res.data;
    const { user, token } = payload;

    if (!user || !token) throw new Error('Invalid login response from server');

    // Update in-memory cache immediately so subsequent requests in the same
    // tick already have the token.
    _tokenCache = token;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return { user, token };
  }

  /** POST /auth/register → { data: { user, token } } */
  async signup(payload: SignupRequest): Promise<LoginResponse> {
    const body = {
      email:     payload.email.trim().toLowerCase(),
      password:  payload.password,
      username:  payload.username.trim(),
      // FIX: backend only accepts full_name — concatenation done in useAuth.ts
      full_name: payload.full_name?.trim() || payload.username.trim(),
    };
    const res = await apiClient.post('/auth/register', body);
    const responsePayload = res.data?.data ?? res.data;
    const { user, token } = responsePayload;
    if (!user || !token) throw new Error('Invalid registration response from server');

    _tokenCache = token;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return { user, token };
  }

  /** DELETE /users/me — hard delete own account */
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
  }

  /** POST /auth/logout — JWT is stateless; client clears storage */
  async logout(): Promise<void> {
    try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
    finally {
      _tokenCache = null;
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
  }

  /** POST /auth/forgot-password → { message } */
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  /** POST /auth/verify-code → { message } */
  async verifyResetCode(email: string, code: string): Promise<void> {
    await apiClient.post('/auth/verify-code', { email, code });
  }

  /** POST /auth/reset-password → { message } */
  async confirmResetPassword(
    email:       string,
    code:        string,
    newPassword: string
  ): Promise<void> {
    await apiClient.post('/auth/reset-password', { email, code, password: newPassword });
  }

  /** GET /auth/me → full profile shape */
  async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    return data.data ?? data;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESTAURANTS   — /restaurants/* routes
  // ══════════════════════════════════════════════════════════════════════════

  async getRestaurants(filters?: BackendFilterParams): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants', { params: filters });
      return Array.isArray(data) ? data : (data.data ?? []);
    } catch (error) {
      console.error('[ApiService] getRestaurants error:', error);
      return [];
    }
  }

  async getTopTen(): Promise<Restaurant[]> {
    try {
      const { data } = await apiClient.get('/restaurants/top-rated');
      return Array.isArray(data) ? data : (data.data ?? []);
    } catch (error) {
      console.error('[ApiService] getTopTen error:', error);
      return [];
    }
  }

  async getRestaurantsByCategory(
    category: string,
    page  = 1,
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

  async getAppConfig(): Promise<any> {
    const { data } = await apiClient.get('/config');
    return data.data ?? data;
  }

  async getRestaurantReviews(
    restaurantId: string,
    page  = 1,
    limit = 10
  ): Promise<{ data: any[]; page: number; hasMore: boolean }> {
    try {
      const { data } = await apiClient.get(`/restaurants/${restaurantId}/reviews`, {
        params: { page, limit },
      });
      return {
        data:    data.data    ?? [],
        page:    data.page    ?? page,
        hasMore: data.hasMore ?? false,
      };
    } catch { return { data: [], page, hasMore: false }; }
  }

  async addRestaurantReview(
    restaurantId: string,
    payload: {
      rating:      number;
      title?:      string;
      content?:    string;
      images?:     string[];
      dish_name?:  string;
      dish_price?: number;
    }
  ): Promise<any> {
    try {
      const { data } = await apiClient.post(
        `/restaurants/${restaurantId}/reviews`,
        payload
      );
      return data;
    } catch (error: any) {
      // FIX: surface the 409 duplicate-review error with a clean Vietnamese
      // message so restaurant-detail.tsx can show it directly in the Alert
      // without needing to parse the raw Axios error shape.
      const serverMsg = error?.response?.data?.error;
      if (serverMsg) throw new Error(serverMsg);
      throw error;
    }
  }

  async addLandmarkNote(restaurantId: string, text: string): Promise<any> {
    const { data } = await apiClient.post(
      `/restaurants/${restaurantId}/landmark-notes`,
      { text }
    );
    // FIX: backend wraps the new note in { data: note } — return the note, not the envelope
    return data.data ?? data;
  }

  async likeLandmarkNote(restaurantId: string, noteId: string): Promise<void> {
    await apiClient.post(
      `/restaurants/${restaurantId}/landmark-notes/${noteId}/like`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POSTS   — /posts/* routes
  // ══════════════════════════════════════════════════════════════════════════

  /** GET /posts/trending?page=&filter= */
  async getTrendingPosts(
    page   = 1,
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

  /** GET /posts/search?q= */
  async searchPosts(query: string): Promise<Post[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/posts/search', { params: { q: query } });
      return data.data ?? [];
    } catch { return []; }
  }

  /** GET /posts/search with full param set */
  async searchTrendingPosts(
    params: PostSearchParams
  ): Promise<PaginatedPostResponse> {
    try {
      const { data } = await apiClient.get('/posts/search', { params });
      return {
        data:    data.data    ?? [],
        page:    data.page    ?? params.page ?? 1,
        hasMore: data.hasMore ?? false, // FIX: was undefined when backend omits field, breaking pagination
      };
    } catch {
      return { data: [], page: params.page ?? 1, hasMore: false };
    }
  }

  /** GET /posts/:id */
  async getPostById(id: string): Promise<Post> {
    const { data } = await apiClient.get(`/posts/${id}`);
    return data.data;
  }

  /** POST /posts */
  async createPost(payload: {
    caption?:       string;
    images?:        string[];
    restaurantId?:  string;
    newRestaurant?: {
      isNew:           true;
      name:            string;
      address:         string;
      openingHours?:   string;
      cuisine?:        string[];
      price_range?:    number;
      landmark_notes?: string;
      lat?:            number | null;
      lng?:            number | null;
    };
    location?: {
      name:     string;
      address?: string;
      lat?:     number | null;
      lng?:     number | null;
    };
  }): Promise<Post> {
    const { data } = await apiClient.post('/posts', payload);
    return data.data;
  }

  /** POST /posts/:id/like */
  async likePost(id: string): Promise<{ liked: boolean; likes_count: number }> {
    const { data } = await apiClient.post(`/posts/${id}/like`);
    return data;
  }

  /** DELETE /posts/:id/like */
  async unlikePost(id: string): Promise<{ liked: boolean; likes_count: number }> {
    const { data } = await apiClient.delete(`/posts/${id}/like`);
    return data;
  }

  /** POST /posts/:id/save */
  async savePost(id: string): Promise<void> {
    await apiClient.post(`/posts/${id}/save`);
  }

  /** DELETE /posts/:id/save */
  async unsavePost(id: string): Promise<void> {
    await apiClient.delete(`/posts/${id}/save`);
  }

  /** GET /users/me/saved-posts */
  async getSavedPosts(): Promise<Post[]> {
    try {
      const { data } = await apiClient.get('/users/me/saved-posts');
      return data.data ?? [];
    } catch { return []; }
  }

  /**
   * GET /posts/:id/likes?page=
   * NEW — powers LikesModal: who liked this post, paginated.
   * Returns { data: PostLike[], page, hasMore, total }
   */
  async getPostLikes(postId: string, page = 1): Promise<PostLikesResponse> {
    try {
      const { data } = await apiClient.get(`/posts/${postId}/likes`, {
        params: { page },
      });
      return {
        data:    data.data    ?? [],
        page:    data.page    ?? page,
        hasMore: data.hasMore ?? false,
        total:   data.total   ?? 0,
      };
    } catch {
      return { data: [], page, hasMore: false, total: 0 };
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMMENTS   — /posts/:id/comments routes
  // ══════════════════════════════════════════════════════════════════════════

  /** GET /posts/:id/comments */
  async getPostComments(postId: string): Promise<Comment[]> {
    try {
      const { data } = await apiClient.get(`/posts/${postId}/comments`);
      return data.data ?? [];
    } catch { return []; }
  }

  /** POST /posts/:id/comments */
  async addComment(postId: string, content: string): Promise<Comment> {
    const { data } = await apiClient.post(`/posts/${postId}/comments`, { content });
    return data.data;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REPORTS   — /reports route
  // ══════════════════════════════════════════════════════════════════════════

  /** POST /reports */
  async submitReport(payload: SubmitReportPayload): Promise<void> {
    await apiClient.post('/reports', payload);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEARCH   — /search route
  // ══════════════════════════════════════════════════════════════════════════

  /** GET /search?q=&sort= */
  async universalSearch(
    query: string,
    sort:  'newest' | 'popular' = 'newest'
  ): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    try {
      const { data } = await apiClient.get('/search', { params: { q: query, sort } });
      return data.data ?? [];
    } catch { return []; }
  }

  /** Convenience: search and return only restaurant results */
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

  // ══════════════════════════════════════════════════════════════════════════
  // PLACES   — /places/* routes
  // ══════════════════════════════════════════════════════════════════════════

  /** GET /places/search?q= */
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

  /** GET /places/check-duplicate?name=&address= */
  async checkPlaceDuplicate(
    name:     string,
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

  // ══════════════════════════════════════════════════════════════════════════
  // USERS   — /users/* routes
  // ══════════════════════════════════════════════════════════════════════════

  /** GET /users/:id */
  async getUserProfile(userId: string): Promise<User> {
    // FIX: Safety guard — never call /users/me through this method.
    // getCurrentUser() exists for that purpose. This prevents a bug where
    // passing 'me' or the logged-in user's own ID could hit the wrong endpoint.
    if (!userId || userId === 'me') {
      return this.getCurrentUser();
    }
    const { data } = await apiClient.get(`/users/${userId}`);
    // Backend returns { data: profile } shape
    return data.data ?? data;
  }

  /**
   * PATCH /users/me — update own profile
   * FIX: was missing from original ApiService; required by EditModal in
   * user-profile.tsx to persist username / full_name / bio / avatar_url.
   */
  async updateProfile(updates: {
    username?:   string;
    full_name?:  string;
    avatar_url?: string;
    bio?:        string;
  }): Promise<User> {
    const { data } = await apiClient.patch('/users/me', updates);
    // FIX: guard against backends that return the user at the top level
    // without a { data: } envelope — was previously returning undefined
    return data.data ?? data;
  }

  /** GET /users/:id/posts */
  async getUserPosts(userId: string, page = 1): Promise<Post[]> {
    try {
      const { data } = await apiClient.get(`/users/${userId}/posts`, {
        params: { page },
      });
      return data.data ?? [];
    } catch { return []; }
  }

  /** POST /users/:id/follow */
  async followUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/follow`);
  }

  /** POST /users/:id/unfollow */
  async unfollowUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/unfollow`);
  }

  /** GET /users/:id/followers */
  async getUserFollowers(userId: string, page = 1): Promise<User[]> {
    try {
      const { data } = await apiClient.get(`/users/${userId}/followers`, {
        params: { page },
      });
      return data.data ?? [];
    } catch { return []; }
  }

  /** GET /users/:id/following */
  async getUserFollowing(userId: string, page = 1): Promise<User[]> {
    try {
      const { data } = await apiClient.get(`/users/${userId}/following`, {
        params: { page },
      });
      return data.data ?? [];
    } catch { return []; }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UPLOAD   — /upload route + Cloudinary direct upload
  // ══════════════════════════════════════════════════════════════════════════

  /** POST /upload/sign-cloudinary — get a signed upload URL */
  async getCloudinarySignature(params?: {
    folder?:       string;
    resourceType?: 'image' | 'video';
  }): Promise<CloudinarySignResponse> {
    const { data } = await apiClient.post('/upload/sign-cloudinary', params || {});
    return data.data;
  }

  /** Upload a single file directly to Cloudinary (signed) */
  async uploadFileToCloudinary(
    file: {
      uri:        string;
      mimeType?:  string | null;
      fileName?:  string | null;
      type?:      'image' | 'video' | string | null;
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
      uri:  file.uri,
      type: file.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      name: file.fileName || `${isVideo ? 'video' : 'image'}-${Date.now()}${isVideo ? '.mp4' : '.jpg'}`,
    } as any);
    formData.append('api_key',   sign.apiKey);
    formData.append('timestamp', String(sign.timestamp));
    formData.append('folder',    sign.folder);
    formData.append('signature', sign.signature);

    const res  = await fetch(uploadUrl, { method: 'POST', body: formData });
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

  /**
   * Upload multiple files to Cloudinary in parallel.
   * FIX: was sequential (for...await loop) — uploading 3 images took 3×
   * the time of one. Promise.all fires all uploads concurrently so total
   * time ≈ the slowest single upload instead of the sum of all of them.
   */
  async uploadManyToCloudinary(
    files: Array<{
      uri:       string;
      mimeType?: string | null;
      fileName?: string | null;
      type?:     'image' | 'video' | string | null;
    }>,
    options?: { folder?: string }
  ): Promise<CloudinaryUploadedAsset[]> {
    return Promise.all(
      files.map(file => this.uploadFileToCloudinary(file, options))
    );
  }

  /**
   * POST /upload — multipart upload to our own backend storage bucket.
   * Used as a fallback when Cloudinary is not configured.
   */
  async uploadImage(uri: string, mimeType = 'image/jpeg'): Promise<string> {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: mimeType,
      name: `upload-${Date.now()}.jpg`,
    } as any);

    const { data } = await apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data.url as string;
  }

  async uploadImages(uris: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const uri of uris) {
      const url = await this.uploadImage(uri);
      results.push(url);
    }
    return results;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Returns a Google Maps directions URL.
   * FIX: coordinates always win over placeName — a name-based query can match
   * the wrong location. placeName is kept as a display hint only via the
   * &query param, which shows a label on the pin without affecting accuracy.
   * Also switched from /search to /dir so the user lands in directions mode.
   */
  getGoogleMapsUrl(lat: number, lng: number, placeName?: string): string {
    if (lat && lng) {
      const dest = `${lat},${lng}`;
      const label = placeName ? `&query=${encodeURIComponent(placeName)}` : '';
      return `https://www.google.com/maps/dir/?api=1&destination=${dest}${label}`;
    }
    // Fallback: no coordinates — use name as search query
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName ?? '')}`;
  }

  /**
   * Explicit directions URL — always uses coordinates when available.
   * Kept for backwards compat; behaves identically to getGoogleMapsUrl now.
   */
  getGoogleMapsDirectionsUrl(lat: number, lng: number, placeName?: string): string {
    return this.getGoogleMapsUrl(lat, lng, placeName);
  }

  /**
   * Returns cached token synchronously — avoids async AsyncStorage read in hot paths.
   * FIX: was marked async with no await, which needlessly wraps the value in a
   * Promise and misleads callers into thinking there's I/O happening.
   */
  getToken(): string | null {
    return _tokenCache;
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async saveToken(token: string): Promise<void> {
    _tokenCache = token;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  async saveUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  async removeToken(): Promise<void> {
    _tokenCache = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await apiClient.get('/health', { timeout: 5_000 });
      return { success: true, message: `Connected to ${API_BASE_URL}` };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        return { success: false, message: 'Connection timeout — backend not responding' };
      }
      if (error.request && !error.response) {
        return {
          success: false,
          message: `Cannot reach ${API_BASE_URL}\n1. Backend running?\n2. IP correct?\n3. Same WiFi?`,
        };
      }
      return { success: false, message: `Error: ${error.message}` };
    }
  }
}

export const apiService = new ApiService();
export default apiService;
export { apiClient };