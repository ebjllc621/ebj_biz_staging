/**
 * RBAC Service Exports
 *
 * Minimal role-based access control exports
 */

import { RbacService } from './RbacService';

export { RbacService };

// Type definitions for RBAC
export type RbacRole = "general" | "listing_member" | "admin";
export type RbacAction = string;
export type RbacResource = string;
export type RbacPrincipal = { role: RbacRole; userId?: string; isVerified?: boolean };
export type AuthorizationResult = { allowed: boolean; reason?: string };

/**
 * RBAC Guard - Simple guard function for role-based access control
 *
 * @param role - User role (user or admin)
 * @param action - Action to check
 * @returns true if allowed, false otherwise
 */
export function rbacGuard(role: RbacRole, action: string): boolean {
  const service = new RbacService();
  return service.can(role, action);
}
