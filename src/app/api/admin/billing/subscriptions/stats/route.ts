/**
 * Admin Billing Subscriptions Stats API Route
 * GET /api/admin/billing/subscriptions/stats - Subscription distribution stats (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only (user.role === 'admin')
 * - Response format: { stats: { byTier, byStatus, byBillingCycle } }
 * - bigIntToNumber: MANDATORY for COUNT results
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
 * GET /api/admin/billing/subscriptions/stats
 * Returns subscription distribution statistics by tier, status, and billing cycle.
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

  // By tier (active only)
  const byTierResult = await db.query<{ tier: string; count: bigint | number }>(
    `SELECT sp.tier, COUNT(*) as count
     FROM listing_subscriptions ls
     JOIN subscription_plans sp ON ls.plan_id = sp.id
     WHERE ls.status = 'active'
     GROUP BY sp.tier`
  );

  // By status (all)
  const byStatusResult = await db.query<{ status: string; count: bigint | number }>(
    `SELECT status, COUNT(*) as count FROM listing_subscriptions GROUP BY status`
  );

  // By billing cycle (active only)
  const byBillingCycleResult = await db.query<{ billing_cycle: string; count: bigint | number }>(
    `SELECT billing_cycle, COUNT(*) as count
     FROM listing_subscriptions
     WHERE status = 'active'
     GROUP BY billing_cycle`
  );

  const byTier = byTierResult.rows.map((row) => ({
    tier: row.tier,
    count: bigIntToNumber(row.count)
  }));

  const byStatus = byStatusResult.rows.map((row) => ({
    status: row.status,
    count: bigIntToNumber(row.count)
  }));

  const byBillingCycle = byBillingCycleResult.rows.map((row) => ({
    billing_cycle: row.billing_cycle,
    count: bigIntToNumber(row.count)
  }));

  return createSuccessResponse({
    stats: {
      byTier,
      byStatus,
      byBillingCycle
    }
  }, context.requestId);
});
