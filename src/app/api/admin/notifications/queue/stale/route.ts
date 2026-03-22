/**
 * Admin Stale Notifications Endpoint
 *
 * GET /api/admin/notifications/queue/stale
 * Returns paginated list of stale notifications with statistics
 *
 * DELETE /api/admin/notifications/queue/stale
 * Cleanup stale notifications older than specified days
 *
 * Query Parameters (GET):
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 * - minAgeDays: number (default: 30)
 *
 * Request Body (DELETE):
 * - minAgeDays: number (required, min: 30)
 * - dryRun: boolean (default: false)
 *
 * @phase Phase 4 - Queue Management Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { bigIntToNumber } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';
import type { StaleNotificationEntry, StaleNotificationsResponse, QueueActionResult } from '@core/types/notification-admin';
import { ErrorService } from '@core/services/ErrorService';

/**
 * GET /api/admin/notifications/queue/stale
 * Returns paginated stale notifications
 */
async function getStaleNotificationsHandler(context: ApiContext) {
  const { searchParams } = new URL(context.request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
  const minAgeDays = Math.max(1, parseInt(searchParams.get('minAgeDays') || '30'));
  const offset = (page - 1) * pageSize;

  const db = getDatabaseService();

  // Get total count
  const countResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM user_notifications
     WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [minAgeDays]
  );
  const totalItems = bigIntToNumber(countResult.rows[0]?.count ?? 0n);
  const totalPages = Math.ceil(totalItems / pageSize);

  // Get paginated items with user info
  const itemsResult = await db.query<{
    id: number;
    user_id: number;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    notification_type: string;
    title: string;
    is_read: number;
    created_at: Date;
  }>(
    `SELECT
      n.id, n.user_id, u.first_name, u.last_name, u.display_name,
      n.notification_type, n.title, n.is_read, n.created_at
     FROM user_notifications n
     JOIN users u ON n.user_id = u.id
     WHERE n.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY n.created_at ASC
     LIMIT ? OFFSET ?`,
    [minAgeDays, pageSize, offset]
  );

  const now = Date.now();
  const items: StaleNotificationEntry[] = itemsResult.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    userName: row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown',
    notificationType: row.notification_type,
    title: row.title,
    isRead: row.is_read === 1,
    createdAt: new Date(row.created_at).toISOString(),
    ageDays: Math.round((now - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24))
  }));

  // Get statistics
  const statistics = await getStaleNotificationStatistics(db);

  const response: StaleNotificationsResponse = {
    items,
    statistics,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages
    }
  };

  return createSuccessResponse({ ...response }, context.requestId);
}

/**
 * DELETE /api/admin/notifications/queue/stale
 * Cleanup stale notifications
 */
async function deleteStaleNotificationsHandler(context: ApiContext) {
  const db = getDatabaseService();

  let body: { minAgeDays?: number; dryRun?: boolean } = {};
  try {
    body = await context.request.json();
  } catch {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_BODY',
        message: 'Request body required',
        userMessage: 'Request body required'
      }),
      context.requestId
    );
  }

  const minAgeDays = body.minAgeDays;
  const dryRun = body.dryRun === true;

  // Validate minAgeDays
  if (!minAgeDays || minAgeDays < 30) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_AGE',
        message: 'minAgeDays must be at least 30',
        userMessage: 'minAgeDays must be at least 30'
      }),
      context.requestId
    );
  }

  // Get count of affected items
  const countResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM user_notifications
     WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [minAgeDays]
  );
  const affectedCount = bigIntToNumber(countResult.rows[0]?.count ?? 0n);

  if (affectedCount === 0) {
    const result: QueueActionResult = {
      success: true,
      message: `No notifications older than ${minAgeDays} days to delete`,
      processed: 0
    };
    return createSuccessResponse({ ...result }, context.requestId);
  }

  // Dry run - just return count
  if (dryRun) {
    const result: QueueActionResult = {
      success: true,
      message: `Dry run: ${affectedCount} notifications older than ${minAgeDays} days would be deleted`,
      processed: affectedCount
    };
    return createSuccessResponse({ ...result }, context.requestId);
  }

  // Delete stale notifications
  try {
    await db.query(
      `DELETE FROM user_notifications
       WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [minAgeDays]
    );

    const result: QueueActionResult = {
      success: true,
      message: `Successfully deleted ${affectedCount} notifications older than ${minAgeDays} days`,
      processed: affectedCount
    };
    return createSuccessResponse({ ...result }, context.requestId);

  } catch (error) {
    ErrorService.capture('[StaleNotifications] Delete failed:', error);
    return createErrorResponse(
      new BizError({
        code: 'DELETE_FAILED',
        message: 'Failed to delete stale notifications',
        userMessage: 'Failed to delete stale notifications'
      }),
      context.requestId
    );
  }
}

/**
 * Get stale notification statistics
 */
async function getStaleNotificationStatistics(
  db: ReturnType<typeof getDatabaseService>
): Promise<StaleNotificationsResponse['statistics']> {
  // Total stale (30+ days)
  const totalResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM user_notifications
     WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );
  const total = bigIntToNumber(totalResult.rows[0]?.count ?? 0n);

  // Unread stale
  const unreadResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM user_notifications
     WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND is_read = 0`
  );
  const unread = bigIntToNumber(unreadResult.rows[0]?.count ?? 0n);

  // 90+ days
  const older90Result = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM user_notifications
     WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)`
  );
  const olderThan90Days = bigIntToNumber(older90Result.rows[0]?.count ?? 0n);

  return {
    total,
    unread,
    olderThan30Days: total,
    olderThan90Days
  };
}

export const GET = apiHandler(getStaleNotificationsHandler, {
  allowedMethods: ['GET', 'DELETE'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 30,
    windowMs: 60000
  }
});

export const DELETE = apiHandler(deleteStaleNotificationsHandler, {
  allowedMethods: ['GET', 'DELETE'],
  requireAuth: true,
  rbac: {
    action: 'delete',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 5,
    windowMs: 60000
  }
});

// Method guards
const ALLOWED_METHODS = ['GET', 'DELETE'];

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
