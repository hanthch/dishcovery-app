export interface User {
  id: string;  // Always UUID string — auth.js returns Supabase auth UUID
  username: string;

  avatar_url?: string | null;
  bio?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  phone_number?: string;
  phoneNumber?: string;
  birth_date?: string;
  birthDate?: string;

  is_verified?: boolean;
  is_following?: boolean;
  verified_at?: string;

  contributions?: number;
  scout_points?: number;
  badges?: string[];

  // Engagement Metrics
  followers_count?: number;
  following_count?: number;
  posts_count?: number;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

/**
 * User Summary - Used in nested responses (posts, comments, etc.)
 * Lightweight version for lists and nested data
 */
export interface UserSummary {
  id: string;  // Always UUID string
  username: string;
  avatar_url?: string | null;
  is_verified?: boolean;
}

/**
 * User Profile - Extended version with all details
 * Used when fetching complete user profile
 */
export interface UserProfile extends User {
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
  verified_at?: string;
  badges: string[];
}

/**
 * Authentication Responses
 */
export interface AuthResponse {
  user: User;
  token: string;
  expires_in?: number;
}

export type LoginResponse = AuthResponse;

export interface SignupResponse extends AuthResponse {
  email_verification_required?: boolean;
}

/**
 * Authentication Requests
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  // auth.js POST /register only reads: email, password, username, full_name
  // All other fields are ignored by the backend
  full_name?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  new_password: string;
}

/**
 * Auth State Management
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  expiresAt?: number;
}

export type UserDisplay = User & {
  fullName?: string;
  followersCountFormatted?: string;
};