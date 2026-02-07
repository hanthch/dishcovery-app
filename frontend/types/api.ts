import { User } from './auth';

export interface TrendingFeedParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
}


export interface TrendingFeedParams {
  page: number;
  limit: number;
}

/**
 * Generic Paginated Response Wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
}
