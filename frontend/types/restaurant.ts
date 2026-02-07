import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export interface UserSummary {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Review {
  id: string;
  rating: number;
  text: string;
  user: UserSummary;
  likes: number;
  created_at?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  photos?: string[];
  images?: string[];
  
  // FIX: Support both naming conventions from your DB
  cuisine?: string[];
  food_types?: string[];
  categories?: string[];
  
  rating: number;
  rating_count?: number; 
  
  // FIX: Support both snake_case and camelCase
  price_range?: string;
  priceRange?: string;
  
  status?: 'verified' | 'unverified';
  verified?: boolean;
  opening_hours?: string; 
  
  // FIX: Support both naming conventions
  landmark_notes?: string;
  
  // FIX: Support both naming conventions
  top_rank_this_week?: number;
  topRankThisWeek?: number;
  
  weekly_activity?: number;
  google_maps_url?: string;
  latitude?: number;  
  longitude?: number;
  created_at?: string;
  top_reviews?: Review[]; 
  is_saved?: boolean;
  category?: string;    
  price_display?: string;
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

export type TrendingStackParamList = {
  TrendingHome: undefined;
  TrendingSearch: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };
};

export type RootStackParamList = RestaurantStackParamList & TrendingStackParamList;

export type RestaurantNavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;
export type TrendingNavigationProp = NativeStackNavigationProp<TrendingStackParamList>;

/**
 * API & UI STATE TYPES
 */
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
  types: string[];
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


export function convertFiltersToBackendParams(
  filters: FrontendFilters
): BackendFilterParams {
  const params: BackendFilterParams = {};

  if (filters.types.length > 0) {
    const typeMap: { [key: string]: string } = {
      'hidden-gem': 'hidden-gem',
      'street-food': 'street-food',
      'fancy': 'luxury',
      'student-friendly': 'student-friendly',
      'long-standing': 'long-standing',
      'late-night': 'late-night',
      'vegan': 'vegetarian',
      'breakfast': 'breakfast',
    };

    const mappedTypes = filters.types
      .map((t) => typeMap[t] || t)
      .join(',');
    
    params.type = mappedTypes;
  }

  if (filters.priceRanges.length > 0) {
    const priceMap: { [key: string]: string } = {
      'under-30k': 'Dưới 30k',
      '30k-50k': '30k-50k',
      '50k-100k': '50k-100k',
      'over-100k': 'Trên 100k',
    };

    const mappedPrices = filters.priceRanges
      .map((p) => priceMap[p] || p)
      .join(',');
    
    params.price = mappedPrices;
  }

  if (filters.cuisines.length > 0) {
    const cuisineMap: { [key: string]: string } = {
      'american': 'Âu-Mỹ',
      'korean': 'Hàn',
      'japanese': 'Nhật',
      'chinese': 'Trung',
      'vietnamese': 'Việt',
      'indian': 'Ấn',
      'thai': 'Thái',
      'other': 'Khác',
    };

    const mappedCuisines = filters.cuisines
      .map((c) => cuisineMap[c] || c)
      .join(',');
    
    params.cuisine = mappedCuisines;
  }

  if (filters.ratings.length > 0) {
    params.rating = Math.min(...filters.ratings);
  }

  return params;
}

