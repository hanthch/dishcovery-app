import { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * FOOD TYPE CATEGORIES
 * These are country-based food categories used throughout the app
 */
export enum FoodType {
  VIETNAMESE = 'Món Việt',
  THAI = 'Món Thái',
  KOREAN = 'Món Hàn',
  WESTERN = 'Món Âu-Mỹ',
  JAPANESE = 'Món Nhật',
  CHINESE = 'Món Trung',
  INDIAN = 'Món Ấn',
  OTHER = 'Khác'
}

// Slug to food type mapping for URL routing
export const FOOD_TYPE_SLUG_MAP: Record<string, FoodType> = {
  'mon-viet': FoodType.VIETNAMESE,
  'mon-thai': FoodType.THAI,
  'mon-han': FoodType.KOREAN,
  'mon-au-my': FoodType.WESTERN,
  'mon-nhat': FoodType.JAPANESE,
  'mon-trung': FoodType.CHINESE,
  'mon-an': FoodType.INDIAN,
  'khac': FoodType.OTHER
};

// Reverse mapping from food type to slug
export const FOOD_TYPE_TO_SLUG: Record<string, string> = {
  [FoodType.VIETNAMESE]: 'mon-viet',
  [FoodType.THAI]: 'mon-thai',
  [FoodType.KOREAN]: 'mon-han',
  [FoodType.WESTERN]: 'mon-au-my',
  [FoodType.JAPANESE]: 'mon-nhat',
  [FoodType.CHINESE]: 'mon-trung',
  [FoodType.INDIAN]: 'mon-an',
  [FoodType.OTHER]: 'khac'
};

// Helper function to convert slug to food type
export const slugToFoodType = (slug: string): FoodType | null => {
  return FOOD_TYPE_SLUG_MAP[slug] || null;
};

export type TrendingStackParamList = {
  TrendingHome: undefined;
  TrendingSearch: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };
  RestaurantDetail: { restaurantId: string; restaurantName?: string };
};

// Helper function to convert food type to slug
export const foodTypeToSlug = (foodType: FoodType): string => {
  return FOOD_TYPE_TO_SLUG[foodType] || 'khac';
};

// List of all available food types in order
export const AVAILABLE_FOOD_TYPES: FoodType[] = [
  FoodType.VIETNAMESE,
  FoodType.THAI,
  FoodType.KOREAN,
  FoodType.WESTERN,
  FoodType.JAPANESE,
  FoodType.CHINESE,
  FoodType.INDIAN,
  FoodType.OTHER
];

export interface UserSummary {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Review {
  id: string;
  rating: number;
  text?: string;
  content?: string;
  title?: string;
  user: UserSummary;
  likes?: number;
  created_at?: string;
  images?: string[];
  dish_name?: string;
  dish_price?: string;
}

export interface LandmarkNote {
  id: string;
  text: string;
  helpful_count?: number;
  verified?: boolean;
  created_at?: string;
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export interface Restaurant {
  id: string; 
  name: string;
  
  // Location information
  address?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  
  // Food type categorization (primary - country-based)
  food_types?: FoodType[] | string[];
  
  // Deprecated fields - do not use
  cuisine?: string[];
  categories?: string[];
  
  // Images (from Cloudinary)
  cover_image?: string;
  image_url?: string;
  photos?: string[];
  images?: string[];
  has_images?: boolean;
  
  // Ratings
  rating?: number;
  rating_count?: number;
  
  // Price information
  price_range?: string;
  priceRange?: string;
  price_display?: string;
  
  // Verification status
  verified?: boolean;
  status?: 'verified' | 'unverified';
  
  // Hours
  opening_hours?: string;
  
  // Special notes for hard-to-find locations
  landmark_notes?: string | LandmarkNote[];
  landmarkNotes?: string | LandmarkNote[];
  
  // Ranking and activity
  top_rank_this_week?: number; 
  topRankThisWeek?: number;
  rank?: number; 
  weekly_activity?: number; 
  posts_count?: number; 
  
  // Metadata
  created_at?: string; 
  top_reviews?: Review[]; 
  is_saved?: boolean; 
}

/**
 * SEARCH & FILTER TYPES
 */
export interface RestaurantFilters {
  searchQuery?: string;
  category?: string;
  minRating?: number;
  maxPrice?: string;
  isOpen?: boolean;
  isVerified?: boolean;
}

export interface SearchResult {
  type: 'post' | 'user' | 'restaurant' | 'hashtag';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  landmark?: string;
  data: any;
}

export interface SearchUser {
  id: string;
  username: string;
  avatar_url: string;
  followers_count: number;
  posts_count: number;
}

export type RestaurantStackParamList = {
  RestaurantHome: undefined;
  Top10: undefined;
  Category: { type: 'top10' | 'category'; category?: string; title: string };
  RestaurantDetail: { restaurantId: string; restaurantName?: string };
  RestaurantSearch: undefined;
};

export type RootStackParamList = RestaurantStackParamList & TrendingStackParamList;

export type RestaurantNavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;
export type TrendingNavigationProp = NativeStackNavigationProp<TrendingStackParamList>;

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export interface SearchResponse {
  data: SearchResult[];
  page?: number;
  hasMore?: boolean;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  filter: 'all' | 'newest' | 'popular';
  recentSearches: string[];
}

export interface RestaurantSearchState {
  query: string;
  results: Restaurant[];
  loading: boolean;
  recentSearches: string[];
}

export interface FrontendFilters {
  priceRanges: string[];
  cuisines: string[];
  ratings: number[];
}

export interface BackendFilterParams {
  type?: string;
  price?: string;
  cuisine?: string;
  rating?: number;
}

export function slugToFoodTypeString(slug: string): string {
  const foodType = slugToFoodType(slug);
  return foodType || 'Khác';
}

export function convertFiltersToBackendParams(
  filters: FrontendFilters
): BackendFilterParams {
  const params: BackendFilterParams = {};

  if (filters.priceRanges.length > 0) {
    const priceMap: { [key: string]: string } = {
      'under-30k': 'Dưới 30k',
      '30k-50k': '30k-50k',
      '50k-100k': '50k-100k',
      'over-100k': 'Trên 100k',
    };

    params.price = filters.priceRanges
      .map((p) => priceMap[p] || p)
      .join(',');
  }

  if (filters.cuisines.length > 0) {
    const cuisineMap: { [key: string]: string } = {
      'western': 'Âu-Mỹ',
      'korean': 'Hàn',
      'japanese': 'Nhật',
      'chinese': 'Trung',
      'vietnamese': 'Việt',
      'mexican': 'Mexico',
      'italian': 'Ý',
      'indian': 'Ấn',
      'thai': 'Thái',
      'other': 'Khác',
    };

    params.cuisine = filters.cuisines
      .map((c) => cuisineMap[c] || c)
      .join(',');
  }

  if (filters.ratings.length > 0) {
    params.rating = Math.min(...filters.ratings);
  }

  return params;
}