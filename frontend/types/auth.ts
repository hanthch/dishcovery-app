// ─────────────────────────────────────────────────────────────────────────────
// auth.ts  —  types aligned with:
//   • backend /auth/login & /auth/register response shape
//   • backend /users/:id & /users/me response shape
//   • Supabase profiles table schema
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id:       string;   // Supabase auth UUID
  username: string;
  email?:   string | null;

  // FIX: full_name is the canonical field returned by every backend endpoint.
  // Keep the camelCase aliases as optional for frontend-only helpers.
  full_name?:    string | null;
  avatar_url?:   string | null;
  bio?:          string | null;

  // Optional split-name aliases (frontend convenience only — not stored separately in DB)
  first_name?:  string | null;
  firstName?:   string | null;
  last_name?:   string | null;
  lastName?:    string | null;

  // Not stored in profiles table — kept for signup form only
  phone_number?: string | null;
  phoneNumber?:  string | null;
  birth_date?:   string | null;
  birthDate?:    string | null;

  role?: 'user' | 'moderator' | 'admin';

  // Flags
  is_banned?:    boolean;
  // FIX: is_verified is NOT a column in the profiles table.
  // The profile table has no verified column. Remove or treat as
  // a computed/virtual field only — never write it to the DB.
  is_verified?:  boolean;
  is_following?: boolean;
  verified_at?:  string | null;

  // Gamification — all columns exist in profiles table
  contributions?: number;
  scout_points?:  number;
  badges?:        string[];

  // Counters — maintained by DB triggers
  followers_count?: number;
  following_count?: number;
  posts_count?:     number;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

// Lightweight user reference used in post/follower lists
export interface UserSummary {
  id:           string;
  username:     string;
  full_name?:   string | null;   // FIX: added — backend always returns this
  avatar_url?:  string | null;
  is_verified?: boolean;
}

// Full profile shape returned by GET /users/:id and GET /users/me
export interface UserProfile extends User {
  followers_count:  number;
  following_count:  number;
  posts_count:      number;
  is_following:     boolean;
  is_own_profile:   boolean;    // FIX: added — backend includes this field
  badges:           string[];
}

// ─── Auth responses ───────────────────────────────────────────────────────────

export interface AuthResponse {
  user:        User;
  token:       string;
  expires_in?: number;
}

export type LoginResponse  = AuthResponse;
export type SignupResponse = AuthResponse & { email_verification_required?: boolean };

// ─── Auth requests ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email:    string;
  password: string;
}

export interface SignupRequest {
  email:      string;
  password:   string;
  username:   string;
  // FIX: backend /register only accepts full_name (not first_name/last_name).
  // useAuth.ts already concatenates them before sending — keep that pattern.
  full_name?: string;
  // These extra fields are accepted in the type for the signup form but are
  // NOT forwarded to the backend (backend ignores unknown fields).
  firstName?:   string;
  lastName?:    string;
  birthDate?:   string;
  phoneNumber?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyCodeRequest {
  email: string;
  code:  string;
}

export interface ResetPasswordRequest {
  email:    string;
  code:     string;
  password: string;
}

// ─── Client-side auth state (Zustand store) ───────────────────────────────────

export interface AuthState {
  user:            User | null;
  token:           string | null;
  loading:         boolean;
  isAuthenticated: boolean;
  error:           string | null;
  expiresAt?:      number;
}

// UI display helper — merges full_name into a single displayable string
export type UserDisplay = User & {
  fullName?:                  string;
  followersCountFormatted?:   string;
};