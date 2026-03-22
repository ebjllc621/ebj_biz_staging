/**
 * Admin Billing Stats API Route
 * GET /api/admin/billing/stats - Aggregate billing statistics (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only (user.role === 'admin')
 * - Response format: { stats: { subscriptions, revenue, transactions, paymentMethods } }
 * - bigIntToNumber: MANDATORY for all COUNT/SUM results
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 3A
 */

import { NextRequest } from 'next/server';
import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

/**
 * GET /api/admin/billing/stats
 * Returns aggregate billing statistics for the admin overview dashboard.
 */
export const GET = apiHandler(async (context) => {
  // Authentication
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const db = getDatabaseService();

  // 1. Subscription counts grouped by status
  const subscriptionResult = await db.query<{ status: string; count: bigint | number }>(
    `SELECT status, COUNT(*) as count FROM listing_subscriptions GROUP BY status`
  );

  const subscriptionCounts: Record<string, number> = {
    total: 0,
    active: 0,
    cancelled: 0,
    expired: 0,
    suspended: 0
  };

  for (const row of subscriptionResult.rows) {
    const count = bigIntToNumber(row.count);
    subscriptionCounts['total'] = (subscriptionCounts['total'] ?? 0) + count;
    if (row.status in subscriptionCounts) {
      subscriptionCounts[row.status] = count;
    }
  }

  // 2. Total revenue (completed transactions)
  const totalRevenueResult = await db.query<{ total: string | number | null }>(
    `SELECT SUM(amount) as total FROM billing_transactions WHERE status = 'completed'`
  );
  const totalRevenue = parseFloat(String(totalRevenueResult.rows[0]?.total ?? '0')) || 0;

  // 3. Monthly revenue (current month)
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyRevenueResult = await db.query<{ total: string | number | null }>(
    `SELECT SUM(amount) as total FROM billing_transactions WHERE status = 'completed' AND statement_month = ?`,
    [currentMonth]
  );
  const monthlyRevenue = parseFloat(String(monthlyRevenueResult.rows[0]?.total ?? '0')) || 0;

  // 4. Total transactions count
  const totalTransactionResult = await db.query<{ count: bigint | number }>(
    `SELECT COUNT(*) as count FROM billing_transactions`
  );
  const totalTransactions = bigIntToNumber(totalTransactionResult.rows[0]?.count ?? 0);

  // 5. Average transaction (completed)
  const avgTransactionResult = await db.query<{ avg: string | number | null }>(
    `SELECT AVG(amount) as avg FROM billing_transactions WHERE status = 'completed'`
  );
  const avgTransaction = parseFloat(String(avgTransactionResult.rows[0]?.avg ?? '0')) || 0;

  // 6. Total payment methods count
  const paymentMethodResult = await db.query<{ count: bigint | number }>(
    `SELECT COUNT(*) as count FROM payment_methods`
  );
  const totalPaymentMethods = bigIntToNumber(paymentMethodResult.rows[0]?.count ?? 0);

  return createSuccessResponse({
    stats: {
      subscriptions: {
        total: subscriptionCounts['total'] ?? 0,
        active: subscriptionCounts['active'] ?? 0,
        cancelled: subscriptionCounts['cancelled'] ?? 0,
        expired: subscriptionCounts['expired'] ?? 0,
        suspended: subscriptionCounts['suspended'] ?? 0
      },
      revenue: {
        total: totalRevenue,
        thisMonth: monthlyRevenue,
        avgTransaction
      },
      transactions: {
        total: totalTransactions
      },
      paymentMethods: {
        total: totalPaymentMethods
      }
    }
  }, context.requestId);
});
