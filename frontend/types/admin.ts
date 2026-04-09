import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

export type UserRole = 'user' | 'moderator' | 'admin';

export function isAdmin(role?: string): role is 'admin' {
  return role === 'admin';
}

/* ── Navigation ──────────────────────────────────────────────────── */
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

/* ── Dashboard ───────────────────────────────────────────────────── */
export interface AdminDashboardStats {
  totalUsers:         number;
  totalPosts:         number;
  totalRestaurants:   number;
  pendingRestaurants: number;
  reportedPosts:      number;
  newUsersToday:      number;
}

export interface AdminChartDay {
  date:  string;   // 'YYYY-MM-DD'
  label: string;   // short weekday label
  users: number;
  posts: number;
}

export interface AdminDashboardData {
  stats:     AdminDashboardStats;
  chartData: AdminChartDay[];
}

/* ── User ────────────────────────────────────────────────────────── */
export interface AdminUser {
  id:              string;
  username:        string;
  full_name:       string | null;
  email?:          string | null;
  avatar_url:      string | null;
  bio?:            string | null;
  role:            UserRole;
  is_banned:       boolean;
  ban_reason:      string | null;
  followers_count: number;
  following_count?: number;
  posts_count:     number;
  scout_points:    number;
  contributions?:  number;
  badges?:         string[];
  created_at:      string;
  updated_at?:     string;
}

export interface AdminUserUpdate {
  role?:       UserRole;
  is_banned?:  boolean;
  ban_reason?: string | null;
}

/* ── Post ────────────────────────────────────────────────────────── */
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
  updated_at?:    string;
  user:           { id: string; username: string; avatar_url: string | null } | null;
  restaurant:     { id: string; name: string; address: string | null } | null;
}

export interface AdminPostUpdate {
  is_flagged?:  boolean;
  flag_reason?: string | null;
  is_trending?: boolean;
}

/* ── Restaurant ──────────────────────────────────────────────────── */
export type AdminRestaurantStatus = 'pending' | 'active' | 'rejected' | 'closed' | 'unverified';

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
  price_range?: string | null;
  opening_hours?: string | null;
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
  resolved_at?:    string | null;

  // Foreign keys (raw — may be null)
  reporter_id:    string;
  post_id:        string | null;
  target_user_id: string | null;
  restaurant_id:  string | null;

  // Joined rows from backend SELECT
  reporter:    { id: string; username: string; avatar_url: string | null } | null;
  post:        { id: string; caption: string | null; images: string[] } | null;
  target_user: { id: string; username: string; avatar_url: string | null } | null;
  restaurant:  { id: string; name: string; address: string | null } | null;
}

export interface AdminReportResolve {
  status:           'resolved' | 'dismissed';
  resolution_note?: string;
}

/* ── Shared list response ────────────────────────────────────────── */
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