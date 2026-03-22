/**
 * AUTH-P1-1F-002_RBAC_Stub_v1 - Type Definitions
 *
 * Core RBAC types with strict TypeScript enforcement
 * Supports default deny authorization model
 */

export type Role = 'user' | 'admin';

export type Action =
  | 'read:session'
  | 'manage:users'
  | 'manage:sessions';

export type Resource =
  | 'self'
  | 'users'
  | 'sessions';

export interface Principal {
  userId: number;
  role: Role;
}

/**
 * Authorization result with detailed context
 */
export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Policy matrix type for compile-time safety
 */
export type PolicyMatrix = Record<Role, Partial<Record<Action, ReadonlyArray<Resource>>>>;