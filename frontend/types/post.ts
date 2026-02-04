// types/post.ts

export type User = {
  id: number;
  username: string;
  avatar_url?: string | null;
};

export type Restaurant = {
  id: number;
  name: string;
  address: string;
  google_maps_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  food_types?: string[];
  price_range?: number | null;
  landmark_notes?: string | null;
};

export type LocationTag = {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  google_maps_url?: string;
};

export type Post = {
  id: number;
  caption?: string | null;
  images?: string[] | null;
  created_at: string;

  user: User;

  restaurant?: Restaurant | null;
  location?: LocationTag | null;

  likes_count?: number;
  saves_count?: number;
  comments_count?: number;

  is_liked?: boolean;
  is_saved?: boolean;
};
