import { Platform } from 'react-native';

export const COLORS = {
  // Primary - Warm orange for food/discovery vibes
  primary: '#FF8C42',
  primaryLight: '#FFB380',
  primaryDark: '#E67E2F',

  // Secondary - Soft coral/pink for accents
  secondary: '#FF6B9D',

  // Neutrals
  background: '#FFFFFF',
  surface: '#F8F8F8',
  border: '#E8E8E8',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',

  // Semantic
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Social actions
  like: '#FF4458',
  save: '#FFB800',
  comment: '#3B82F6',
  share: '#6366F1',
};

export const TYPOGRAPHY = {
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
} as const; // Added 'as const' to fix the FontWeight TypeScript errors globally

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 9999,
};

export const API_ENDPOINTS = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.dishcovery.vn',
  
  // Authentication
  AUTH_SIGNUP: '/auth/signup',
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_VERIFY_CODE: '/auth/verify-code',
  AUTH_RESEND_CODE: '/auth/resend-code',

  // Posts
  POSTS_TRENDING: '/posts/trending',
  POSTS: '/posts',
  POST_DETAIL: (id: string) => `/posts/${id}`,
  POST_LIKE: (id: string) => `/posts/${id}/like`,
  POST_UNLIKE: (id: string) => `/posts/${id}/unlike`,
  POST_SAVE: (id: string) => `/posts/${id}/save`,
  POST_UNSAVE: (id: string) => `/posts/${id}/unsave`,
  POST_COMMENTS: (id: string) => `/posts/${id}/comments`,

  // Restaurants
  RESTAURANT_NEARBY: '/restaurants/nearby',
  RESTAURANT_SEARCH: '/restaurants/search',
  RESTAURANT_DETAIL: (id: string) => `/restaurants/${id}`,
  RESTAURANT_SAVE: (id: string) => `/restaurants/${id}/save`,
  RESTAURANT_UNSAVE: (id: string) => `/restaurants/${id}/unsave`,

  // Locations
  LOCATIONS_NEARBY: '/locations/nearby',
  LOCATIONS_SEARCH: '/locations/search',

  // Landmark notes
  LANDMARK_NOTES: (restaurantId: string) => `/restaurants/${restaurantId}/landmark-notes`,
  LANDMARK_NOTE_CREATE: (restaurantId: string) => `/restaurants/${restaurantId}/landmark-notes`,
  LANDMARK_NOTE_LIKE: (restaurantId: string, noteId: string) => 
    `/restaurants/${restaurantId}/landmark-notes/${noteId}/like`,

  // Search
  SEARCH: '/search',
  SEARCH_POSTS: '/search/posts',
  SEARCH_USERS: '/search/users',
  SEARCH_RESTAURANTS: '/search/restaurants',

  // Users
  USER_PROFILE: (id: string) => `/users/${id}`,
  USER_POSTS: (id: string) => `/users/${id}/posts`, // Added to fix the API error
  USER_FOLLOW: (id: string) => `/users/${id}/follow`,
  USER_UNFOLLOW: (id: string) => `/users/${id}/unfollow`,
  USER_FOLLOWERS: (id: string) => `/users/${id}/followers`,
  USER_FOLLOWING: (id: string) => `/users/${id}/following`,
  USER_SAVED_POSTS: '/users/me/saved/posts',
  USER_SAVED_RESTAURANTS: '/users/me/saved/restaurants',

  // Challenges
  CHALLENGES: '/challenges',
  CHALLENGE_DETAIL: (id: string) => `/challenges/${id}`,
  CHALLENGE_JOIN: (id: string) => `/challenges/${id}/join`,
  CHALLENGE_LEAVE: (id: string) => `/challenges/${id}/leave`,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_PROFILE: 'userProfile',
  SEARCH_HISTORY: 'searchHistory',
};

export const FILTER_OPTIONS = [
  { id: 'all', label: 'Tất cả', icon: 'flame' },
  { id: 'nearby', label: 'Gần đây', icon: 'map-pin' },
  { id: 'latest', label: 'Mới nhất', icon: 'clock' },
  { id: 'following', label: 'Theo dõi', icon: 'heart' },
  { id: 'challenge', label: 'Challenge', icon: 'trophy' },
];

export const VIETNAMESE_TEXT = {
  trending: 'Trending',
  trendingSubtitle: 'Mọi người đang ăn gì?',
  searchPlaceholder: 'Tìm người, bài viết, món ăn…',
  newPost: 'Tạo bài viết',
  selectRestaurant: 'Tìm quán bạn đang ăn…',
  addRestaurant: 'Thêm quán mới',
  landmarkNotes: 'Cách tìm quán (không bắt buộc)',
  landmarkHelp: 'Giúp người khác dễ tìm quán hơn',
  postButton: 'Đăng',
  posting: 'Đang đăng…',
  postSuccess: 'Đã đăng',
  findNearby: 'Tìm quán gần đây',
  allowLocation: 'Cho phép ứng dụng sử dụng vị trí của bạn?',
  allowOnce: 'Cho phép lần này',
  allowWhileUsing: 'Cho phép khi sử dụng ứng dụng',
  dontAllow: 'Không cho phép',
  saved: 'Đã lưu',
  saveRestaurant: 'Lưu quán',
  unsave: 'Bỏ lưu',
  like: 'Thích',
  comment: 'Bình luận',
  share: 'Chia sẻ',
  followers: 'Người theo dõi',
  following: 'Đang theo dõi',
  follow: 'Theo dõi',
  unfollow: 'Bỏ theo dõi',
  profilePosts: 'Bài viết',
  savedPosts: 'Bài viết đã lưu',
  savedRestaurants: 'Quán đã lưu',
  notifications: 'Thông báo',
  notificationsHint: 'Xem thông báo của bạn',
  loading: 'Đang tải bài viết...',
  errorLoading: 'Không thể tải bài viết',
  retry: 'Thử lại',
  noPosts: 'Chưa có bài viết nào',
  exploreOtherPosts: 'Khám phá bài viết khác',
  search: 'Tìm kiếm',
  searchHint: 'Nhấn để tìm kiếm bài viết, người dùng, nhà hàng',
};