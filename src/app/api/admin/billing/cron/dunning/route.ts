/**
 * Admin Billing Cron - Dunning Processor
 * POST /api/admin/billing/cron/dunning
 *
 * Processes failed payment retry notifications and suspends subscriptions
 * after 3 failed payment attempts.
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only (user.role === 'admin')
 * - CSRF: MANDATORY (state-changing POST)
 * - Non-blocking notification dispatch (try/catch wrapped)
 * - Dynamic import for NotificationService (avoid circular deps)
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 7
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

interface FailedSubRow {
  id: number;
  user_id: number;
  listing_id: number;
  failed_payment_count: number;
  status: string;
}

/**
 * POST /api/admin/billing/cron/dunning
 * Processes failed payment subscriptions and sends dunning notifications.
 *
 * @csrf Required
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const db = getDatabaseService();

  const subsResult = await db.query<FailedSubRow>(
    `SELECT id, user_id, listing_id, failed_payment_count, status
     FROM listing_subscriptions
     WHERE failed_payment_count > 0 AND status = 'active'`
  );

  let processed = 0;
  let warningsSent = 0;
  let suspended = 0;
  const errors: { subscriptionId: number; error: string }[] = [];

  for (const sub of subsResult.rows) {
    try {
      const count = sub.failed_payment_count;

      if (count >= 3) {
        // Suspend subscription
        await db.query(
          `UPDATE listing_subscriptions SET status = 'suspended', updated_at = NOW() WHERE id = ?`,
          [sub.id]
        );
        suspended++;

        // Dispatch final warning notification (non-blocking)
        try {
          const { NotificationService } = await import('@core/services/NotificationService');
          const notificationService = new NotificationService(db);
          await notificationService.dispatch({
            type: 'billing.dunning_final_warning' as import('@core/services/notification/types').NotificationEventType,
            recipientId: sub.user_id,
            title: 'Subscription Suspended - Payment Action Required',
            message: 'Your subscription has been suspended due to repeated payment failures. Please update your payment method.',
            actionUrl: '/dashboard/account/payment-methods',
            priority: 'urgent'
          });
          warningsSent++;
        } catch { /* Non-blocking */ }

      } else if (count === 2) {
        try {
          const { NotificationService } = await import('@core/services/NotificationService');
          const notificationService = new NotificationService(db);
          await notificationService.dispatch({
            type: 'billing.dunning_attempt_2' as import('@core/services/notification/types').NotificationEventType,
            recipientId: sub.user_id,
            title: 'Payment Failed - Second Attempt',
            message: 'Your payment has failed a second time. Please update your payment method to avoid suspension.',
            actionUrl: '/dashboard/account/payment-methods',
            priority: 'high'
          });
          warningsSent++;
        } catch { /* Non-blocking */ }

      } else if (count === 1) {
        try {
          const { NotificationService } = await import('@core/services/NotificationService');
          const notificationService = new NotificationService(db);
          await notificationService.dispatch({
            type: 'billing.dunning_attempt_1' as import('@core/services/notification/types').NotificationEventType,
            recipientId: sub.user_id,
            title: 'Payment Failed',
            message: 'Your recent payment could not be processed. We will retry automatically.',
            actionUrl: '/dashboard/account/payment-methods',
            priority: 'high'
          });
          warningsSent++;
        } catch { /* Non-blocking */ }
      }

      processed++;
    } catch (err) {
      errors.push({
        subscriptionId: sub.id,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return createSuccessResponse({
    processed,
    warnings_sent: warningsSent,
    suspended,
    errors
  }, context.requestId);
}));
