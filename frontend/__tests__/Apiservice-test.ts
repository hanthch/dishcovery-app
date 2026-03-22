jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// ─── Imports ──────────────────────────────────────────────────────────────────

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService, { apiClient } from '../services/Api.service';
import { adminApi } from '../services/adminApi';

// ─── Typed helpers ────────────────────────────────────────────────────────────

const mockedAxios = axios as jest.Mocked<typeof axios>;

/** Returns a fake AxiosResponse wrapper so apiClient interceptors resolve correctly */
function axiosResolve(data: unknown) {
  return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config: {} });
}

function axiosReject(status: number, data: unknown = {}) {
  // Returns an Error directly — mockRejectedValueOnce wraps it in a rejection.
  // Do NOT return Promise.reject() here or Node prints an unhandled rejection.
  const err: any = new Error(`Request failed with status code ${status}`);
  err.response = { status, data, headers: {}, config: {} };
  err.config   = { url: '/test' };
  return err;
}

// ─── Shared mock data ─────────────────────────────────────────────────────────

const MOCK_TOKEN = 'test-jwt-token-abc123';

const MOCK_USER = {
  id: 'user-1',
  username: 'testuser',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  role: 'user',
  is_banned: false,
  followers_count: 10,
  following_count: 5,
  posts_count: 3,
  contributions: 2,
  scout_points: 20,
  created_at: '2024-01-01T00:00:00Z',
};

const MOCK_RESTAURANT = {
  id: 'rest-1',
  name: 'Phở Hà Nội',
  address: '123 Lê Lợi, Q.1',
  food_types: ['Bún & Phở'],
  rating: 4.5,
  rating_count: 120,
  price_range: '30k - 80k VND',
  verified: true,
  status: 'active',
  cover_image: 'https://example.com/pho.jpg',
};

const MOCK_POST = {
  id: 'post-1',
  caption: 'Phở ngon lắm!',
  images: ['https://example.com/img.jpg'],
  likes_count: 42,
  comments_count: 5,
  saves_count: 3,
  is_trending: false,
  created_at: '2024-06-01T10:00:00Z',
  user: { id: 'user-1', username: 'testuser', avatar_url: null },
  restaurant: MOCK_RESTAURANT,
};

const MOCK_REVIEW = {
  id: 'review-1',
  rating: 5,
  title: 'Tuyệt vời',
  content: 'Ăn rất ngon, sẽ quay lại!',
  likes: 8,
  images: [],
  created_at: '2024-06-01T12:00:00Z',
  user: { id: 'user-1', username: 'testuser', avatar_url: null },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — AUTH
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiService — Auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── login ──────────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('calls POST /auth/login with email and password', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { user: MOCK_USER, token: MOCK_TOKEN } },
      });

      const result = await apiService.login('test@example.com', 'password123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email:    'test@example.com',
        password: 'password123',
      });
      expect(result.user).toEqual(MOCK_USER);
      expect(result.token).toBe(MOCK_TOKEN);
    });

    it('stores token and user in AsyncStorage after login', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { user: MOCK_USER, token: MOCK_TOKEN } },
      });

      await apiService.login('test@example.com', 'password123');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', MOCK_TOKEN);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'userData',
        JSON.stringify(MOCK_USER)
      );
    });

    it('propagates error when login fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(
        axiosReject(401, { error: 'Invalid credentials' })
      );

      await expect(
        apiService.login('wrong@example.com', 'badpass')
      ).rejects.toBeDefined();
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────
  describe('logout()', () => {
    it('removes token and userData from AsyncStorage', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await apiService.logout();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'authToken',
        'userData',
      ]);
    });

    it('still clears storage even when POST /auth/logout fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await apiService.logout(); // must NOT throw

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'authToken',
        'userData',
      ]);
    });
  });

  // ── getCurrentUser ─────────────────────────────────────────────────────────
  describe('getCurrentUser()', () => {
    it('returns user when token is valid', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: MOCK_USER },
      });

      const user = await apiService.getCurrentUser();
      expect(user).toEqual(MOCK_USER);
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('returns null on 401 (expected — no session)', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(
        axiosReject(401)
      );

      const user = await apiService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('returns null on unexpected 500 error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(
        axiosReject(500, { error: 'Server error' })
      );

      const user = await apiService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  // ── signup ─────────────────────────────────────────────────────────────────
  describe('signup()', () => {
    it('calls POST /auth/register and stores credentials', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { user: MOCK_USER, token: MOCK_TOKEN } },
      });

      const payload = {
        email:    'new@example.com',
        password: 'securepass',
        username: 'newuser',
      };
      const result = await apiService.signup(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', payload);
      expect(result.token).toBe(MOCK_TOKEN);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', MOCK_TOKEN);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — RESTAURANTS
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiService — Restaurants', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getRestaurants ─────────────────────────────────────────────────────────
  describe('getRestaurants()', () => {
    it('returns restaurant array from data.data', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_RESTAURANT] },
      });

      const result = await apiService.getRestaurants();
      expect(result).toEqual([MOCK_RESTAURANT]);
      expect(apiClient.get).toHaveBeenCalledWith('/restaurants', { params: undefined });
    });

    it('passes filter params to the request', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [] },
      });

      await apiService.getRestaurants({ type: 'cafe', rating: 4 });

      expect(apiClient.get).toHaveBeenCalledWith('/restaurants', {
        params: { type: 'cafe', rating: 4 },
      });
    });

    it('returns empty array on network error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network'));

      const result = await apiService.getRestaurants();
      expect(result).toEqual([]);
    });
  });

  // ── getRestaurantById ──────────────────────────────────────────────────────
  describe('getRestaurantById()', () => {
    it('returns restaurant when backend sends data directly at root', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: MOCK_RESTAURANT,
      });

      const result = await apiService.getRestaurantById('rest-1');
      expect(result).toEqual(MOCK_RESTAURANT);
      expect(apiClient.get).toHaveBeenCalledWith('/restaurants/rest-1');
    });

    it('falls back to data.data when root has no id', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: MOCK_RESTAURANT },
      });

      const result = await apiService.getRestaurantById('rest-1');
      expect(result).toEqual(MOCK_RESTAURANT);
    });
  });

  // ── getTopTen ──────────────────────────────────────────────────────────────
  describe('getTopTen()', () => {
    it('hits /restaurants/top-rated and returns list', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_RESTAURANT] },
      });

      const result = await apiService.getTopTen();
      expect(result).toEqual([MOCK_RESTAURANT]);
      expect(apiClient.get).toHaveBeenCalledWith('/restaurants/top-rated');
    });

    it('returns empty array on error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Timeout'));
      const result = await apiService.getTopTen();
      expect(result).toEqual([]);
    });
  });

  // ── getRestaurantsByCategory ───────────────────────────────────────────────
  describe('getRestaurantsByCategory()', () => {
    it('builds correct URL with slug and paginates', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_RESTAURANT] },
      });

      const result = await apiService.getRestaurantsByCategory('bun-pho', 2, 10);

      expect(apiClient.get).toHaveBeenCalledWith('/restaurants/category/bun-pho', {
        params: { page: 2, limit: 10 },
      });
      expect(result).toHaveLength(1);
    });
  });

  // ── saveRestaurant / unsaveRestaurant ──────────────────────────────────────
  describe('saveRestaurant() / unsaveRestaurant()', () => {
    it('calls POST /restaurants/:id/save', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await apiService.saveRestaurant('rest-1');

      expect(apiClient.post).toHaveBeenCalledWith('/restaurants/rest-1/save');
    });

    it('calls POST /restaurants/:id/unsave', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await apiService.unsaveRestaurant('rest-1');

      expect(apiClient.post).toHaveBeenCalledWith('/restaurants/rest-1/unsave');
    });
  });

  // ── getSavedRestaurants ────────────────────────────────────────────────────
  describe('getSavedRestaurants()', () => {
    it('calls the correct hyphenated path /users/me/saved-restaurants', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_RESTAURANT] },
      });

      const result = await apiService.getSavedRestaurants();

      // Regression: old code incorrectly called /users/me/saved/restaurants
      expect(apiClient.get).toHaveBeenCalledWith('/users/me/saved-restaurants');
      expect(result).toEqual([MOCK_RESTAURANT]);
    });

    it('returns empty array on error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network'));
      const result = await apiService.getSavedRestaurants();
      expect(result).toEqual([]);
    });
  });

  // ── isRestaurantSaved ──────────────────────────────────────────────────────
  describe('isRestaurantSaved()', () => {
    it('returns true when backend says saved: true', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { saved: true },
      });
      expect(await apiService.isRestaurantSaved('rest-1')).toBe(true);
    });

    it('returns false on any error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('err'));
      expect(await apiService.isRestaurantSaved('rest-1')).toBe(false);
    });
  });

  // ── searchRestaurants ──────────────────────────────────────────────────────
  describe('searchRestaurants()', () => {
    it('returns empty array when query is blank and no filters', async () => {
      const result = await apiService.searchRestaurants('   ');
      expect(result).toEqual([]);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('sends correct params when query and filters provided', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_RESTAURANT] },
      });

      await apiService.searchRestaurants('phở', 10, { type: 'bun-pho', rating: 4 });

      expect(apiClient.get).toHaveBeenCalledWith('/restaurants/search', {
        params: expect.objectContaining({ q: 'phở', type: 'bun-pho', rating: 4 }),
      });
    });

    it('handles flat array response from backend', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: [MOCK_RESTAURANT],
      });

      const result = await apiService.searchRestaurants('pho');
      expect(result).toEqual([MOCK_RESTAURANT]);
    });
  });

  // ── createLandmarkNote ─────────────────────────────────────────────────────
  describe('createLandmarkNote()', () => {
    it('posts note text to the correct endpoint', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: 'note-1', text: 'Góc trái cuối hẻm' } },
      });

      const result = await apiService.createLandmarkNote('rest-1', 'Góc trái cuối hẻm');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/restaurants/rest-1/landmark-notes',
        { text: 'Góc trái cuối hẻm' }
      );
      expect(result.text).toBe('Góc trái cuối hẻm');
    });

    it('throws on error (caller must handle)', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(axiosReject(403));
      await expect(
        apiService.createLandmarkNote('rest-1', 'test')
      ).rejects.toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiService — Reviews', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getRestaurantReviews()', () => {
    it('returns paginated review data with correct defaults', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          data:    [MOCK_REVIEW],
          page:    1,
          total:   1,
          hasMore: false,
        },
      });

      const result = await apiService.getRestaurantReviews('rest-1');

      expect(apiClient.get).toHaveBeenCalledWith('/restaurants/rest-1/reviews', {
        params: { page: 1, limit: 10, sort: 'likes' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.total).toBe(1);
    });

    it('passes sort=newest when requested', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [], page: 1, total: 0, hasMore: false },
      });

      await apiService.getRestaurantReviews('rest-1', 1, 10, 'newest');

      expect(apiClient.get).toHaveBeenCalledWith('/restaurants/rest-1/reviews', {
        params: { page: 1, limit: 10, sort: 'newest' },
      });
    });

    it('returns safe empty shape on error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('err'));

      const result = await apiService.getRestaurantReviews('rest-1');
      expect(result).toEqual({ data: [], page: 1, total: 0, hasMore: false });
    });
  });

  describe('createReview()', () => {
    it('posts review payload to correct endpoint', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: MOCK_REVIEW },
      });

      const payload = { rating: 5, content: 'Ngon lắm!', title: 'Tuyệt' };
      const result = await apiService.createReview('rest-1', payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/restaurants/rest-1/reviews',
        payload
      );
      expect(result).toEqual(MOCK_REVIEW);
    });

    it('throws on failure so caller can show an alert', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(axiosReject(400));
      await expect(
        apiService.createReview('rest-1', { rating: 5, content: 'test' })
      ).rejects.toBeDefined();
    });
  });

  describe('deleteReview()', () => {
    it('calls DELETE on the correct nested URL', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

      await apiService.deleteReview('rest-1', 'review-1');

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/restaurants/rest-1/reviews/review-1'
      );
    });
  });

  describe('likeReview()', () => {
    it('returns updated like count', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { likes: 9 },
      });

      const result = await apiService.likeReview('rest-1', 'review-1');
      expect(result.likes).toBe(9);
    });

    it('defaults likes to 0 when not returned', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });
      const result = await apiService.likeReview('rest-1', 'review-1');
      expect(result.likes).toBe(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — POSTS
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiService — Posts', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getTrendingPosts()', () => {
    it('returns paginated posts with defaults', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_POST], page: 1, hasMore: true },
      });

      const result = await apiService.getTrendingPosts();

      expect(apiClient.get).toHaveBeenCalledWith('/posts/trending', {
        params: { page: 1, filter: 'all' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });

    it('returns empty shape on error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('err'));
      const result = await apiService.getTrendingPosts();
      expect(result).toEqual({ data: [], page: 1, hasMore: false });
    });
  });

  describe('searchPosts()', () => {
    it('returns empty array for blank query without hitting the API', async () => {
      const result = await apiService.searchPosts('   ');
      expect(result).toEqual([]);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('calls /posts/search with trimmed query', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_POST] },
      });

      const result = await apiService.searchPosts('phở');
      expect(apiClient.get).toHaveBeenCalledWith('/posts/search', {
        params: { q: 'phở' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('likePost() / unlikePost()', () => {
    it('calls POST /posts/:id/like', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { liked: true, likes_count: 43 },
      });

      const result = await apiService.likePost('post-1');
      expect(apiClient.post).toHaveBeenCalledWith('/posts/post-1/like');
      expect(result.liked).toBe(true);
      expect(result.likes_count).toBe(43);
    });

    it('calls DELETE /posts/:id/like for unlike', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({
        data: { liked: false, likes_count: 41 },
      });

      const result = await apiService.unlikePost('post-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/posts/post-1/like');
      expect(result.liked).toBe(false);
    });
  });

  describe('savePost() / unsavePost()', () => {
    it('calls POST /posts/:id/save', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });
      await apiService.savePost('post-1');
      expect(apiClient.post).toHaveBeenCalledWith('/posts/post-1/save');
    });

    it('calls DELETE /posts/:id/save for unsave', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
      await apiService.unsavePost('post-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/posts/post-1/save');
    });
  });

  describe('getSavedPosts()', () => {
    it('calls /users/me/saved-posts and returns posts', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_POST] },
      });

      const result = await apiService.getSavedPosts();
      expect(apiClient.get).toHaveBeenCalledWith('/users/me/saved-posts');
      expect(result).toHaveLength(1);
    });
  });

  describe('createPost()', () => {
    it('posts payload and returns new post', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: MOCK_POST },
      });

      const payload = {
        caption:      'Test caption',
        images:       ['https://example.com/img.jpg'],
        restaurantId: 'rest-1',
      };
      const result = await apiService.createPost(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/posts', payload);
      expect(result).toEqual(MOCK_POST);
    });
  });

  describe('addComment() / deleteComment()', () => {
    it('posts a new comment and returns it', async () => {
      const MOCK_COMMENT = { id: 'cmt-1', content: 'Ngon ghê!', user: MOCK_USER };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: MOCK_COMMENT },
      });

      const result = await apiService.addComment('post-1', 'Ngon ghê!');
      expect(apiClient.post).toHaveBeenCalledWith('/posts/post-1/comments', {
        content: 'Ngon ghê!',
      });
      expect(result.id).toBe('cmt-1');
    });

    it('calls DELETE /posts/:postId/comments/:commentId', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

      await apiService.deleteComment('post-1', 'cmt-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/posts/post-1/comments/cmt-1');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — SEARCH
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiService — Search', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('universalSearch()', () => {
    it('returns empty array for blank query without API call', async () => {
      const result = await apiService.universalSearch('  ');
      expect(result).toEqual([]);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('calls /search with query and filter', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [{ type: 'restaurant', id: 'rest-1', title: 'Phở Hà Nội', data: {} }] },
      });

      const result = await apiService.universalSearch('phở', 'popular');
      expect(apiClient.get).toHaveBeenCalledWith('/search', {
        params: { q: 'phở', filter: 'popular' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('searchPlaces()', () => {
    it('returns empty array for blank query', async () => {
      const result = await apiService.searchPlaces('');
      expect(result).toEqual([]);
    });

    it('returns place results from /places/search', async () => {
      const MOCK_PLACE = {
        type: 'restaurant',
        id: 'rest-1',
        name: 'Phở Hà Nội',
        address: '123 Lê Lợi',
        lat: 10.77,
        lng: 106.69,
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_PLACE] },
      });

      const result = await apiService.searchPlaces('phở');
      expect(apiClient.get).toHaveBeenCalledWith('/places/search', {
        params: { q: 'phở' },
      });
      expect(result[0].name).toBe('Phở Hà Nội');
    });
  });

  describe('checkPlaceDuplicate()', () => {
    it('returns no duplicates for blank name without API call', async () => {
      const result = await apiService.checkPlaceDuplicate('   ');
      expect(result).toEqual({ hasDuplicates: false, suggestions: [] });
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('returns duplicate flag and suggestions', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { hasDuplicates: true, suggestions: [{ id: 'rest-1', name: 'Phở Hà Nội' }] },
      });

      const result = await apiService.checkPlaceDuplicate('Phở Hà Nội', '123 Lê Lợi');
      expect(result.hasDuplicates).toBe(true);
      expect(result.suggestions).toHaveLength(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — USERS
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiService — Users', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getUserProfile()', () => {
    it('calls GET /users/:id and returns profile', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: MOCK_USER },
      });

      const result = await apiService.getUserProfile('user-1');
      expect(apiClient.get).toHaveBeenCalledWith('/users/user-1');
      expect(result.id).toBe('user-1');
    });
  });

  describe('followUser() / unfollowUser()', () => {
    it('calls POST /users/:id/follow', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });
      await apiService.followUser('user-2');
      expect(apiClient.post).toHaveBeenCalledWith('/users/user-2/follow');
    });

    it('calls POST /users/:id/unfollow', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });
      await apiService.unfollowUser('user-2');
      expect(apiClient.post).toHaveBeenCalledWith('/users/user-2/unfollow');
    });
  });

  describe('updateProfile()', () => {
    it('sends PATCH /users/me with update fields', async () => {
      const updated = { ...MOCK_USER, full_name: 'New Name' };
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: { data: updated },
      });

      const result = await apiService.updateProfile({ full_name: 'New Name' });

      expect(apiClient.patch).toHaveBeenCalledWith('/users/me', {
        full_name: 'New Name',
      });
      expect(result.full_name).toBe('New Name');
    });
  });

  describe('getUserFollowers() / getUserFollowing()', () => {
    it('fetches paginated followers list', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: [MOCK_USER] },
      });

      const result = await apiService.getUserFollowers('user-1', 2);
      expect(apiClient.get).toHaveBeenCalledWith('/users/user-1/followers', {
        params: { page: 2 },
      });
      expect(result).toHaveLength(1);
    });

    it('returns empty array on error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('err'));
      const result = await apiService.getUserFollowers('user-1');
      expect(result).toEqual([]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiService — Utilities', () => {
  describe('getGoogleMapsUrl()', () => {
    it('uses place name in query when provided', () => {
      const url = apiService.getGoogleMapsUrl(10.77, 106.69, 'Phở Hà Nội');
      expect(url).toContain('Ph%E1%BB%9F%20H%C3%A0%20N%E1%BB%99i');
      expect(url).toContain('https://www.google.com/maps/search/');
    });

    it('uses lat,lng when no place name', () => {
      const url = apiService.getGoogleMapsUrl(10.77, 106.69);
      expect(url).toContain('10.77,106.69');
    });
  });

  describe('getGoogleMapsDirectionsUrl()', () => {
    it('builds directions URL with encoded destination', () => {
      const url = apiService.getGoogleMapsDirectionsUrl(10.77, 106.69, 'Phở Hà Nội');
      expect(url).toContain('https://www.google.com/maps/dir/');
      expect(url).toContain('destination=');
    });
  });

  describe('getStoredUser()', () => {
    it('returns parsed user from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(MOCK_USER)
      );
      const result = await apiService.getStoredUser();
      expect(result).toEqual(MOCK_USER);
    });

    it('returns null when storage is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const result = await apiService.getStoredUser();
      expect(result).toBeNull();
    });
  });

  describe('submitReport()', () => {
    it('calls POST /reports with the full payload', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { message: 'Report submitted' },
      });

      await apiService.submitReport({
        type:    'post',
        reason:  'Spam',
        post_id: 'post-1',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/reports', {
        type:    'post',
        reason:  'Spam',
        post_id: 'post-1',
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — ADMIN API
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_ADMIN_USER = {
  id: 'admin-1',
  username: 'adminuser',
  full_name: 'Admin User',
  avatar_url: null,
  role: 'admin' as const,
  is_banned: false,
  ban_reason: null,
  followers_count: 0,
  posts_count: 0,
  scout_points: 0,
  created_at: '2024-01-01T00:00:00Z',
};

const MOCK_ADMIN_RESTAURANT = {
  id: 'rest-1',
  name: 'Phở Hà Nội',
  address: '123 Lê Lợi',
  status: 'pending' as const,
  verified: false,
  food_types: ['Bún & Phở'],
  rating: null,
  rating_count: 0,
  posts_count: 0,
  cover_image: null,
  created_at: '2024-06-01T00:00:00Z',
};

const MOCK_ADMIN_POST = {
  id: 'post-1',
  caption: 'Test post',
  images: [],
  likes_count: 0,
  comments_count: 0,
  saves_count: 0,
  is_trending: false,
  is_flagged: false,
  flag_reason: null,
  created_at: '2024-06-01T00:00:00Z',
  user: { id: 'user-1', username: 'testuser', avatar_url: null },
  restaurant: { id: 'rest-1', name: 'Phở Hà Nội', address: '123 Lê Lợi' },
};

const MOCK_REPORT = {
  id: 'report-1',
  type: 'post' as const,
  reason: 'Spam',
  status: 'pending' as const,
  resolution_note: null,
  created_at: '2024-06-01T00:00:00Z',
  reporter_id: 'user-1',
  post_id: 'post-1',
  target_user_id: null,
  restaurant_id: null,
  reporter: { id: 'user-1', username: 'testuser', avatar_url: null },
  post: { id: 'post-1', caption: 'Test', images: [] },
  target_user: null,
  restaurant: null,
};

describe('adminApi', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Pre-seed a valid auth token so getAuthHeader() resolves
    await AsyncStorage.setItem('authToken', MOCK_TOKEN);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(MOCK_TOKEN);
  });

  // ── getDashboard ───────────────────────────────────────────────────────────
  describe('getDashboard()', () => {
    it('calls GET /admin/dashboard and returns stats + chartData', async () => {
      const mockDashboard = {
        stats: {
          totalUsers: 100, totalPosts: 50, totalRestaurants: 30,
          pendingRestaurants: 5, reportedPosts: 2, newUsersToday: 3,
        },
        chartData: [],
      };
      mockedAxios.get.mockResolvedValueOnce({ data: { data: mockDashboard } });

      const result = await adminApi.getDashboard();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/dashboard'),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${MOCK_TOKEN}` }) })
      );
      expect(result.stats.totalUsers).toBe(100);
    });
  });

  // ── getUsers ───────────────────────────────────────────────────────────────
  describe('getUsers()', () => {
    it('calls GET /admin/users with pagination and search params', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [MOCK_ADMIN_USER],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        },
      });

      const result = await adminApi.getUsers({ page: 1, search: 'admin' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users'),
        expect.objectContaining({ params: { page: 1, search: 'admin' } })
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('calls GET /admin/users without params when none given', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } },
      });

      await adminApi.getUsers();
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users'),
        expect.objectContaining({ params: undefined })
      );
    });
  });

  // ── getUserById ────────────────────────────────────────────────────────────
  describe('getUserById()', () => {
    it('calls GET /admin/users/:id and returns user', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { data: MOCK_ADMIN_USER } });

      const result = await adminApi.getUserById('admin-1');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users/admin-1'),
        expect.any(Object)
      );
      expect(result.id).toBe('admin-1');
      expect(result.role).toBe('admin');
    });
  });

  // ── updateUser ─────────────────────────────────────────────────────────────
  describe('updateUser()', () => {
    it('sends PATCH /admin/users/:id with ban update', async () => {
      mockedAxios.patch.mockResolvedValueOnce({
        data: { data: { ...MOCK_ADMIN_USER, is_banned: true, ban_reason: 'Spam' }, message: 'User updated successfully' },
      });

      const result = await adminApi.updateUser('user-1', {
        is_banned:  true,
        ban_reason: 'Spam',
      });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users/user-1'),
        { is_banned: true, ban_reason: 'Spam' },
        expect.any(Object)
      );
      expect(result.message).toBe('User updated successfully');
    });

    it('sends PATCH /admin/users/:id with role change', async () => {
      mockedAxios.patch.mockResolvedValueOnce({
        data: { data: { ...MOCK_ADMIN_USER, role: 'moderator' } },
      });

      await adminApi.updateUser('user-1', { role: 'moderator' });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users/user-1'),
        { role: 'moderator' },
        expect.any(Object)
      );
    });
  });

  // ── deleteUser ─────────────────────────────────────────────────────────────
  describe('deleteUser()', () => {
    it('calls DELETE /admin/users/:id', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });

      await adminApi.deleteUser('user-1');

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users/user-1'),
        expect.any(Object)
      );
    });
  });

  // ── getPosts ───────────────────────────────────────────────────────────────
  describe('getPosts()', () => {
    it('calls GET /admin/posts with flagged filter', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [MOCK_ADMIN_POST],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        },
      });

      const result = await adminApi.getPosts({ flagged: true });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/posts'),
        expect.objectContaining({ params: { flagged: true } })
      );
      expect(result.data).toHaveLength(1);
    });
  });

  // ── deletePost ─────────────────────────────────────────────────────────────
  describe('deletePost()', () => {
    it('calls DELETE /admin/posts/:id', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });
      await adminApi.deletePost('post-1');
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/admin/posts/post-1'),
        expect.any(Object)
      );
    });
  });

  // ── flagPost ───────────────────────────────────────────────────────────────
  describe('flagPost()', () => {
    it('patches post with is_flagged=true and reason', async () => {
      mockedAxios.patch.mockResolvedValueOnce({
        data: { message: 'Post flagged successfully' },
      });

      await adminApi.flagPost('post-1', true, 'Inappropriate content');

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/posts/post-1/flag'),
        { is_flagged: true, flag_reason: 'Inappropriate content' },
        expect.any(Object)
      );
    });

    it('unflag sends is_flagged=false with no reason', async () => {
      mockedAxios.patch.mockResolvedValueOnce({
        data: { message: 'Post unflagged successfully' },
      });

      await adminApi.flagPost('post-1', false);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/posts/post-1/flag'),
        { is_flagged: false, flag_reason: undefined },
        expect.any(Object)
      );
    });
  });

  // ── getRestaurants ─────────────────────────────────────────────────────────
  describe('getRestaurants()', () => {
    it('returns paginated restaurants with status filter', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [MOCK_ADMIN_RESTAURANT],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        },
      });

      const result = await adminApi.getRestaurants({ status: 'pending' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/restaurants'),
        expect.objectContaining({ params: { status: 'pending' } })
      );
      expect(result.data[0].status).toBe('pending');
    });
  });

  // ── updateRestaurant ───────────────────────────────────────────────────────
  describe('updateRestaurant()', () => {
    it('verifies a restaurant by setting status=active and verified=true', async () => {
      mockedAxios.patch.mockResolvedValueOnce({
        data: { data: { ...MOCK_ADMIN_RESTAURANT, status: 'active', verified: true }, message: 'Restaurant updated successfully' },
      });

      const result = await adminApi.updateRestaurant('rest-1', {
        status:   'active',
        verified: true,
      });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/restaurants/rest-1'),
        { status: 'active', verified: true },
        expect.any(Object)
      );
      expect(result.message).toBe('Restaurant updated successfully');
    });

    it('can update individual fields like name and address', async () => {
      mockedAxios.patch.mockResolvedValueOnce({ data: { data: MOCK_ADMIN_RESTAURANT } });

      await adminApi.updateRestaurant('rest-1', {
        name:    'Phở Hà Nội Mới',
        address: '456 Nguyễn Huệ',
      });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/restaurants/rest-1'),
        { name: 'Phở Hà Nội Mới', address: '456 Nguyễn Huệ' },
        expect.any(Object)
      );
    });
  });

  // ── deleteRestaurant ───────────────────────────────────────────────────────
  describe('deleteRestaurant()', () => {
    it('calls DELETE /admin/restaurants/:id', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });
      await adminApi.deleteRestaurant('rest-1');
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/admin/restaurants/rest-1'),
        expect.any(Object)
      );
    });
  });

  // ── getReports ─────────────────────────────────────────────────────────────
  describe('getReports()', () => {
    it('returns pending reports by default', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [MOCK_REPORT],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        },
      });

      const result = await adminApi.getReports();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/reports'),
        expect.any(Object)
      );
      expect(result.data[0].status).toBe('pending');
    });
  });

  // ── resolveReport ──────────────────────────────────────────────────────────
  describe('resolveReport()', () => {
    it('resolves a report with a note', async () => {
      mockedAxios.patch.mockResolvedValueOnce({
        data: { data: { ...MOCK_REPORT, status: 'resolved', resolution_note: 'Removed post' }, message: 'Report resolved successfully' },
      });

      const result = await adminApi.resolveReport('report-1', 'resolved', 'Removed post');

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/reports/report-1'),
        { status: 'resolved', resolution_note: 'Removed post' },
        expect.any(Object)
      );
      expect(result.message).toContain('resolved');
    });

    it('dismisses a report without a note', async () => {
      mockedAxios.patch.mockResolvedValueOnce({
        data: { message: 'Report dismissed successfully' },
      });

      await adminApi.resolveReport('report-1', 'dismissed');

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/reports/report-1'),
        { status: 'dismissed', resolution_note: undefined },
        expect.any(Object)
      );
    });
  });

  // ── getMe ──────────────────────────────────────────────────────────────────
  describe('getMe()', () => {
    it('calls GET /admin/me and returns admin profile', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { data: MOCK_ADMIN_USER } });

      const result = await adminApi.getMe();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/me'),
        expect.any(Object)
      );
      expect(result.role).toBe('admin');
    });
  });

  // ── Auth header ────────────────────────────────────────────────────────────
  describe('Auth header injection', () => {
    it('injects Bearer token from AsyncStorage into every request', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { data: MOCK_ADMIN_USER } });

      await adminApi.getMe();

      const callArgs = mockedAxios.get.mock.calls[0];
      const headers  = callArgs[1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe(`Bearer ${MOCK_TOKEN}`);
    });
  });
});