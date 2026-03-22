/**
 * User Referral Stats API Route
 *
 * GET /api/user/referral-stats - Get referral statistics for authenticated user's job referrals
 *
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_6_PLAN.md
 * @phase Jobs Phase 6B - Referral Stats
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/app/api/user/jobs/applied/route.ts - Canon pattern (auth required, user-scoped query)
 * @see src/app/api/jobs/refer/route.ts - user_referrals table query patterns
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

/**
 * GET /api/user/referral-stats
 * Return referral statistics for authenticated user's job referrals
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();

  // Aggregate referral stats from user_referrals where entity_type = 'job_posting'
  const statsResult = await db.query<{
    total_referrals: bigint | number;
    total_applied: bigint | number;
    total_hired: bigint | number;
    total_points_earned: bigint | number | null;
  }>(
    `SELECT
       COUNT(*) as total_referrals,
       SUM(CASE WHEN status IN ('applied', 'hired') THEN 1 ELSE 0 END) as total_applied,
       SUM(CASE WHEN status = 'hired' THEN 1 ELSE 0 END) as total_hired,
       SUM(CASE WHEN reward_status IN ('earned', 'redeemed') THEN reward_points ELSE 0 END) as total_points_earned
     FROM user_referrals
     WHERE referrer_user_id = ?
       AND job_id IS NOT NULL`,
    [user.id]
  );

  const row = statsResult.rows[0];
  const totalReferrals = bigIntToNumber(row?.total_referrals ?? 0);
  const totalApplied = bigIntToNumber(row?.total_applied ?? 0);
  const totalHired = bigIntToNumber(row?.total_hired ?? 0);
  const totalPointsEarned = bigIntToNumber(row?.total_points_earned ?? 0);

  // Calculate badges based on thresholds
  const badges: string[] = [];
  if (totalReferrals >= 5) badges.push('talent_scout');
  if (totalReferrals >= 15) badges.push('top_recruiter');
  if (totalReferrals >= 50) badges.push('hiring_hero');

  return createSuccessResponse({
    stats: {
      total_referrals: totalReferrals,
      total_applied: totalApplied,
      total_hired: totalHired,
      total_points_earned: totalPointsEarned,
      badges,
    }
  }, context.requestId);
});
