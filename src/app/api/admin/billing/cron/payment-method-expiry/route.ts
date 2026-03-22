/**
 * Admin Billing Cron - Payment Method Expiry Check
 * POST /api/admin/billing/cron/payment-method-expiry
 *
 * Checks for payment methods expiring within the next 30 days
 * and notifies users.
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

interface ExpiringPaymentMethodRow {
  id: number;
  user_id: number;
  exp_year: number;
  exp_month: number;
  last_four: string;
}

/**
 * POST /api/admin/billing/cron/payment-method-expiry
 * Warns users about payment methods expiring within 30 days.
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

  // Find payment methods expiring within the next 30 days
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()); // ~30 days ahead
  const cutoffYear = cutoff.getFullYear();
  const cutoffMonth = cutoff.getMonth() + 1; // 1-indexed

  const pmResult = await db.query<ExpiringPaymentMethodRow>(
    `SELECT id, user_id, exp_year, exp_month, last_four
     FROM payment_methods
     WHERE is_active = 1
       AND (
         exp_year < ?
         OR (exp_year = ? AND exp_month <= ?)
       )`,
    [cutoffYear, cutoffYear, cutoffMonth]
  );

  const checked = pmResult.rows.length;
  let notified = 0;
  const errors: { paymentMethodId: number; error: string }[] = [];

  for (const pm of pmResult.rows) {
    try {
      // Non-blocking notification dispatch
      try {
        const { NotificationService } = await import('@core/services/NotificationService');
        const notificationService = new NotificationService(db);
        await notificationService.dispatch({
          type: 'billing.payment_method_expiring' as import('@core/services/notification/types').NotificationEventType,
          recipientId: pm.user_id,
          title: 'Payment Method Expiring Soon',
          message: `Your card ending in ${pm.last_four} expires ${pm.exp_month}/${pm.exp_year}. Please update your payment method.`,
          actionUrl: '/dashboard/account/payment-methods',
          priority: 'normal'
        });
        notified++;
      } catch { /* Non-blocking */ }
    } catch (err) {
      errors.push({
        paymentMethodId: pm.id,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return createSuccessResponse({
    checked,
    expiring: checked,
    notified,
    errors
  }, context.requestId);
}));
