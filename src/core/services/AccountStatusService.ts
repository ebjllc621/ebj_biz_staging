/**
 * AccountStatusService - Account Status and Suspension Management
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/dna/brain-plans/ACCOUNT_STATUS_PAGES_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @reference src/features/profile/services/ProfileService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { safeJsonParse } from '@core/utils/json';

/**
 * Account status information interface
 */
export interface AccountStatusInfo {
  status: 'active' | 'suspended' | 'banned' | 'deleted' | 'pending';
  username: string;
  reason: string | null;
  actionDate: Date | null;
}

/**
 * Admin activity row for suspension/deletion reasons
 */
interface AdminActivityRow {
  action_description: string;
  after_data: string | Record<string, unknown> | null;
  created_at: string;
}

/**
 * User status row for minimal status check
 */
interface UserStatusRow {
  id: number;
  username: string;
  status: 'active' | 'suspended' | 'banned' | 'deleted' | 'pending';
  deleted_at: string | null;
}

// ============================================================================
// AccountStatusService Implementation
// ============================================================================

export class AccountStatusService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Get account status information by username
   * @param username Username to look up
   * @returns Account status info or null if user not found
   */
  async getAccountStatus(username: string): Promise<AccountStatusInfo | null> {
    // Get user status
    const userResult: DbResult<UserStatusRow> = await this.db.query(
      'SELECT id, username, status, deleted_at FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    const user = userResult.rows[0];
    if (!user) {
      return null;
    }

    // Get suspension/deletion reason if applicable
    let reason: string | null = null;
    let actionDate: Date | null = null;

    if (user.status === 'suspended' || user.status === 'deleted') {
      const reasonData = await this.getSuspensionReason(user.id);
      reason = reasonData.reason;
      actionDate = reasonData.actionDate;
    }

    return {
      status: user.status,
      username: user.username,
      reason,
      actionDate
    };
  }

  /**
   * Get suspension/deletion reason from admin activity log
   * @param userId User ID
   * @returns Suspension reason and action date
   */
  async getSuspensionReason(userId: number): Promise<{ reason: string | null; actionDate: Date | null }> {
    try {
      const result: DbResult<AdminActivityRow> = await this.db.query(
        `SELECT action_description, after_data, created_at
         FROM admin_activity
         WHERE target_user_id = ?
           AND action_type IN ('user_suspended', 'user_deleted')
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      const activity = result.rows[0];
      if (!activity) {
        return { reason: null, actionDate: null };
      }

      // Try to extract reason from after_data JSON
      let reason: string | null = activity.action_description || null;

      if (activity.after_data) {
        // GOVERNANCE: MariaDB auto-parses JSON columns - handle both string and object
        // @see docs/dna/mariadb-behavioral-patterns.md
        let afterData: Record<string, unknown> | null = null;

        if (typeof activity.after_data === 'string') {
          afterData = safeJsonParse<Record<string, unknown>>(activity.after_data);
        } else {
          afterData = activity.after_data as Record<string, unknown>;
        }

        if (afterData && typeof afterData.reason === 'string') {
          reason = afterData.reason;
        }
      }

      const actionDate = activity.created_at ? new Date(activity.created_at) : null;

      return { reason, actionDate };
    } catch (error) {
      // If admin_activity table doesn't exist or query fails, return null
      return { reason: null, actionDate: null };
    }
  }

  /**
   * Check if account is accessible (not suspended/deleted)
   * Throws BizError if account is suspended or deleted
   * @param username Username to check
   * @throws BizError.accountSuspended or BizError.accountDeleted
   */
  async checkAccountAccessibility(username: string): Promise<void> {
    const statusInfo = await this.getAccountStatus(username);

    if (!statusInfo) {
      throw BizError.notFound('User', username);
    }

    if (statusInfo.status === 'suspended') {
      throw BizError.accountSuspended(statusInfo.username, statusInfo.reason);
    }

    if (statusInfo.status === 'deleted') {
      throw BizError.accountDeleted(statusInfo.username);
    }
  }
}

/**
 * Get AccountStatusService instance with DatabaseService
 * @returns AccountStatusService instance
 */
export function getAccountStatusService(): AccountStatusService {
  const db = require('@core/services/DatabaseService').getDatabaseService();
  return new AccountStatusService(db);
}
