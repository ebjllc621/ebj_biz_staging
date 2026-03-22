/**
 * Admin Notification Troubleshoot - Retry Endpoint
 *
 * POST /api/admin/notifications/troubleshoot/retry
 * Re-dispatch a notification to specific channels
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Re-triggers notification dispatch
 *
 * @phase Phase 5 - Troubleshooting Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { NotificationService } from '@core/services/NotificationService';
import { NotificationPreferencesService } from '@core/services/NotificationPreferencesService';
import { PushDeviceService } from '@core/services/notification/PushDeviceService';
import { EmailNotificationService } from '@core/services/notification/EmailNotificationService';
import type { TroubleshootRetryResponse } from '@core/types/notification-admin';
import type { NotificationEvent } from '@core/services/notification/types';
import { ErrorService } from '@core/services/ErrorService';

interface RetryRequestBody {
  notificationId: number;
  channels?: ('push' | 'email')[];
}

/**
 * POST /api/admin/notifications/troubleshoot/retry
 * Re-dispatch notification
 */
async function retryHandler(context: ApiContext) {
  const body = await context.request.json() as RetryRequestBody;
  const { notificationId } = body;

  if (!notificationId) {
    throw new BizError({
      code: 'VALIDATION_ERROR',
      message: 'notificationId is required'
    });
  }

  const db = getDatabaseService();

  // 1. Get original notification
  const notificationResult = await db.query<{
    id: number;
    user_id: number;
    notification_type: string;
    category: string;
    title: string;
    message: string | null;
    action_url: string | null;
    priority: string;
    created_at: Date;
  }>(
    `SELECT id, user_id, notification_type, category, title, message, action_url, priority, created_at
     FROM user_notifications WHERE id = ?`,
    [notificationId]
  );

  if (notificationResult.rows.length === 0) {
    throw new BizError({
      code: 'NOT_FOUND',
      message: 'Notification not found'
    });
  }

  const original = notificationResult.rows[0]!;

  // 2. Check if notification is too old (7 days)
  const ageMs = Date.now() - new Date(original.created_at).getTime();
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;

  if (ageMs > maxAgeMs) {
    throw new BizError({
      code: 'RETRY_NOT_ALLOWED',
      message: 'Notification is too old to retry (max 7 days)'
    });
  }

  // 3. Initialize services
  const preferencesService = new NotificationPreferencesService(db);
  const pushService = new PushDeviceService(db);
  const emailService = new EmailNotificationService(db);
  const notificationService = new NotificationService(
    db,
    preferencesService,
    pushService,
    emailService
  );

  // 4. Re-create event from original notification
  const event: NotificationEvent = {
    type: original.notification_type as NotificationEvent['type'],
    recipientId: original.user_id,
    title: original.title,
    message: original.message || undefined,
    actionUrl: original.action_url || undefined,
    priority: (original.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
    metadata: {
      retryOf: notificationId,
      retryAt: new Date().toISOString()
    }
  };

  // 5. Dispatch (creates new notification)
  const channelsAttempted: string[] = [];
  const channelsSucceeded: string[] = [];
  let newNotificationId: number | undefined;

  try {
    const result = await notificationService.dispatch(event);

    if (result.dispatched && result.notificationId) {
      newNotificationId = result.notificationId;
      channelsAttempted.push('in_app');
      channelsSucceeded.push('in_app');

      if (result.channels?.includes('push')) {
        channelsAttempted.push('push');
        channelsSucceeded.push('push');
      }
      if (result.channels?.includes('email')) {
        channelsAttempted.push('email');
        channelsSucceeded.push('email');
      }
    }
  } catch (error) {
    ErrorService.capture('[Troubleshoot] Retry failed:', error);
    throw new BizError({
      code: 'RETRY_FAILED',
      message: error instanceof Error ? error.message : 'Failed to retry notification'
    });
  }

  const response: TroubleshootRetryResponse = {
    success: channelsSucceeded.length > 0,
    message: channelsSucceeded.length > 0
      ? `Notification re-dispatched to ${channelsSucceeded.join(', ')}`
      : 'No channels succeeded',
    notificationId,
    newNotificationId,
    channelsAttempted,
    channelsSucceeded
  };

  return createSuccessResponse({ ...response }, context.requestId);
}

export const POST = apiHandler(retryHandler, {
  allowedMethods: ['POST'],
  requireAuth: true,
  rbac: {
    action: 'write',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 10,
    windowMs: 60000
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
