import { User } from './auth';


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
  image_url?: string;
  images?: string[];

  restaurant_id?: string;
  restaurant?: {
    id: string;
    name: string;
    address: string;
    google_maps_url?: string;
  };

  user: {
    id: string;
    username: string;
    avatar_url: string;
  };

  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;

  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user: User;
  content: string;
  created_at: string;
  updated_at: string;
}
