// ─── types/post.ts ────────────────────────────────────────────────────────────
// Must match normalizePost() output in backend/routes/posts.js and users.js
//
// normalizePost() returns:
//   id, caption, image_url, images, likes_count, comments_count,
//   saves_count, is_trending, created_at, updated_at,
//   user, restaurant, is_liked, is_saved

export type LocationTag = {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  google_maps_url?: string;
};

export interface Post {
  id: string;
  caption?: string | null;

  // image_url = images[0], set by normalizePost() — PostCard reads this field
  image_url?: string | null;
  images?: string[];

  // Counts — normalizePost() sets all with || 0 fallback
  likes_count?: number;
  comments_count?: number;
  saves_count?: number;       // ← was missing, posts.js normalizePost sets it

  // Flags
  is_trending?: boolean;      // ← was missing, posts.js normalizePost sets it
  is_liked?: boolean;
  is_saved?: boolean;

  // Timestamps
  created_at: string;
  updated_at?: string | null; // ← was missing, posts.js normalizePost sets it

  // User — backend joins profiles(id, username, avatar_url)
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };

  // Restaurant — backend joins restaurants(id, name, address, cover_image, food_types, rating, google_maps_url)
  restaurant?: {
    id: string;
    name: string;
    address?: string | null;
    cover_image?: string | null;   // ← was missing
    food_types?: string[];          // ← was missing
    rating?: number | null;         // ← was missing
    google_maps_url?: string | null;
  } | null;

  // Local only — not in DB response
  restaurant_id?: string;
}

// Matches GET /posts/:id/comments and POST /posts/:id/comments responses
// posts.js selects: id, content, created_at, user:profiles(id, username, avatar_url)
// NOTE: post_id, user_id, updated_at are NOT selected — removed to match actual shape
export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
}