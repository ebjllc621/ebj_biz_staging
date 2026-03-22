/**
 * Dashboard Notification Delete API Route
 * DELETE /api/dashboard/notifications/[id] - Delete a notification
 *
 * @authority docs/notificationService/phases/PHASE_5_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/dashboard/notifications/mark-read/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { DashboardService } from '@features/dashboard/services/DashboardService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * DELETE /api/dashboard/notifications/[id]
 * Delete a specific notification
 *
 * @authenticated Requires valid session
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  // Extract notification ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const idParam = pathParts[pathParts.length - 1];

  if (!idParam) {
    throw BizError.badRequest('Missing notification ID');
  }

  const notificationId = parseInt(idParam, 10);

  if (isNaN(notificationId) || notificationId <= 0) {
    throw BizError.badRequest('Invalid notification ID');
  }

  const db = getDatabaseService();
  const service = new DashboardService(db);

  const deleted = await service.deleteNotification(
    parseInt(context.userId, 10),
    notificationId
  );

  if (!deleted) {
    throw BizError.notFound('Notification not found or already deleted');
  }

  return createSuccessResponse({
    deleted: true,
    notificationId
  }, context.requestId);
}, {
  allowedMethods: ['DELETE'],
  requireAuth: true
});
