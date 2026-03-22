/**
 * Admin Listing Statistics API Route
 *
 * GET /api/admin/listings/statistics - Get platform-wide listing statistics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Database: DatabaseService boundary
 *
 * @authority CLAUDE.md - API Standards
 * @authority admin-build-map-v2.1.mdc - Admin API patterns
 * @governance PHASE_1_STATISTICS_BRAIN_PLAN.md
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

// Type for COUNT query results
interface CountRow {
  count: bigint | number;
}

interface TierCountRow {
  tier: string;
  count: bigint | number;
}

interface StatusCountRow {
  status: string;
  count: bigint | number;
}

/**
 * GET /api/admin/listings/statistics
 * Get platform-wide listing statistics for admin sidebar
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('access listing statistics', 'admin');
  }

  const db = getDatabaseService();

  // Total listings
  const totalResult = await db.query<CountRow>(
    'SELECT COUNT(*) as count FROM listings'
  );
  const total = bigIntToNumber(totalResult.rows[0]?.count);

  // Active in last 30 days
  const activeResult = await db.query<CountRow>(
    `SELECT COUNT(*) as count FROM listings
     WHERE last_update >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );
  const active_30d = bigIntToNumber(activeResult.rows[0]?.count);

  // Unclaimed listings (claimed = 0 or claimed = false)
  const unclaimedResult = await db.query<CountRow>(
    'SELECT COUNT(*) as count FROM listings WHERE claimed = 0'
  );
  const unclaimed = bigIntToNumber(unclaimedResult.rows[0]?.count);

  // Claims awaiting approval (verification_pending or under_review status)
  const claimsAwaitingResult = await db.query<CountRow>(
    `SELECT COUNT(*) as count FROM listing_claims
     WHERE status IN ('verification_pending', 'under_review')`
  );
  const claims_awaiting_approval = bigIntToNumber(claimsAwaitingResult.rows[0]?.count);

  // By tier
  const tierResult = await db.query<TierCountRow>(
    'SELECT tier, COUNT(*) as count FROM listings GROUP BY tier'
  );
  const by_tier: Record<string, number> = {
    essentials: 0,
    plus: 0,
    preferred: 0,
    premium: 0
  };
  tierResult.rows.forEach((row: TierCountRow) => {
    by_tier[row.tier] = bigIntToNumber(row.count);
  });

  // By status
  const statusResult = await db.query<StatusCountRow>(
    'SELECT status, COUNT(*) as count FROM listings GROUP BY status'
  );
  const by_status: Record<string, number> = {
    active: 0,
    inactive: 0,
    pending: 0,
    suspended: 0
  };
  statusResult.rows.forEach((row: StatusCountRow) => {
    by_status[row.status] = bigIntToNumber(row.count);
  });

  return createSuccessResponse({
    statistics: {
      total,
      active_30d,
      unclaimed,
      claims_awaiting_approval,
      by_tier,
      by_status
    }
  }, 200);
});
