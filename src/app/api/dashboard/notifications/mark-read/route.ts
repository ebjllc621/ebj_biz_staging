/**
 * Dashboard Notifications Mark-Read API Route
 * POST /api/dashboard/notifications/mark-read - Mark notifications as read
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required via httpOnly cookies
 *
 * @authority CLAUDE.md - API Standards section
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/app/api/dashboard/notifications/summary/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { DashboardService } from '@features/dashboard/services/DashboardService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * POST /api/dashboard/notifications/mark-read
 * Mark notifications as read
 *
 * Request body options:
 * - { notificationId: number } - Mark single notification
 * - { notificationType: string } - Mark all of type (e.g., 'connection_request')
 * - { all: true } - Mark all notifications
 *
 * @authenticated Requires valid session
 */
export const POST = apiHandler(async (context: ApiContext) => {
  // Ensure user is authenticated
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const userId = parseInt(context.userId, 10);
  const db = getDatabaseService();
  const service = new DashboardService(db);

  // Parse request body
  let body: {
    notificationId?: number;
    notificationType?: string;
    all?: boolean;
  };

  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Request body required');
  }

  let markedCount = 0;

  if (body.notificationId) {
    // Mark single notification
    await service.markNotificationRead(userId, body.notificationId);
    markedCount = 1;
  } else if (body.notificationType) {
    // Mark all notifications of type
    const validTypes = ['connection_request', 'message', 'bizwire', 'review', 'mention', 'system'];
    if (!validTypes.includes(body.notificationType)) {
      throw BizError.badRequest(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
    }
    markedCount = await service.markNotificationsByTypeRead(userId, body.notificationType);
  } else if (body.all === true) {
    // Mark all notifications
    markedCount = await service.markAllNotificationsRead(userId);
  } else {
    throw BizError.badRequest('Must specify notificationId, notificationType, or all: true');
  }

  return createSuccessResponse({
    marked_count: markedCount,
    message: markedCount > 0
      ? `Marked ${markedCount} notification(s) as read`
      : 'No unread notifications to mark'
  }, context.requestId);
}, {
  allowedMethods: ['POST'],
  requireAuth: true
});
