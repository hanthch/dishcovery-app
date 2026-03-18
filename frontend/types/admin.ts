import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

export type UserRole = 'user' | 'moderator' | 'admin';

export function isAdmin(role?: string): role is 'admin' {
  return role === 'admin';
}

export type AdminStackParamList = {
  AdminDashboard:   undefined;
  AdminUsers:       undefined;
  AdminPosts:       undefined;
  AdminRestaurants: { status?: AdminRestaurantStatus } | undefined;
  AdminReports:     undefined;
};

export type AdminNavProp<T extends keyof AdminStackParamList> =
  NativeStackNavigationProp<AdminStackParamList, T>;

export type AdminRouteProp<T extends keyof AdminStackParamList> =
  RouteProp<AdminStackParamList, T>;

export interface AdminDashboardStats {
  totalUsers:         number;
  totalPosts:         number;
  totalRestaurants:   number;
  pendingRestaurants: number;
  reportedPosts:      number;
  newUsersToday:      number;
}

export interface AdminChartDay {
  date:  string;
  label: string;
  users: number;
  posts: number;
}

export interface AdminDashboardData {
  stats:     AdminDashboardStats;
  chartData: AdminChartDay[];
}

export interface AdminUser {
  id:              string;
  username:        string;
  full_name:       string | null;
  avatar_url:      string | null;
  role:            UserRole;
  is_banned:       boolean;
  ban_reason:      string | null;
  followers_count: number;
  posts_count:     number;
  scout_points:    number;
  created_at:      string;
}

export interface AdminUserUpdate {
  role?:       UserRole;
  is_banned?:  boolean;
  ban_reason?: string | null;
}

export interface AdminPost {
  id:             string;
  caption:        string | null;
  images:         string[];
  likes_count:    number;
  comments_count: number;
  saves_count:    number;
  is_trending:    boolean;
  is_flagged:     boolean;
  flag_reason:    string | null;
  created_at:     string;
  user:           { id: string; username: string; avatar_url: string | null } | null;
  restaurant:     { id: string; name: string; address: string } | null;
}

export type AdminRestaurantStatus = 'pending' | 'active' | 'rejected' | 'closed';

export interface AdminRestaurant {
  id:           string;
  name:         string;
  address:      string | null;
  status:       AdminRestaurantStatus;
  verified:     boolean;
  food_types:   string[];
  rating:       number | null;
  rating_count: number;
  posts_count:  number;
  cover_image:  string | null;
  created_at:   string;
}

export interface AdminRestaurantUpdate {
  status?:        AdminRestaurantStatus;
  verified?:      boolean;
  name?:          string;
  address?:       string;
  food_types?:    string[];
  price_range?:   string;
  opening_hours?: string;
  cover_image?:   string;
}

export type AdminReportType   = 'post' | 'user' | 'restaurant';
export type AdminReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface AdminReport {
  id:              string;
  type:            AdminReportType;
  reason:          string;
  status:          AdminReportStatus;
  resolution_note: string | null;
  created_at:      string;
  reporter_id:     string;
  post_id:         string | null;
  target_user_id:  string | null;
  restaurant_id:   string | null;
  reporter:        { id: string; username: string; avatar_url: string | null } | null;
  post:            { id: string; caption: string | null; images: string[] } | null;
  target_user:     { id: string; username: string; avatar_url: string | null } | null;
  restaurant:      { id: string; name: string; address: string | null } | null;
}
export interface AdminPagination {
  page:  number;
  limit: number;
  total: number;
  pages: number;
}

export interface AdminListResponse<T> {
  data:       T[];
  pagination: AdminPagination;
}

export interface AdminSingleResponse<T> {
  data: T;
}