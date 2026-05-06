import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'admin' | 'user';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
