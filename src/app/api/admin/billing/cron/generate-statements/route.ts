/**
 * Admin Billing Cron - Generate Monthly Statements
 * POST /api/admin/billing/cron/generate-statements
 *
 * Aggregates billing transactions for the previous month and upserts
 * monthly_statements records for all users with transactions.
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only (user.role === 'admin')
 * - CSRF: MANDATORY (state-changing POST)
 * - ON DUPLICATE KEY UPDATE for idempotency
 * - SUM(amount) grouped by transaction_type
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 5
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

function getPreviousMonth(): string {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * POST /api/admin/billing/cron/generate-statements
 * Generates monthly statements for ALL users who had transactions in the previous month.
 *
 * Idempotent: uses ON DUPLICATE KEY UPDATE so safe to re-run.
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

  const targetMonth = getPreviousMonth();
  const db = getDatabaseService();

  // Find all distinct user_ids with transactions for that month
  type UserRow = { user_id: number };
  const usersResult = await db.query<UserRow>(
    `SELECT DISTINCT user_id FROM billing_transactions WHERE statement_month = ?`,
    [targetMonth]
  );

  const userIds = usersResult.rows.map(r => r.user_id);
  let processed = 0;
  let failed = 0;
  const errors: { userId: number; error: string }[] = [];

  for (const userId of userIds) {
    try {
      // Aggregate by transaction_type
      type AggRow = { transaction_type: string; total: string };
      const aggResult = await db.query<AggRow>(
        `SELECT transaction_type, SUM(amount) as total
         FROM billing_transactions
         WHERE user_id = ? AND statement_month = ?
         GROUP BY transaction_type`,
        [userId, targetMonth]
      );

      let subscriptionCharges = 0;
      let addonCharges = 0;
      let campaignBankDeposits = 0;
      let campaignBankSpend = 0;
      let refunds = 0;
      let credits = 0;
      let adjustments = 0;

      for (const row of aggResult.rows) {
        const amount = parseFloat(row.total) || 0;
        switch (row.transaction_type) {
          case 'subscription':
          case 'subscription_upgrade':
          case 'subscription_downgrade':
            subscriptionCharges += amount;
            break;
          case 'addon':
            addonCharges += amount;
            break;
          case 'campaign_bank_deposit':
            campaignBankDeposits += amount;
            break;
          case 'campaign_bank_spend':
            campaignBankSpend += amount;
            break;
          case 'refund':
            refunds += amount;
            break;
          case 'credit':
            credits += amount;
            break;
          case 'adjustment':
            adjustments += amount;
            break;
          default:
            break;
        }
      }

      const totalCharges = subscriptionCharges + addonCharges + campaignBankDeposits + campaignBankSpend
        - refunds - credits + adjustments;

      // Upsert — idempotent via ON DUPLICATE KEY UPDATE
      await db.query(
        `INSERT INTO monthly_statements
           (user_id, statement_month, subscription_charges, addon_charges, campaign_bank_deposits,
            campaign_bank_spend, refunds, credits, adjustments, total_charges, amount_due, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
         ON DUPLICATE KEY UPDATE
           subscription_charges = VALUES(subscription_charges),
           addon_charges = VALUES(addon_charges),
           campaign_bank_deposits = VALUES(campaign_bank_deposits),
           campaign_bank_spend = VALUES(campaign_bank_spend),
           refunds = VALUES(refunds),
           credits = VALUES(credits),
           adjustments = VALUES(adjustments),
           total_charges = VALUES(total_charges),
           amount_due = VALUES(amount_due),
           updated_at = current_timestamp()`,
        [
          userId, targetMonth,
          subscriptionCharges, addonCharges, campaignBankDeposits,
          campaignBankSpend, refunds, credits, adjustments, totalCharges,
          totalCharges
        ]
      );

      processed++;
    } catch (err) {
      failed++;
      errors.push({
        userId,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return createSuccessResponse({
    month: targetMonth,
    processed,
    failed,
    errors
  }, context.requestId);
}));
