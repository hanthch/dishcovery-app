import { Platform } from 'react-native';

// ── Colors ────────────────────────────────────────────────────────────────────
export const COLORS = {
  // Primary — warm orange (food/discovery)
  primary:      '#FF8C42',
  primaryLight: '#FFB380',
  primaryDark:  '#E67E2F',

  // Secondary — soft coral/pink
  secondary: '#FF6B9D',

  // Neutrals
  background:     '#FFFFFF',
  surface:        '#F8F8F8',
  border:         '#E8E8E8',
  text:           '#1A1A1A',
  textSecondary:  '#666666',
  textTertiary:   '#999999',

  // Semantic
  success: '#10B981',
  error:   '#EF4444',
  warning: '#F59E0B',
  info:    '#3B82F6',

  // Social actions
  like:    '#FF4458',
  save:    '#FF8C42',   // brand orange (was '#FFB800' — inconsistent)
  comment: '#3B82F6',
  share:   '#6366F1',
} as const;

export const TYPOGRAPHY = {
  title: {
    fontSize:   24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  subtitle: {
    fontSize:   18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontSize:   14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize:   12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize:   11,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
} as const;

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const;

export const BORDER_RADIUS = {
  sm:   6,
  md:   12,
  lg:   16,
  full: 9999,
} as const;

export const API_ENDPOINTS = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.dishcovery.app/api/v1',

  AUTH_REGISTER:       '/auth/register',        // POST
  AUTH_LOGIN:          '/auth/login',           // POST
  AUTH_LOGOUT:         '/auth/logout',          // POST
  AUTH_ME:             '/auth/me',              // GET  (requireAuth)
  AUTH_FORGOT_PASSWORD:'/auth/forgot-password', // POST
  AUTH_VERIFY_CODE:    '/auth/verify-code',     // POST
  AUTH_RESET_PASSWORD: '/auth/reset-password',  // POST

  POSTS:               '/posts',                        // GET (feed) | POST (create)
  POSTS_TRENDING:      '/posts/trending',               // GET ?page=&filter=
  POSTS_SEARCH:        '/posts/search',                 // GET ?q=&hashtag=&sort=&page=&limit=
  POST_DETAIL: (id: string) => `/posts/${id}`,  // GET
  POST_LIKE: (id: string) => `/posts/${id}/like`,   // POST | DELETE
  POST_SAVE: (id: string) => `/posts/${id}/save`,   // POST | DELETE
  POST_COMMENTS: (id: string) => `/posts/${id}/comments`, // GET | POST
  POST_LIKES: (id: string) => `/posts/${id}/likes`,
  RESTAURANTS:             '/restaurants',              // GET ?page=&limit=&...filters
  RESTAURANTS_TOP_RATED:   '/restaurants/top-rated',   // GET
  RESTAURANTS_CATEGORY:    (slug: string) => `/restaurants/category/${slug}`, // GET
  RESTAURANTS_MARKETS:     '/restaurants/markets/list',// GET
  RESTAURANT_DETAIL:       (id: string) => `/restaurants/${id}`,              // GET
  RESTAURANT_LANDMARK_NOTES: (id: string) => `/restaurants/${id}/landmark-notes`, // GET
  RESTAURANT_IS_SAVED:     (id: string) => `/restaurants/${id}/is-saved`,    // GET
  RESTAURANT_SAVE:         (id: string) => `/restaurants/${id}/save`,        // POST
  RESTAURANT_UNSAVE:       (id: string) => `/restaurants/${id}/unsave`,      // POST

  // ── Places (places.js) ─────────────────────────────────────────────────────
  PLACES_SEARCH:     '/places/search',          // GET ?q=
  PLACES_DUPLICATE:  '/places/check-duplicate', // GET ?name=&address=

  SEARCH:            '/search',                 // GET ?q=&limit=&sort=

  USER_ME:                  '/users/me',                           // GET (requireAuth)
  USER_ME_SAVED_POSTS:      '/users/me/saved-posts',               // GET
  USER_ME_SAVED_RESTAURANTS:'/users/me/saved-restaurants',         // GET
  USER_PROFILE:             (id: string) => `/users/${id}`,        // GET (optionalAuth)
  USER_POSTS:               (id: string) => `/users/${id}/posts`,  // GET
  USER_FOLLOW:              (id: string) => `/users/${id}/follow`,   // POST
  USER_UNFOLLOW:            (id: string) => `/users/${id}/unfollow`, // POST
  USER_FOLLOWERS:           (id: string) => `/users/${id}/followers`,// GET
  USER_FOLLOWING:           (id: string) => `/users/${id}/following`,// GET

  // ── Upload (upload.js) ─────────────────────────────────────────────────────
  UPLOAD:            '/upload',                 // POST multipart/form-data field:'file'

  // ── Reports ────────────────────────────────────────────────────────────────
  REPORTS:           '/reports',                // POST

  // ── Admin (admin.js) ───────────────────────────────────────────────────────
  ADMIN_DASHBOARD:   '/admin/dashboard',
  ADMIN_USERS:       '/admin/users',
  ADMIN_POSTS:       '/admin/posts',
  ADMIN_RESTAURANTS: '/admin/restaurants',
  ADMIN_REPORTS:     '/admin/reports',
  ADMIN_ME:          '/admin/me',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN:     'authToken',   // must match TOKEN_KEY in Api.service.ts
  USER_PROFILE:   'userData',    // must match USER_KEY  in Api.service.ts
  SEARCH_HISTORY: 'searchHistory',
} as const;

export const FILTER_OPTIONS = [
  { id: 'all',       label: 'Tất cả',     icon: 'flame'   },
  { id: 'nearby',    label: 'Gần đây',    icon: 'map-pin' },
  { id: 'latest',    label: 'Mới nhất',   icon: 'clock'   },
  { id: 'following', label: 'Theo dõi',   icon: 'heart'   },
  { id: 'challenge', label: 'Challenge',  icon: 'trophy'  },
] as const;

// ── Vietnamese UI strings ─────────────────────────────────────────────────────
export const VIETNAMESE_TEXT = {
  trending:           'Trending',
  trendingSubtitle:   'Mọi người đang ăn gì?',
  searchPlaceholder:  'Tìm người, bài viết, món ăn…',
  newPost:            'Tạo bài viết',
  selectRestaurant:   'Tìm quán bạn đang ăn…',
  addRestaurant:      'Thêm quán mới',
  landmarkNotes:      'Cách tìm quán (không bắt buộc)',
  landmarkHelp:       'Giúp người khác dễ tìm quán hơn',
  postButton:         'Đăng',
  posting:            'Đang đăng…',
  postSuccess:        'Đã đăng',
  findNearby:         'Tìm quán gần đây',
  saved:              'Đã lưu',
  saveRestaurant:     'Lưu quán',
  unsave:             'Bỏ lưu',
  like:               'Thích',
  comment:            'Bình luận',
  share:              'Chia sẻ',
  followers:          'Người theo dõi',
  following:          'Đang theo dõi',
  follow:             'Theo dõi',
  unfollow:           'Bỏ theo dõi',
  profilePosts:       'Bài viết',
  savedPosts:         'Bài viết đã lưu',
  savedRestaurants:   'Quán đã lưu',
  notifications:      'Thông báo',
  loading:            'Đang tải bài viết...',
  errorLoading:       'Không thể tải bài viết',
  retry:              'Thử lại',
  noPosts:            'Chưa có bài viết nào',
  exploreOtherPosts:  'Khám phá bài viết khác',
  search:             'Tìm kiếm',
  searchHint:         'Nhấn để tìm kiếm bài viết, người dùng, nhà hàng',
} as const;