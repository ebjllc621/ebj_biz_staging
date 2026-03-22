/**
 * Admin Analytics Real-Time Metrics API Route
 *
 * GET /api/admin/analytics/realtime
 * Returns real-time active users and sessions
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { RowDataPacket } from '@core/types/mariadb-compat';
import { bigIntToNumber } from '@core/utils/bigint';

export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();

  // Real-time metrics from analytics_page_views (tracks ALL visitors including anonymous)
  // Uses 5-minute window for "active now" definition

  // Active Visitors: Count distinct session_ids with page views in last 5 minutes
  // Includes both authenticated (auth_*) and anonymous (anon_*) sessions
  const activeVisitorsQuery = await db.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT session_id) as activeVisitors
     FROM analytics_page_views
     WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
    []
  );

  // Active Authenticated Users: Count distinct user_ids with page views in last 5 minutes
  const activeAuthUsersQuery = await db.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT user_id) as activeAuthUsers
     FROM analytics_page_views
     WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       AND user_id IS NOT NULL`,
    []
  );

  // Total page views in last 5 minutes (activity indicator)
  const recentPageViewsQuery = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) as recentPageViews
     FROM analytics_page_views
     WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
    []
  );

  const activeVisitorsRow = activeVisitorsQuery.rows[0] as { activeVisitors?: bigint | number } | undefined;
  const activeAuthUsersRow = activeAuthUsersQuery.rows[0] as { activeAuthUsers?: bigint | number } | undefined;
  const recentPageViewsRow = recentPageViewsQuery.rows[0] as { recentPageViews?: bigint | number } | undefined;

  const activeVisitors = bigIntToNumber(activeVisitorsRow?.activeVisitors);
  const activeAuthUsers = bigIntToNumber(activeAuthUsersRow?.activeAuthUsers);
  const recentPageViews = bigIntToNumber(recentPageViewsRow?.recentPageViews);

  return createSuccessResponse({
    // For backwards compatibility, map to existing field names
    activeUsers: activeVisitors,      // Total visitors (auth + anon)
    activeSessions: activeVisitors,   // Same as activeUsers for now
    // New detailed metrics
    activeVisitors,                   // All visitors
    activeAuthUsers,                  // Only logged-in users
    recentPageViews,                  // Activity level indicator
    timestamp: new Date().toISOString()
  }, context.requestId);
});
