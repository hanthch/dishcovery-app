import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  address?: string;
  cover_image?: string;
  image_url?: string;
  photos?: string[];
  images?: string[];
  
  cuisine?: string[];
  food_types?: string[];
  categories?: string[];
  
  rating?: number;
  rating_count?: number;
  
  price_range?: string;
  priceRange?: string;
  
  status?: 'verified' | 'unverified';
  verified?: boolean;
  
  opening_hours?: string;
  
  landmark_notes?: string | LandmarkNote[];
  landmarkNotes?: string | LandmarkNote[];
  
  top_rank_this_week?: number;
  topRankThisWeek?: number;
  
  weekly_activity?: number;
  posts_count?: number;
  
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
      'hidden-gem': 'Quán ẩn mình',
      'via-he': 'Quán vỉa hè',
      'nup-hem': 'Quán núp hẻm',
      'chay': 'Quán chay',
      'sang-trong': 'Quán sang trọng',
      'binh-dan': 'Quán bình dân',
      'an-khuya': 'Quán ăn khuya',
      'street-food': 'Quán vỉa hè',
      'fancy': 'Quán sang trọng',
      'student-friendly': 'Quán bình dân',
      'long-standing': 'Quán lâu đời',
      'late-night': 'Quán ăn khuya',
      'vegan': 'Quán chay',
      'breakfast': 'Quán ăn sáng',
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
