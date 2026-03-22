/**
 * AUTH-P1-1F-002_RBAC_Stub_v1 - Policy Matrix
 *
 * Default deny authorization policy with explicit permission matrix
 * Any role/action combination not explicitly listed will be denied
 */

import type { Role, Action, Resource, PolicyMatrix } from './types';

/**
 * Policy matrix defining explicit permissions
 * DEFAULT DENY: Any combination not listed here is automatically denied
 */
export const policy: PolicyMatrix = {
  user: {
    'read:session': ['self']
  },
  admin: {
    'read:session': ['self', 'sessions'],
    'manage:users': ['users'],
    'manage:sessions': ['sessions']
  }
} as const;

/**
 * Check if a specific role has permission for an action on a resource
 *
 * @param role - User role to check
 * @param action - Action being attempted
 * @param resource - Resource being accessed
 * @returns true if explicitly allowed, false otherwise (default deny)
 */
export function isAllowed(role: Role, action: Action, resource: Resource): boolean {
  // Get allowed resources for this role and action
  const allowedResources = policy[role]?.[action];

  // Default deny: if no explicit permission found, return false
  if (!Array.isArray(allowedResources)) {
    return false;
  }

  // Check if the specific resource is in the allowed list
  return allowedResources.includes(resource);
}

/**
 * Get all allowed resources for a role and action
 *
 * @param role - User role
 * @param action - Action to check
 * @returns Array of allowed resources, empty array if none
 */
export function getAllowedResources(role: Role, action: Action): ReadonlyArray<Resource> {
  return policy[role]?.[action] ?? [];
}

/**
 * Check if a role has any permissions for a specific action
 *
 * @param role - User role
 * @param action - Action to check
 * @returns true if role has any permissions for this action
 */
export function hasActionPermission(role: Role, action: Action): boolean {
  const allowedResources = policy[role]?.[action];
  return Array.isArray(allowedResources) && allowedResources.length > 0;
}