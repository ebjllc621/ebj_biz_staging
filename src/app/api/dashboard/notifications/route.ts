/**
 * Dashboard Notifications List API Route
 * GET /api/dashboard/notifications - Get paginated notifications
 *
 * @authority docs/notificationService/phases/PHASE_5_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/dashboard/notifications/summary/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { DashboardService } from '@features/dashboard/services/DashboardService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/dashboard/notifications
 * Get paginated notifications with optional type filter
 *
 * Query params:
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 * - type: string | null (filter by notification_type)
 *
 * @authenticated Requires valid session
 */
export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const notificationType = url.searchParams.get('type') || null;

  // Validate notification type if provided
  const validTypes = ['connection_request', 'message', 'review', 'mention', 'system', 'recommendation'];
  if (notificationType && !validTypes.includes(notificationType)) {
    throw BizError.badRequest(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
  }

  const db = getDatabaseService();
  const service = new DashboardService(db);

  const result = await service.getNotificationsPaginated(
    parseInt(context.userId, 10),
    { page, pageSize, notificationType }
  );

  return createSuccessResponse(result, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
