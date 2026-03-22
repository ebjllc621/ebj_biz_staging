/**
 * Admin Billing Cron - Campaign Balance Check
 * POST /api/admin/billing/cron/campaign-balance-check
 *
 * Checks campaign bank balances and notifies users when balances
 * are low (<=25% of total deposited) or depleted.
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

interface CampaignBankCheckRow {
  id: number;
  user_id: number;
  listing_id: number;
  balance: string;
  total_deposited: string;
  status: string;
}

/**
 * POST /api/admin/billing/cron/campaign-balance-check
 * Alerts users about low or depleted campaign bank balances.
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

  const banksResult = await db.query<CampaignBankCheckRow>(
    `SELECT id, user_id, listing_id, balance, total_deposited, status
     FROM campaign_banks
     WHERE status = 'active'`
  );

  const checked = banksResult.rows.length;
  let lowBalance = 0;
  let depleted = 0;
  const errors: { bankId: number; error: string }[] = [];

  for (const bank of banksResult.rows) {
    try {
      const balance = parseFloat(bank.balance);
      const totalDeposited = parseFloat(bank.total_deposited);

      if (balance <= 0) {
        // Mark as depleted and notify
        await db.query(
          `UPDATE campaign_banks SET status = 'depleted', updated_at = NOW() WHERE id = ?`,
          [bank.id]
        );
        depleted++;

        try {
          const { NotificationService } = await import('@core/services/NotificationService');
          const notificationService = new NotificationService(db);
          await notificationService.dispatch({
            type: 'billing.campaign_bank_depleted' as import('@core/services/notification/types').NotificationEventType,
            recipientId: bank.user_id,
            title: 'Campaign Balance Depleted',
            message: 'Your campaign bank balance has been fully used. Add funds to continue running campaigns.',
            actionUrl: '/dashboard/account/campaign-bank',
            priority: 'high'
          });
        } catch { /* Non-blocking */ }

      } else if (totalDeposited > 0 && balance <= totalDeposited * 0.25) {
        // Low balance — notify
        lowBalance++;

        try {
          const { NotificationService } = await import('@core/services/NotificationService');
          const notificationService = new NotificationService(db);
          await notificationService.dispatch({
            type: 'billing.campaign_bank_low' as import('@core/services/notification/types').NotificationEventType,
            recipientId: bank.user_id,
            title: 'Campaign Balance Running Low',
            message: `Your campaign bank balance is $${balance.toFixed(2)} — only ${Math.round((balance / totalDeposited) * 100)}% remaining.`,
            actionUrl: '/dashboard/account/campaign-bank',
            priority: 'normal'
          });
        } catch { /* Non-blocking */ }
      }
    } catch (err) {
      errors.push({
        bankId: bank.id,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return createSuccessResponse({
    checked,
    low_balance: lowBalance,
    depleted,
    errors
  }, context.requestId);
}));
