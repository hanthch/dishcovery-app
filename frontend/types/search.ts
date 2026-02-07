/* ============================================================================
   SEARCH SYSTEM OVERVIEW

   1. Restaurant Search
      - Used in: Restaurants tab
      - Endpoint: GET /api/v1/restaurants/search
      - Purpose: Find places to eat
      - Result type: Restaurants only (homogeneous)

   2. Universal Search
      - Used in: Trending tab
      - Endpoint: GET /api/v1/search
      - Purpose: Discover content
      - Result type: Mixed (heterogeneous)
============================================================================ */

/* ============================================================================
   SORT TYPES
============================================================================ */

export type UniversalSearchSort = 'newest' | 'popular';

export type RestaurantSearchSort =
  | 'relevance'
  | 'rating'
  | 'price';

/* ============================================================================
   RESTAURANT SEARCH
============================================================================ */

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
  address: string;
  cuisine: string[];
  food_types?: string[];
  rating: number;
  ratingCount: number;
  priceRange: string;
  status?: 'verified' | 'unverified';
  topRankThisWeek?: number;
  images?: string[];
  photos?: string[];
  landmarkNotes?: string | LandmarkNote[];
}

/* ============================================================================
   UNIVERSAL SEARCH (FEDERATED)
============================================================================ */

export interface UniversalSearchFilters {
  query?: string;
  hashtag?: string;
  type?: 'post' | 'user' | 'restaurant' | 'hashtag' | 'all';
  sort?: UniversalSearchSort;
}

/* --- Discriminated Result Types --- */

export interface PostSearchResult {
  type: 'post';
  id: string;
  title: string; // caption
  subtitle: string; // restaurant name
  image: string;
  data: Post;
}

export interface UserSearchResult {
  type: 'user';
  id: string;
  title: string; // username
  subtitle: string; // bio / follower count
  image: string;
  data: SearchUser;
}

export interface HashtagSearchResult {
  type: 'hashtag';
  id: string;
  title: string; // #hashtag
  subtitle: string; // post count
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

/* ============================================================================
   SEARCH STATE (ZUSTAND / REDUX)
============================================================================ */
export interface SearchResult {
  type: 'post' | 'restaurant' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  landmark?: string;
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

/* ============================================================================
   SHARED / HELPER TYPES
============================================================================ */

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
  image_url: string;
  restaurant_id?: string;
  restaurant?: {
    id: string;
    name: string;
    address: string;
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

export interface PlaceSearchResult  {
      type: 'restaurant';
      id: number;
      name: string;
      address: string;
      lat: number;
      lng: number;
    }
  export interface OSMPlaceSearchResult  {
      type: 'osm';
      place_id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
    };


export interface PostSearchParams {
  q?: string;
  hashtag?: string;
  sort?: 'new' | 'popular';
  page?: number;
  limit?: number;
}

export interface PaginatedPostResponse {
  data: Post[];
  page: number;
}