import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export enum FoodType {
  // Country cuisines
  VIETNAMESE = 'Món Việt',
  THAI       = 'Món Thái',
  KOREAN     = 'Món Hàn',
  WESTERN    = 'Món Âu-Mỹ',
  JAPANESE   = 'Món Nhật',
  CHINESE    = 'Món Trung',
  INDIAN     = 'Món Ấn',
  OTHER      = 'Khác',
  // Dish / meal format
  BUN_PHO      = 'Bún & Phở',
  COM_CHAO     = 'Cơm & Cháo',
  BANH_MI      = 'Bánh mì',
  LAU_NUONG    = 'Lẩu & Nướng',
  HAI_SAN      = 'Hải sản',
  AN_VAT       = 'Ăn vặt',
  TRANG_MIENG  = 'Tráng miệng',
  CHAY         = 'Món chay',
  // Drinks
  CAFE     = 'Café',
  DO_UONG  = 'Đồ uống',
  TRA_SUA  = 'Trà sữa',
  NUOC_EP  = 'Nước ép',
  SINH_TO  = 'Sinh tố',
}

export const FOOD_TYPE_SLUG_MAP: Record<string, FoodType> = {
  'mon-viet':    FoodType.VIETNAMESE,
  'mon-thai':    FoodType.THAI,
  'mon-han':     FoodType.KOREAN,
  'mon-au-my':   FoodType.WESTERN,
  'mon-nhat':    FoodType.JAPANESE,
  'mon-trung':   FoodType.CHINESE,
  'mon-an':      FoodType.INDIAN,
  'khac':        FoodType.OTHER,
  'bun-pho':     FoodType.BUN_PHO,
  'com-chien':   FoodType.COM_CHAO,
  'banh-mi':     FoodType.BANH_MI,
  'lau-nuong':   FoodType.LAU_NUONG,
  'hai-san':     FoodType.HAI_SAN,
  'an-vat':      FoodType.AN_VAT,
  'trang-mieng': FoodType.TRANG_MIENG,
  'chay':        FoodType.CHAY,
  'cafe':        FoodType.CAFE,
  'do-uong':     FoodType.DO_UONG,
  'tra-sua':     FoodType.TRA_SUA,
  'nuoc-ep':     FoodType.NUOC_EP,
  'sinh-to':     FoodType.SINH_TO,
};

export const FOOD_TYPE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(FOOD_TYPE_SLUG_MAP).map(([slug, value]) => [value, slug])
);

export const slugToFoodType = (slug: string): FoodType | null =>
  FOOD_TYPE_SLUG_MAP[slug] || null;

export const foodTypeToSlug = (foodType: FoodType): string =>
  FOOD_TYPE_TO_SLUG[foodType] || 'khac';

export function slugToFoodTypeString(slug: string): string {
  return slugToFoodType(slug) || 'Khác';
}

export const AVAILABLE_FOOD_TYPES: FoodType[] = Object.values(FoodType);

export const PRICE_SLUG_TO_DB: Record<string, string> = {
  'under-30k':  'Dưới 30k VND',
  '30k-50k':    '30k - 80k VND',
  '50k-100k':   '80k - 150k VND',
  'over-100k':  'Trên 150k VND',
  'binh-dan':   'Dưới 30k VND',
  'gia-hop-ly': '30k - 80k VND',
  'tam-trung':  '80k - 150k VND',
  'cao-cap':    'Trên 150k VND',
};

export const PRICE_SLUG_LABEL: Record<string, string> = {
  'binh-dan':   'Bình dân (Dưới 30k)',
  'gia-hop-ly': 'Hợp lý (30k – 80k)',
  'tam-trung':  'Tầm trung (80k – 150k)',
  'cao-cap':    'Cao cấp (Trên 150k)',
  'under-30k':  'Dưới 30k',
  '30k-50k':    '30k – 80k',
  '50k-100k':   '80k – 150k',
  'over-100k':  'Trên 150k',
};

export type CategorySlug =
  | 'mon-viet' | 'mon-thai' | 'mon-han' | 'mon-au-my'
  | 'mon-nhat' | 'mon-trung' | 'mon-an' | 'khac'
  | 'bun-pho' | 'com-chien' | 'banh-mi' | 'lau-nuong'
  | 'hai-san' | 'an-vat' | 'trang-mieng' | 'chay'
  | 'cafe' | 'do-uong' | 'tra-sua' | 'nuoc-ep' | 'sinh-to'
  | 'binh-dan' | 'gia-hop-ly' | 'tam-trung' | 'cao-cap'
  | 'top-rated' | 'moi-nhat' | 'verified' | 'nuoc-ngoai';

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
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;

  food_types?: FoodType[] | string[];
  cuisine?: string[];
  categories?: string[];

  cover_image?: string;
  image_url?: string;
  photos?: string[];
  images?: string[];
  has_images?: boolean;

  rating?: number;
  rating_count?: number;

  price_range?: string;
  priceRange?: string;

  verified?: boolean;
  status?: 'active' | 'pending' | 'rejected' | 'closed' | 'verified' | 'unverified';

  opening_hours?: string;

  landmark_notes?: string | LandmarkNote[];
  landmarkNotes?: string | LandmarkNote[];

  top_rank_this_week?: number;
  topRankThisWeek?: number;
  rank?: number;
  weekly_activity?: number;
  posts_count?: number;

  created_at?: string;
  top_reviews?: Review[];
  is_saved?: boolean;
}

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
  image?: string | null;
  landmark?: string | null;
  data: any;
}

export interface SearchUser {
  id: string;
  username: string;
  avatar_url: string;
  followers_count: number;
  posts_count: number;
}

export type TrendingStackParamList = {
  TrendingHome: undefined;
  TrendingSearch: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };
  RestaurantDetail: { restaurantId: string; restaurantName?: string };
};

export type RestaurantStackParamList = {
  RestaurantHome: undefined;
  Top10: undefined;
  Category: { type: 'top10' | 'category'; category?: string; title: string };
  RestaurantDetail: {
    restaurantId: string;
    restaurantName?: string;
    isNew?: boolean;
    newRestaurantData?: Restaurant;
  };
  RestaurantSearch:
    | { initialQuery?: string; initialFilters?: FrontendFilters }
    | undefined;
};

export const API_PATHS = {
  SAVED_RESTAURANTS: '/users/me/saved-restaurants',
  SAVED_POSTS:       '/users/me/saved-posts',
  RESTAURANT_SEARCH: '/restaurants/search',
} as const;

export type RootStackParamList = RestaurantStackParamList & TrendingStackParamList;
export type RestaurantNavigationProp = NativeStackNavigationProp<RestaurantStackParamList>;
export type TrendingNavigationProp   = NativeStackNavigationProp<TrendingStackParamList>;

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
  rating?: number;
}

export function convertFiltersToBackendParams(
  filters: FrontendFilters
): BackendFilterParams {
  const params: BackendFilterParams = {};

  if (filters.priceRanges.length > 0) {
    // Map frontend slugs → DB canonical values
    const dbPrices = filters.priceRanges.map(s => PRICE_SLUG_TO_DB[s] || s);
    params.price = dbPrices.join(',');
  }

  if (filters.cuisines.length > 0) {
    // Map cuisine slugs → DB food_types values
    const dbTypes = filters.cuisines.map(s => {
      const ft = slugToFoodType(s);
      return ft || s;
    });
    params.type = dbTypes.join(',');
  }

  if (filters.ratings.length > 0) {
    params.rating = Math.min(...filters.ratings);
  }

  return params;
}