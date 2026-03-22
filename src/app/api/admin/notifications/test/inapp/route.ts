/**
 * Admin Test In-App Notification Endpoint
 *
 * POST /api/admin/notifications/test/inapp
 * Sends a test in-app notification to the requesting admin
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Dispatches real in-app notification via NotificationService
 *
 * @phase Phase 5 - Admin Actions & Management
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { NotificationService } from '@core/services/NotificationService';
import { BizError } from '@core/errors/BizError';
import { ErrorService } from '@core/services/ErrorService';
import type { TestNotificationResult } from '@core/types/notification-admin';

/**
 * POST /api/admin/notifications/test/inapp
 * Send test in-app notification to admin
 */
async function testInAppHandler(context: ApiContext) {
  const db = getDatabaseService();

  const userId = context.userId;

  if (!userId) {
    throw new BizError({
      code: 'UNAUTHORIZED',
      message: 'User ID not found in context',
      userMessage: 'Authentication required'
    });
  }

  try {
    const notificationService = new NotificationService(db);

    const dispatchResult = await notificationService.dispatch({
      type: 'system.announcement',
      recipientId: Number(userId),
      title: 'Test In-App Notification',
      message: 'This is a test in-app notification from the Notification Manager. In-app notifications are working correctly.',
      priority: 'normal',
      channels: ['in_app'],
      metadata: {
        source: 'admin_notification_manager',
        testNotification: true
      }
    });

    if (dispatchResult.dispatched) {
      const response: TestNotificationResult = {
        success: true,
        message: 'Test in-app notification sent successfully. Check your notification bell.',
        channel: 'inApp',
        sentAt: new Date().toISOString(),
        details: {
          notificationId: dispatchResult.notificationId
        }
      };
      return createSuccessResponse({ ...response }, context.requestId);
    } else {
      const response: TestNotificationResult = {
        success: false,
        message: dispatchResult.reason
          ? `Notification not dispatched: ${dispatchResult.reason}`
          : 'Failed to dispatch in-app notification',
        channel: 'inApp',
        sentAt: new Date().toISOString(),
        error: dispatchResult.reason || 'DISPATCH_FAILED'
      };
      return createSuccessResponse({ ...response }, context.requestId);
    }
  } catch (error) {
    ErrorService.capture('[TestInApp] Error:', error);
    const response: TestNotificationResult = {
      success: false,
      message: 'An error occurred while sending test in-app notification.',
      channel: 'inApp',
      sentAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
    return createSuccessResponse({ ...response }, context.requestId);
  }
}

export const POST = apiHandler(testInAppHandler, {
  allowedMethods: ['POST'],
  requireAuth: true,
  rbac: {
    action: 'write',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 5,
    windowMs: 60000 // Max 5 test notifications per minute
  }
});

// Method guards
const ALLOWED_METHODS = ['POST'];

export async function GET() {
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
