/**
 * Admin Subscription Analytics API Route
 *
 * GET /api/admin/analytics/subscriptions?range=30d
 * Returns platform-wide content follow/subscription statistics
 *
 * @tier ADVANCED
 * @phase Tier 4 Phase 9
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

interface FollowTypeRow {
  follow_type: string;
  cnt: bigint | number;
}

interface FrequencyRow {
  notification_frequency: string;
  cnt: bigint | number;
}

interface TopListingRow {
  target_id: number;
  name: string;
  cnt: bigint | number;
}

interface GrowthRow {
  date: string;
  cnt: bigint | number;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);

  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const db = getDatabaseService();

  // Parse date range
  const url = new URL(context.request.url);
  const range = url.searchParams.get('range') || '30d';

  let dateInterval: string;
  switch (range) {
    case '7d': dateInterval = '7 DAY'; break;
    case '90d': dateInterval = '90 DAY'; break;
    case '1y': dateInterval = '365 DAY'; break;
    default: dateInterval = '30 DAY';
  }

  const [
    totalFollowsResult,
    totalActiveFollowsResult,
    uniqueFollowersResult,
    followsByTypeResult,
    followsByFrequencyResult,
    topFollowedListingsResult,
    growthTrendResult,
    unfollowTrendResult,
  ] = await Promise.all([
    db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) as cnt FROM content_follows'
    ),
    db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) as cnt FROM content_follows WHERE is_active = 1'
    ),
    db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(DISTINCT user_id) as cnt FROM content_follows WHERE is_active = 1'
    ),
    db.query<FollowTypeRow>(
      `SELECT follow_type, COUNT(*) as cnt FROM content_follows
       WHERE is_active = 1 GROUP BY follow_type`
    ),
    db.query<FrequencyRow>(
      `SELECT notification_frequency, COUNT(*) as cnt FROM content_follows
       WHERE is_active = 1 GROUP BY notification_frequency`
    ),
    db.query<TopListingRow>(
      `SELECT cf.target_id, l.name, COUNT(*) as cnt
       FROM content_follows cf
       JOIN listings l ON cf.target_id = l.id
       WHERE cf.follow_type = 'business' AND cf.is_active = 1
       GROUP BY cf.target_id, l.name
       ORDER BY cnt DESC LIMIT 10`
    ),
    db.query<GrowthRow>(
      `SELECT DATE(created_at) as date, COUNT(*) as cnt
       FROM content_follows
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${dateInterval})
       GROUP BY DATE(created_at) ORDER BY date`
    ),
    db.query<GrowthRow>(
      `SELECT DATE(updated_at) as date, COUNT(*) as cnt
       FROM content_follows
       WHERE is_active = 0 AND updated_at >= DATE_SUB(CURDATE(), INTERVAL ${dateInterval})
       GROUP BY DATE(updated_at) ORDER BY date`
    ),
  ]);

  const statistics = {
    totalFollows: bigIntToNumber(totalFollowsResult.rows[0]?.cnt ?? 0),
    totalActiveFollows: bigIntToNumber(totalActiveFollowsResult.rows[0]?.cnt ?? 0),
    uniqueFollowers: bigIntToNumber(uniqueFollowersResult.rows[0]?.cnt ?? 0),
    followsByType: (followsByTypeResult.rows || []).map(row => ({
      followType: row.follow_type,
      count: bigIntToNumber(row.cnt),
    })),
    followsByFrequency: (followsByFrequencyResult.rows || []).map(row => ({
      frequency: row.notification_frequency,
      count: bigIntToNumber(row.cnt),
    })),
    topFollowedListings: (topFollowedListingsResult.rows || []).map(row => ({
      listingId: row.target_id,
      name: row.name,
      count: bigIntToNumber(row.cnt),
    })),
    growthTrend: (growthTrendResult.rows || []).map(row => ({
      date: row.date,
      count: bigIntToNumber(row.cnt),
    })),
    unfollowTrend: (unfollowTrendResult.rows || []).map(row => ({
      date: row.date,
      count: bigIntToNumber(row.cnt),
    })),
  };

  return createSuccessResponse({ statistics }, context.requestId);
});
