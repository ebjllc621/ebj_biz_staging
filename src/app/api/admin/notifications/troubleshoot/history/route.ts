/**
 * Admin Notification Troubleshoot - History Endpoint
 *
 * GET /api/admin/notifications/troubleshoot/history?userId=...
 * Returns paginated notification history for a user
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Returns notification history with delivery status
 *
 * @phase Phase 5 - Troubleshooting Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { bigIntToNumber } from '@core/utils/bigint';
import type { TroubleshootHistoryResponse, TroubleshootNotificationEntry } from '@core/types/notification-admin';

/**
 * GET /api/admin/notifications/troubleshoot/history
 * Get notification history for user
 */
async function getHistoryHandler(context: ApiContext) {
  const { searchParams } = new URL(context.request.url);
  const userId = searchParams.get('userId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
  const daysBack = Math.min(parseInt(searchParams.get('daysBack') || '30', 10), 365);
  const typeFilter = searchParams.get('type') || undefined;
  const statusFilter = searchParams.get('status') || undefined;

  if (!userId) {
    throw new BizError({
      code: 'VALIDATION_ERROR',
      message: 'userId parameter is required'
    });
  }

  const db = getDatabaseService();
  const userIdNum = parseInt(userId, 10);
  const offset = (page - 1) * pageSize;

  // Build WHERE clause
  const conditions: string[] = [
    'un.user_id = ?',
    'un.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'
  ];
  const params: (number | string)[] = [userIdNum, daysBack];

  if (typeFilter) {
    conditions.push('un.notification_type = ?');
    params.push(typeFilter);
  }

  if (statusFilter === 'unread') {
    conditions.push('un.is_read = 0');
  } else if (statusFilter === 'read') {
    conditions.push('un.is_read = 1');
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM user_notifications un WHERE ${whereClause}`,
    params
  );
  const totalItems = bigIntToNumber(countResult.rows[0]?.count ?? 0n);
  const totalPages = Math.ceil(totalItems / pageSize);

  // Get notifications with delivery status from email logs
  const notificationsResult = await db.query<{
    id: number;
    notification_type: string;
    category: string;
    title: string;
    message: string | null;
    action_url: string | null;
    priority: string;
    is_read: number;
    read_at: Date | null;
    created_at: Date;
    email_status: string | null;
    email_sent_at: Date | null;
  }>(
    `SELECT
       un.id,
       un.notification_type,
       un.category,
       un.title,
       un.message,
       un.action_url,
       un.priority,
       un.is_read,
       un.read_at,
       un.created_at,
       nel.status as email_status,
       nel.sent_at as email_sent_at
     FROM user_notifications un
     LEFT JOIN notification_email_logs nel ON nel.notification_id = un.id
     WHERE ${whereClause}
     ORDER BY un.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const notifications: TroubleshootNotificationEntry[] = notificationsResult.rows.map(row => {
    const createdAt = new Date(row.created_at);
    const ageMinutes = Math.round((Date.now() - createdAt.getTime()) / 60000);

    // Determine email delivery status
    let emailStatus: TroubleshootNotificationEntry['deliveryStatus']['email'] = null;
    if (row.email_status === 'sent') {
      emailStatus = 'sent';
    } else if (row.email_status === 'failed') {
      emailStatus = 'failed';
    } else if (row.email_status === 'queued') {
      emailStatus = 'queued';
    }

    return {
      id: row.id,
      type: row.notification_type,
      category: row.category || 'general',
      title: row.title,
      message: row.message,
      actionUrl: row.action_url,
      priority: (row.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
      isRead: row.is_read === 1,
      readAt: row.read_at?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
      ageMinutes,
      deliveryStatus: {
        inApp: 'delivered',
        push: null, // Would need push_logs table for detailed tracking
        email: emailStatus
      }
    };
  });

  const response: TroubleshootHistoryResponse = {
    userId: userIdNum,
    notifications,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages
    },
    filters: {
      type: typeFilter,
      status: statusFilter,
      daysBack
    }
  };

  return createSuccessResponse({ ...response }, context.requestId);
}

export const GET = apiHandler(getHistoryHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 60,
    windowMs: 60000
  }
});

// Method guards
const ALLOWED_METHODS = ['GET'];

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
