/**
 * AUTH-P1-1F-002_RBAC_Stub_v1 - RBAC Service
 *
 * Role-Based Access Control service with default deny enforcement
 * Provides authorization decisions based on policy matrix
 */

import type { Principal, Action, Resource, AuthorizationResult } from './types';
import { isAllowed, getAllowedResources, hasActionPermission } from './policy';

/**
 * RBAC Service for authorization decisions
 *
 * Implements default deny authorization model:
 * - All permissions must be explicitly granted in policy matrix
 * - Any role/action/resource combination not explicitly allowed is denied
 * - No fallback or permissive behavior
 */
export class RbacService {
  /**
   * Check if a principal can perform an action on a resource
   *
   * @param principal - User principal with role information
   * @param action - Action being attempted
   * @param resource - Resource being accessed
   * @returns true if allowed, false if denied (default deny)
   */
  can(principal: Principal, action: Action, resource: Resource): boolean {
    // Validate input parameters
    if (!principal || typeof principal.userId !== 'number' || !principal.role) {
      return false;
    }

    // Use policy matrix to determine authorization
    return isAllowed(principal.role, action, resource);
  }

  /**
   * Get detailed authorization result with reasoning
   *
   * @param principal - User principal with role information
   * @param action - Action being attempted
   * @param resource - Resource being accessed
   * @returns Authorization result with allow/deny and reason
   */
  authorize(principal: Principal, action: Action, resource: Resource): AuthorizationResult {
    // Validate principal
    if (!principal || typeof principal.userId !== 'number' || !principal.role) {
      return {
        allowed: false,
        reason: 'Invalid principal: missing userId or role'
      };
    }

    const allowed = isAllowed(principal.role, action, resource);

    return {
      allowed,
      reason: allowed
        ? `Role '${principal.role}' allowed '${action}' on '${resource}'`
        : `Role '${principal.role}' denied '${action}' on '${resource}' (default deny)`
    };
  }

  /**
   * Get all resources a principal can access for a specific action
   *
   * @param principal - User principal with role information
   * @param action - Action to check
   * @returns Array of allowed resources
   */
  getAllowedResources(principal: Principal, action: Action): ReadonlyArray<Resource> {
    // Validate principal
    if (!principal || typeof principal.userId !== 'number' || !principal.role) {
      return [];
    }

    return getAllowedResources(principal.role, action);
  }

  /**
   * Check if a principal has any permissions for a specific action
   *
   * @param principal - User principal with role information
   * @param action - Action to check
   * @returns true if principal has any permissions for this action
   */
  hasActionPermission(principal: Principal, action: Action): boolean {
    // Validate principal
    if (!principal || typeof principal.userId !== 'number' || !principal.role) {
      return false;
    }

    return hasActionPermission(principal.role, action);
  }

  /**
   * Bulk authorization check for multiple resources
   *
   * @param principal - User principal with role information
   * @param action - Action being attempted
   * @param resources - Array of resources to check
   * @returns Map of resource to authorization result
   */
  canMultiple(
    principal: Principal,
    action: Action,
    resources: Resource[]
  ): Map<Resource, boolean> {
    const results = new Map<Resource, boolean>();

    for (const resource of resources) {
      results.set(resource, this.can(principal, action, resource));
    }

    return results;
  }
}