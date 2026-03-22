/**
 * AdminActivityService - Centralized Admin Activity Audit Logging
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @pattern Build Map v2.1 ENHANCED - Service Architecture v2.0
 * @tier STANDARD
 * @phase Categories Admin Audit Logging
 *
 * PURPOSE:
 * - Centralizes all admin activity logging to admin_activity table
 * - Non-blocking design (failures don't interrupt main flow)
 * - Captures before/after data for audit trails
 * - Supports all admin action types (deletion, moderation, etc.)
 *
 * USAGE:
 * ```typescript
 * import { getAdminActivityService } from '@core/services/AdminActivityService';
 *
 * const adminActivityService = getAdminActivityService();
 * await adminActivityService.logDeletion({
 *   adminUserId: 1,
 *   targetEntityType: 'category',
 *   targetEntityId: 123,
 *   actionDescription: 'Deleted category: Electronics',
 *   beforeData: { id: 123, name: 'Electronics' },
 *   afterData: { orphan_handling: 'reassign' }
 * });
 * ```
 *
 * GOVERNANCE:
 * - MUST use DatabaseService.query() for all database operations
 * - MUST NOT throw errors that block calling code
 * - MUST capture before_data for destructive operations
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { Logger, ConsoleLogger } from '@core/logging/Logger';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Severity levels for admin actions
 */
export type AdminActionSeverity = 'low' | 'normal' | 'high' | 'critical';

/**
 * Common action categories
 */
export type AdminActionCategory =
  | 'deletion'
  | 'batch_deletion'
  | 'moderation'
  | 'update'
  | 'creation'
  | 'import'
  | 'export'
  | 'configuration';

/**
 * Admin activity log input interface
 */
export interface AdminActivityInput {
  // Required fields
  adminUserId: number;
  targetEntityType: string;      // 'category', 'listing', 'user', etc.
  actionType: string;            // 'category_deleted', 'categories_batch_deleted'
  actionCategory: AdminActionCategory;
  actionDescription: string;

  // Target entity (optional for batch operations)
  targetEntityId?: number | null;
  targetUserId?: number | null;

  // Audit data
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;

  // Request context
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;

  // Classification
  severity?: AdminActionSeverity;
  requiresApproval?: boolean;
}

/**
 * Convenience interface for deletion logging
 */
export interface DeletionLogInput {
  adminUserId: number;
  targetEntityType: string;
  targetEntityId: number;
  actionDescription: string;
  beforeData: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity?: AdminActionSeverity;
}

/**
 * Convenience interface for batch deletion logging
 */
export interface BatchDeletionLogInput {
  adminUserId: number;
  targetEntityType: string;
  actionDescription: string;
  beforeData: {
    items: Array<Record<string, unknown>>;
    total_requested: number;
  };
  afterData: {
    deleted: number;
    failed: number[];
    [key: string]: unknown;
  };
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity?: AdminActionSeverity;
}

// ============================================================================
// AdminActivityService Implementation
// ============================================================================

/**
 * AdminActivityService - Non-blocking admin audit logger
 *
 * All logging operations are wrapped in try-catch to prevent
 * failures from interrupting the main application flow.
 */
export class AdminActivityService {
  private db: DatabaseService;
  private logger: Logger;

  constructor(db: DatabaseService) {
    this.db = db;
    this.logger = new ConsoleLogger({ service: 'AdminActivityService' });

    this.logger.info('AdminActivityService constructed', {
      operation: 'constructor',
      metadata: {}
    });
  }

  /**
   * Log admin activity to admin_activity table
   *
   * NON-BLOCKING: Catches and logs errors but does not throw.
   * The main application flow should never be interrupted by logging failures.
   *
   * @param input - Admin activity log input
   */
  async logActivity(input: AdminActivityInput): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO admin_activity (
          admin_user_id, target_user_id, target_entity_type, target_entity_id,
          action_type, action_category, action_description,
          before_data, after_data,
          ip_address, user_agent, session_id,
          severity, requires_approval, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          input.adminUserId,
          input.targetUserId || null,
          input.targetEntityType,
          input.targetEntityId || null,
          input.actionType,
          input.actionCategory,
          input.actionDescription,
          input.beforeData ? JSON.stringify(input.beforeData) : null,
          input.afterData ? JSON.stringify(input.afterData) : null,
          input.ipAddress || null,
          input.userAgent || null,
          input.sessionId || null,
          input.severity || 'normal',
          input.requiresApproval ? 1 : 0
        ]
      );

      this.logger.debug('Admin activity logged successfully', {
        operation: 'logActivity',
        metadata: {
          actionType: input.actionType,
          targetEntityType: input.targetEntityType,
          adminUserId: input.adminUserId
        }
      });
    } catch (error) {
      // NON-BLOCKING: Log error but do not throw
      this.logger.error('Failed to log admin activity', error as Error, {
        operation: 'logActivity',
        metadata: {
          actionType: input.actionType,
          targetEntityType: input.targetEntityType,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      // Intentionally NOT re-throwing - logging should never block main flow
    }
  }

  /**
   * Log a single deletion action (convenience method)
   *
   * @param input - Deletion log input
   */
  async logDeletion(input: DeletionLogInput): Promise<void> {
    await this.logActivity({
      adminUserId: input.adminUserId,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      actionType: `${input.targetEntityType}_deleted`,
      actionCategory: 'deletion',
      actionDescription: input.actionDescription,
      beforeData: input.beforeData,
      afterData: input.afterData || null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      sessionId: input.sessionId,
      severity: input.severity || 'normal'
    });
  }

  /**
   * Log a batch deletion action (convenience method)
   *
   * @param input - Batch deletion log input
   */
  async logBatchDeletion(input: BatchDeletionLogInput): Promise<void> {
    // Determine severity based on count
    const severity = input.severity ||
      (input.afterData.deleted > 10 ? 'high' : 'normal');

    await this.logActivity({
      adminUserId: input.adminUserId,
      targetEntityType: input.targetEntityType,
      targetEntityId: null, // Batch operations don't have single target
      actionType: `${input.targetEntityType}_batch_deleted`,
      actionCategory: 'batch_deletion',
      actionDescription: input.actionDescription,
      beforeData: input.beforeData,
      afterData: input.afterData,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      sessionId: input.sessionId,
      severity
    });
  }

  /**
   * Log a moderation action
   *
   * @param input - Moderation activity input
   */
  async logModeration(input: {
    adminUserId: number;
    targetEntityType: string;
    targetEntityId: number;
    actionType: string;
    actionDescription: string;
    beforeData?: Record<string, unknown>;
    afterData?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    severity?: AdminActionSeverity;
  }): Promise<void> {
    await this.logActivity({
      ...input,
      actionCategory: 'moderation',
      severity: input.severity || 'normal'
    });
  }

  /**
   * Query recent admin activity for a specific entity
   *
   * @param entityType - Entity type to query
   * @param entityId - Entity ID to query
   * @param limit - Maximum number of records to return
   * @returns Array of admin activity records
   */
  async getActivityForEntity(
    entityType: string,
    entityId: number,
    limit: number = 50
  ): Promise<AdminActivityRecord[]> {
    try {
      const result = await this.db.query<AdminActivityRecord>(
        `SELECT * FROM admin_activity
         WHERE target_entity_type = ? AND target_entity_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [entityType, entityId, limit]
      );
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to query admin activity', error as Error, {
        operation: 'getActivityForEntity',
        metadata: { entityType, entityId }
      });
      return [];
    }
  }

  /**
   * Query recent admin activity by admin user
   *
   * @param adminUserId - Admin user ID
   * @param limit - Maximum number of records to return
   * @returns Array of admin activity records
   */
  async getActivityByAdmin(
    adminUserId: number,
    limit: number = 50
  ): Promise<AdminActivityRecord[]> {
    try {
      const result = await this.db.query<AdminActivityRecord>(
        `SELECT * FROM admin_activity
         WHERE admin_user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [adminUserId, limit]
      );
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to query admin activity', error as Error, {
        operation: 'getActivityByAdmin',
        metadata: { adminUserId }
      });
      return [];
    }
  }
}

/**
 * Admin activity record from database
 */
export interface AdminActivityRecord {
  id: number;
  admin_user_id: number;
  target_user_id: number | null;
  target_entity_type: string;
  target_entity_id: number | null;
  action_type: string;
  action_category: string;
  action_description: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  severity: string;
  requires_approval: boolean;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
}

// ============================================================================
// Singleton Pattern
// ============================================================================

/**
 * Singleton instance
 */
let adminActivityServiceInstance: AdminActivityService | null = null;

/**
 * Get AdminActivityService singleton
 *
 * Uses the same database service as other services.
 * Ensures consistent database access across the application.
 *
 * @returns AdminActivityService singleton instance
 */
export function getAdminActivityService(): AdminActivityService {
  if (!adminActivityServiceInstance) {
    adminActivityServiceInstance = new AdminActivityService(getDatabaseService());
  }
  return adminActivityServiceInstance;
}

/**
 * Reset singleton (for testing only)
 */
export function resetAdminActivityService(): void {
  if (process.env.NODE_ENV !== 'production') {
    adminActivityServiceInstance = null;
  }
}
