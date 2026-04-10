export type UniversalSearchSort = 'newest' | 'popular';

export type RestaurantSearchSort =
  | 'relevance'
  | 'rating'
  | 'price';

export interface RestaurantSearchFilters {
  query?: string;
  category?: string;
  cuisine?: string[];
  minRating?: number;
  maxPrice?: string;
  isOpen?: boolean;
  isVerified?: boolean;
  sort?: RestaurantSearchSort;
}

export interface RestaurantSearchResult {
  id: string;
  name: string;
  address: string | null;
  cuisine: string[];
  food_types: string[];
  rating: number | null;
  rating_count: number;
  price_range: string | null;
  cover_image: string | null;
  image_url: string | null;
  photos: string[];
  images: string[];
  verified: boolean;
  status: string;
  top_rank_this_week: number | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  landmark_notes: LandmarkNote[] | null;
}

export interface UniversalSearchFilters {
  query?: string;
  hashtag?: string;
  type?: 'post' | 'user' | 'restaurant' | 'hashtag' | 'all';
  sort?: UniversalSearchSort;
}


export interface PostSearchResult {
  type: 'post';
  id: string;
  title: string;    
  subtitle: string; 
  image: string | null;
  data: Post;
}

export interface UserSearchResult {
  type: 'user';
  id: string;
  title: string;    
  subtitle: string; 
  image: string | null;
  data: SearchUser;
}

export interface HashtagSearchResult {
  type: 'hashtag';
  id: string;
  title: string; 
  subtitle: string; 
  data: {
    tag: string;
    count: number;
  };
}

export interface RestaurantUniversalSearchResult {
  type: 'restaurant';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  data: RestaurantSearchResult;
}

export type UniversalSearchResult =
  | PostSearchResult
  | UserSearchResult
  | HashtagSearchResult
  | RestaurantUniversalSearchResult;

export interface SearchResult {
  type: 'post' | 'restaurant' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  landmark?: string | null;
  data: any;
}
export interface RestaurantSearchState {
  query: string;
  results: RestaurantSearchResult[];
  loading: boolean;
  recentSearches: string[];
  filters: RestaurantSearchFilters;
}

export interface UniversalSearchState {
  query: string;
  results: UniversalSearchResult[];
  loading: boolean;
  recentSearches: string[];
  filters: UniversalSearchFilters;
}


export interface SearchUser {
  id: string;
  username: string;
  avatar_url: string;
  bio?: string;
  followers_count: number;
  posts_count: number;
}

export interface Post {
  id: string;
  caption: string;
  image_url: string | null;
  restaurant_id?: string;
  restaurant?: {
    id: string;
    name: string;
    address?: string | null;
  };
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  likes_count: number;
  comments_count?: number;
  created_at: string;
}

export interface LandmarkNote {
  id?: string;
  text: string;
  content?: string;
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}


export interface PostSearchParams {
  q?: string;
  hashtag?: string;
  sort?: 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface PaginatedPostResponse {
  data: Post[];
  page: number;
}