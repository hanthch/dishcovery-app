export interface Post {
  id: string;
  caption?: string | null;

  image_url?: string | null;
  images?: string[];

  likes_count:    number;
  comments_count: number;
  saves_count:    number;

  is_trending?: boolean;
  is_liked?:    boolean;
  is_saved?:    boolean;
  is_flagged?:  boolean;   // needed by AdminPosts card
  flag_reason?: string | null;

  // Timestamps
  created_at:  string;
  updated_at?: string | null;

  user: {
    id:          string;
    username:    string;
    /**
     * FIX: Backend normalizePost sends `full_name` directly on the user object
     * (from profiles join). Always use `full_name` for display names — never `name`.
     */
    full_name?:  string | null;
    avatar_url:  string | null;
  };

  restaurant?: {
    id:               string;
    name:             string;
    address?:         string | null;
    cover_image?:     string | null;
    /**
     * FIX: Backend normalizePost always populates google_maps_url
     * (auto-generated from lat/lng or name+address if not stored).
     * Typed as string | null so PostCard can guard before opening the link.
     */
    google_maps_url?: string | null;
    food_types?:      string[];
    rating?:          number | null;
    photos?:          string[];
    image_url?:       string | null;
    images?:          string[];
  } | null;

  restaurant_id?: string;

  /**
   * FIX: is_following is serialised as the string literal 'true' or 'false'
   * by the backend (normalizePost). PostCard reads it with
   *   initialFollowing={post.is_following === 'true'}
   * which correctly converts both the string 'true' and the string 'false'
   * to a boolean. Never send or compare this field as a real boolean.
   */
  is_following?: string;
}

export interface Comment {
  id:         string;
  content:    string;
  created_at: string;
  user: {
    id:          string;
    username:    string;
    full_name?:  string | null;
    avatar_url:  string | null;
  };
}

export interface LocationTag {
  name:             string;
  address?:         string;
  lat?:             number | null;
  lng?:             number | null;
  google_maps_url?: string | null;
}

export interface CreatePostPayload {
  caption?:       string;
  images?:        string[];
  restaurantId?:  string | null;   // UUID string — used as FK in DB
  newRestaurant?: NewRestaurantPayload;
  location?:      LocationTag;
}

export interface NewRestaurantPayload {
  isNew:            true;
  name:             string;
  address:          string;
  openingHours?:    string;
  cuisine?:         string[];       // food_types array
  price_range?:     number;         // integer 1-4 → mapped by mapPriceRange()
  landmark_notes?:  string;
  lat?:             number | null;
  lng?:             number | null;
}

export interface PostLike {
  id:               string;
  username:         string;
  full_name?:       string | null;
  avatar_url?:      string | null;
  followers_count?: number;
}

export interface PostLikesResponse {
  data:    PostLike[];
  page:    number;
  hasMore: boolean;
  total:   number;
}