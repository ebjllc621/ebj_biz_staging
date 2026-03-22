/**
 * Authentication API Contracts
 *
 * @authority Build Map v2.1 - Unified Type System
 * @canonical This is the single source of truth for authentication types
 * @migration Migrated from src/lib/auth/contracts.ts in 2nd Remediation Phase 1
 *
 * @see docs/auth/newday2ndRemediation/01-legacy-cleanup-k9-enforcement.md
 */

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  sessionToken?: string;
  expiresAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: UserRole;
  isVerified?: boolean;
  /** Avatar image URL (uploaded profile picture) */
  avatarUrl?: string | null;
  /** Avatar background color for default avatars (hex color code) */
  avatarBgColor?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'visitor' | 'general' | 'listing_member' | 'admin';

export interface AuthSession {
  userId: string;
  sessionId: string;
  role: UserRole;
  expiresAt: string;
  issuedAt: string;
}

export interface ValidateResponse {
  valid: boolean;
  user?: User;
  session?: AuthSession;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Auth error codes following canonical error patterns
 */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_CODES;