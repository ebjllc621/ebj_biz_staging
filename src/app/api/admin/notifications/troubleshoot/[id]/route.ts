/**
 * Admin Notification Troubleshoot - Detail Endpoint
 *
 * GET /api/admin/notifications/troubleshoot/[id]
 * Returns full delivery chain for a specific notification
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Returns comprehensive delivery timeline
 *
 * @phase Phase 5 - Troubleshooting Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { NextRequest } from 'next/server';
import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import type { TroubleshootNotificationDetail, DeliveryChainEvent } from '@core/types/notification-admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/notifications/troubleshoot/[id]
 * Get full notification detail with delivery chain
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return apiHandler(
    async (ctx) => {
      const params = await context.params;
      const notificationId = parseInt(params.id, 10);

      if (isNaN(notificationId)) {
        throw new BizError({
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification ID'
        });
      }

      const db = getDatabaseService();

      // Get notification with user info
      const notificationResult = await db.query<{
        id: number;
        user_id: number;
        notification_type: string;
        category: string;
        title: string;
        message: string | null;
        action_url: string | null;
        priority: string;
        is_read: number;
        read_at: Date | null;
        created_at: Date;
        user_email: string;
        user_first_name: string;
        user_last_name: string;
      }>(
        `SELECT
           un.id,
           un.user_id,
           un.notification_type,
           un.category,
           un.title,
           un.message,
           un.action_url,
           un.priority,
           un.is_read,
           un.read_at,
           un.created_at,
           u.email as user_email,
           u.first_name as user_first_name,
           u.last_name as user_last_name
         FROM user_notifications un
         JOIN users u ON u.id = un.user_id
         WHERE un.id = ?`,
        [notificationId]
      );

      if (notificationResult.rows.length === 0) {
        throw new BizError({
          code: 'NOT_FOUND',
          message: 'Notification not found'
        });
      }

      const notification = notificationResult.rows[0]!;
      const createdAt = new Date(notification.created_at);
      const ageMinutes = Math.round((Date.now() - createdAt.getTime()) / 60000);

      // Build delivery chain
      const deliveryChain: DeliveryChainEvent[] = [];

      // 1. In-app creation event
      deliveryChain.push({
        channel: 'in_app',
        action: 'created',
        timestamp: createdAt.toISOString(),
        status: 'success',
        details: 'Notification created and stored'
      });

      // 2. Check if read
      if (notification.is_read && notification.read_at) {
        deliveryChain.push({
          channel: 'in_app',
          action: 'read',
          timestamp: new Date(notification.read_at).toISOString(),
          status: 'success',
          details: 'User read the notification'
        });
      }

      // 3. Check email logs
      const emailResult = await db.query<{
        status: string;
        email_type: string;
        sent_at: Date | null;
        error_message: string | null;
        created_at: Date;
      }>(
        `SELECT status, email_type, sent_at, error_message, created_at
         FROM notification_email_logs
         WHERE notification_id = ?
         ORDER BY created_at ASC`,
        [notificationId]
      );

      for (const emailLog of emailResult.rows) {
        const action = emailLog.status === 'sent' ? 'sent' :
                       emailLog.status === 'failed' ? 'failed' :
                       emailLog.status === 'queued' ? 'queued' : 'skipped';

        deliveryChain.push({
          channel: 'email',
          action,
          timestamp: (emailLog.sent_at || emailLog.created_at).toISOString(),
          status: emailLog.status === 'sent' ? 'success' :
                  emailLog.status === 'failed' ? 'failure' : 'pending',
          details: emailLog.error_message || `${emailLog.email_type} email ${emailLog.status}`,
          metadata: {
            emailType: emailLog.email_type
          }
        });
      }

      // 4. Check email queue for pending digest
      const queueResult = await db.query<{
        scheduled_for: Date;
        created_at: Date;
      }>(
        `SELECT scheduled_for, created_at
         FROM notification_email_queue
         WHERE notification_id = ? AND processed_at IS NULL`,
        [notificationId]
      );

      for (const queueItem of queueResult.rows) {
        deliveryChain.push({
          channel: 'email',
          action: 'queued',
          timestamp: queueItem.created_at.toISOString(),
          status: 'pending',
          details: `Queued for digest delivery`,
          metadata: {
            scheduledFor: queueItem.scheduled_for.toISOString()
          }
        });
      }

      // Sort delivery chain by timestamp
      deliveryChain.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Determine retry eligibility
      const isOld = ageMinutes > 60 * 24 * 7; // Older than 7 days
      const retryEligible = !isOld;
      const retryReason = isOld ? 'Notification is older than 7 days' : null;

      // Determine delivery status
      let emailStatus: 'sent' | 'queued' | 'failed' | 'skipped' | null = null;
      if (emailResult.rows.length > 0) {
        const lastEmail = emailResult.rows[emailResult.rows.length - 1]!;
        const status = lastEmail.status;
        if (status === 'sent' || status === 'queued' || status === 'failed' || status === 'skipped') {
          emailStatus = status;
        }
      } else if (queueResult.rows.length > 0) {
        emailStatus = 'queued';
      }

      const detail: TroubleshootNotificationDetail = {
        id: notification.id,
        type: notification.notification_type,
        category: notification.category || 'general',
        title: notification.title,
        message: notification.message,
        actionUrl: notification.action_url,
        priority: (notification.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
        isRead: notification.is_read === 1,
        readAt: notification.read_at?.toISOString() ?? null,
        createdAt: createdAt.toISOString(),
        ageMinutes,
        deliveryStatus: {
          inApp: 'delivered',
          push: null,
          email: emailStatus
        },
        user: {
          id: notification.user_id,
          email: notification.user_email,
          name: `${notification.user_first_name} ${notification.user_last_name}`.trim()
        },
        deliveryChain,
        retryEligible,
        retryReason
      };

      return createSuccessResponse({ ...detail }, ctx.requestId);
    },
    {
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
    }
  )(request);
}

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
