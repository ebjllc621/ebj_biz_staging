/**
 * Admin Billing Subscriptions API Route
 * GET /api/admin/billing/subscriptions - Paginated subscription list (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only (user.role === 'admin')
 * - Response format: { subscriptions: [], pagination: {} }
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
 * GET /api/admin/billing/subscriptions
 * Returns a paginated list of all listing subscriptions with plan, user, and listing info.
 *
 * Query params:
 *   page       - Page number (default 1)
 *   pageSize   - Items per page (default 20, max 100)
 *   status     - Filter by subscription status (active|cancelled|expired|suspended)
 *   tier       - Filter by plan tier (essentials|plus|preferred|premium)
 *   search     - Search by listing name or user email
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

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const status = url.searchParams.get('status') || null;
  const tier = url.searchParams.get('tier') || null;
  const search = url.searchParams.get('search') || null;

  const offset = (page - 1) * pageSize;

  const db = getDatabaseService();

  // Build WHERE clause dynamically
  const conditions: string[] = ['1=1'];
  const params: (string | number)[] = [];

  if (status) {
    conditions.push('ls.status = ?');
    params.push(status);
  }

  if (tier) {
    conditions.push('sp.tier = ?');
    params.push(tier);
  }

  if (search) {
    conditions.push('(l.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.join(' AND ');

  // Count query
  const countResult = await db.query<{ count: bigint | number }>(
    `SELECT COUNT(*) as count
     FROM listing_subscriptions ls
     JOIN subscription_plans sp ON ls.plan_id = sp.id
     JOIN listings l ON ls.listing_id = l.id
     JOIN users u ON l.user_id = u.id
     WHERE ${whereClause}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.count ?? 0);

  // Data query
  const dataResult = await db.query(
    `SELECT
       ls.id,
       ls.listing_id,
       ls.plan_id,
       ls.status,
       ls.billing_cycle,
       ls.current_period_start,
       ls.current_period_end,
       ls.next_billing_date,
       ls.created_at,
       ls.updated_at,
       sp.tier,
       sp.name as plan_name,
       sp.pricing_monthly,
       sp.pricing_annual,
       u.email as user_email,
       u.display_name as user_name,
       l.name as listing_name
     FROM listing_subscriptions ls
     JOIN subscription_plans sp ON ls.plan_id = sp.id
     JOIN listings l ON ls.listing_id = l.id
     JOIN users u ON l.user_id = u.id
     WHERE ${whereClause}
     ORDER BY ls.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return createSuccessResponse({
    subscriptions: dataResult.rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }, context.requestId);
});
