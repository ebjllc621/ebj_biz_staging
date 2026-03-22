/**
 * Admin Users Batch Delete API
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - CSRF protection: fetchWithCsrf on client
 * - Authentication: Admin-only access
 * - Service boundary: Uses DatabaseService
 * - Activity logging: ActivityLoggingService for audit trail
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @phase Phase 4 - Admin Password Modal & Delete Confirmation
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getActivityLoggingService } from '@core/services/ActivityLoggingService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';

interface BatchDeleteRequest {
  userIds: number[];
}

interface BatchDeleteResult {
  deleted: number;
  failed: number;
  errors: string[];
}

export const POST = apiHandler<BatchDeleteResult>(
  async (context: ApiContext) => {
    const { request, requestId, logger } = context;

    // Get current admin user
    const currentUser = await getUserFromRequest(request as NextRequest);
    if (!currentUser) {
      throw BizError.unauthorized('Authentication required');
    }
    if (currentUser.role !== 'admin') {
      throw BizError.forbidden('Admin access required');
    }

    // Parse request body
    const body = (await request.json()) as BatchDeleteRequest;
    const { userIds } = body;

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw BizError.validation('userIds', userIds, 'No users specified');
    }

    // Prevent self-deletion
    if (userIds.includes(currentUser.id)) {
      throw BizError.validation('userIds', userIds, 'Cannot delete your own account');
    }

    const db = getDatabaseService();
    const activityService = getActivityLoggingService();
    const errors: string[] = [];
    let deleted = 0;
    let failed = 0;

    // Get user details before deletion for logging
    const usersResult = await db.query<{ id: number; email: string; role: string }>(
      `SELECT id, email, role FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`,
      userIds
    );
    const usersMap = new Map(usersResult.rows.map(u => [u.id, u]));

    // Execute batch delete (soft delete - set status to 'deleted')
    try {
      const placeholders = userIds.map(() => '?').join(',');
      const result = await db.query(
        `UPDATE users
         SET status = 'deleted', updated_at = NOW()
         WHERE id IN (${placeholders}) AND id != ?`,
        [...userIds, currentUser.id]
      );

      deleted = result.rowCount || 0;
      failed = userIds.length - deleted;

      // Log activity for each deleted user (user_log table)
      for (const userId of userIds) {
        const user = usersMap.get(userId);
        if (user) {
          await activityService.logActivity({
            userId: currentUser.id,
            action: 'user_deleted',
            actionType: 'account',
            description: `Batch deleted user: ${user.email}`,
            entityType: 'user',
            entityId: userId.toString(),
            success: true,
            metadata: {
              operation: 'batch_delete',
              batch_size: userIds.length,
              beforeData: user
            }
          });
        }
      }

      // Log to admin_activity table for admin audit trail
      const adminActivityService = getAdminActivityService();
      await adminActivityService.logBatchDeletion({
        adminUserId: currentUser.id,
        targetEntityType: 'user',
        actionDescription: `Batch deleted ${deleted} user(s)`,
        beforeData: {
          items: Array.from(usersMap.values()),
          total_requested: userIds.length
        },
        afterData: {
          deleted,
          failed: [], // No individual failure tracking in batch UPDATE
          failed_count: failed,
          errors
        },
        severity: 'high'
      });
    } catch (err) {
      failed = userIds.length;
      errors.push(err instanceof Error ? err.message : 'Unknown error');
    }

    logger.info('Batch delete completed', {
      operation: 'batch-delete',
      metadata: {
        deleted,
        failed,
        total: userIds.length
      }
    });

    return createSuccessResponse<BatchDeleteResult>(
      { deleted, failed, errors },
      requestId
    );
  },
  {
    allowedMethods: ['POST'],
    requireAuth: true
  }
);
