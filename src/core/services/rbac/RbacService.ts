/**
 * Minimal RBAC Service - AUTH_rbac_can_min_v1
 *
 * Simple role-based access control with minimal can() method
 * Roles: general, listing_member, admin
 * Actions: session:read, self:update, user:any:update, user:any:read, read, write
 *
 * @phase Phase 5 - Added read/write actions for admin database management endpoints
 */

export class RbacService {
  /**
   * Check if a role can perform an action
   *
   * @param role - User role (general, listing_member, or admin)
   * @param action - Action string (e.g., "session:read", "user:any:update", "read", "write")
   * @returns true if allowed, false otherwise
   */
  can(role: "general" | "listing_member" | "admin", action: string): boolean {
    const matrix: Record<string, string[]> = {
      general: ["session:read", "self:update"],
      listing_member: ["session:read", "self:update", "listing:create", "listing:update"],
      // Admin has full access including generic read/write for admin-only endpoints
      admin: [
        "session:read",
        "self:update",
        "user:any:update",
        "user:any:read",
        "listing:any:update",
        // Generic admin actions for admin-only endpoints (Phase 5)
        "read",
        "write",
        "delete",
        "admin:read",
        "admin:write",
        "admin:delete"
      ]
    };
    return (matrix[role] || []).includes(action);
  }
}
