/**
 * Admin Analytics Overview API Route
 *
 * GET /api/admin/analytics/overview?range=30d
 * Returns platform-wide statistics aggregated from all services
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

interface GrowthDataRow {
  date: string;
  count: bigint | number;
}

interface RevenueRow {
  month: string;
  revenue: number;
}

interface CategoryRow {
  name: string;
  count: bigint | number;
}

interface TopListingRow {
  id: number;
  name: string;
  slug: string;
  views: bigint | number;
}

interface TopUserRow {
  id: number;
  name: string;
  username: string;
  listingCount: bigint | number;
}

interface TierRow {
  tier: string;
  count: bigint | number;
}

interface AddonDistributionRow {
  suite_name: string;
  display_name: string;
  count: bigint | number;
}

interface ComparisonRow {
  count: bigint | number;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);

  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const db = getDatabaseService();

  // Parse date range from query params
  const url = new URL(context.request.url);
  const range = url.searchParams.get('range') || '30d';

  // Calculate date interval based on range
  let dateInterval: string;
  let daysCount: number;
  switch (range) {
    case '7d':
      dateInterval = '7 DAY';
      daysCount = 7;
      break;
    case '90d':
      dateInterval = '90 DAY';
      daysCount = 90;
      break;
    case '1y':
      dateInterval = '365 DAY';
      daysCount = 365;
      break;
    default:
      dateInterval = '30 DAY';
      daysCount = 30;
  }

  // For comparison: previous period = (daysCount * 2) to daysCount days ago
  const prevPeriodStart = `${daysCount * 2} DAY`;
  const prevPeriodEnd = `${daysCount} DAY`;

  // Parallel queries for all statistics
  const [
    usersResult,
    listingsResult,
    subscriptionsResult,
    eventsResult,
    reviewsResult,
    userGrowthResult,
    listingGrowthResult,
    revenueResult,
    topCategoriesResult,
    topListingsResult,
    topUsersResult,
    tierDistributionResult,
    activeUsersResult,
    activeSessionsResult,
    // Comparison queries
    prevUsersResult,
    prevListingsResult,
    prevRevenueResult,
    currentPeriodUsersResult,
    currentPeriodListingsResult,
    // New KPI queries
    uniqueVisitorsResult,
    totalAddonsResult,
    addonDistributionResult
  ] = await Promise.all([
    // Total Users (active)
    db.query<{ count: bigint | number }>(
      'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
    ),

    // Total Listings (active)
    db.query<{ count: bigint | number }>(
      "SELECT COUNT(*) as count FROM listings WHERE status = 'active'"
    ),

    // Active Subscriptions (count listings with a tier assigned = subscribed)
    db.query<{ count: bigint | number }>(
      "SELECT COUNT(*) as count FROM listings WHERE status = 'active' AND tier IS NOT NULL"
    ),

    // Total Events (future)
    db.query<{ count: bigint | number }>(
      'SELECT COUNT(*) as count FROM events WHERE start_date >= CURDATE()'
    ),

    // Total Reviews (approved)
    db.query<{ count: bigint | number }>(
      "SELECT COUNT(*) as count FROM reviews WHERE status = 'approved'"
    ),

    // User Growth (registrations per day in range)
    db.query<GrowthDataRow>(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${dateInterval})
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `),

    // Listing Growth (new listings per day in range)
    db.query<GrowthDataRow>(`
      SELECT DATE(date_created) as date, COUNT(*) as count
      FROM listings
      WHERE date_created >= DATE_SUB(CURDATE(), INTERVAL ${dateInterval})
      GROUP BY DATE(date_created)
      ORDER BY date ASC
    `),

    // Revenue by Month (from subscription plans pricing * active subscriptions)
    db.query<RevenueRow>(`
      SELECT
        DATE_FORMAT(ls.started_at, '%Y-%m') as month,
        SUM(COALESCE(sp.pricing_monthly, 0)) as revenue
      FROM listing_subscriptions ls
      JOIN subscription_plans sp ON ls.plan_id = sp.id
      WHERE ls.started_at >= DATE_SUB(CURDATE(), INTERVAL ${dateInterval})
        AND ls.status = 'active'
      GROUP BY DATE_FORMAT(ls.started_at, '%Y-%m')
      ORDER BY month ASC
    `),

    // Top Categories (by listing count) - only show categories with active listings
    db.query<CategoryRow>(`
      SELECT c.name, COUNT(l.id) as count
      FROM categories c
      INNER JOIN listings l ON l.category_id = c.id AND l.status = 'active'
      GROUP BY c.id, c.name
      ORDER BY count DESC
      LIMIT 10
    `),

    // Top Listings (by actual analytics views, not stale view_count column)
    db.query<TopListingRow>(`
      SELECT l.id, l.name, l.slug, COUNT(alv.id) as views
      FROM listings l
      LEFT JOIN analytics_listing_views alv ON alv.listing_id = l.id
      WHERE l.status = 'active'
      GROUP BY l.id, l.name, l.slug
      HAVING views > 0
      ORDER BY views DESC
      LIMIT 10
    `),

    // Top Users (by listing count)
    db.query<TopUserRow>(`
      SELECT
        u.id,
        COALESCE(u.display_name, u.username, u.email) as name,
        u.username,
        COUNT(l.id) as listingCount
      FROM users u
      LEFT JOIN listings l ON l.user_id = u.id AND l.status = 'active'
      WHERE u.is_active = 1 AND u.role != 'admin'
      GROUP BY u.id, u.display_name, u.username, u.email
      HAVING listingCount > 0
      ORDER BY listingCount DESC
      LIMIT 10
    `),

    // Tier Distribution (from listings.tier column directly)
    db.query<TierRow>(`
      SELECT tier, COUNT(*) as count
      FROM listings
      WHERE status = 'active' AND tier IS NOT NULL
      GROUP BY tier
      ORDER BY count DESC
    `),

    // Active Visitors (all visitors with page views in last 5 minutes - auth + anon)
    db.query<{ count: bigint | number }>(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM analytics_page_views
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `),

    // Active Authenticated Users (logged-in users with page views in last 5 minutes)
    db.query<{ count: bigint | number }>(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM analytics_page_views
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        AND user_id IS NOT NULL
    `),

    // COMPARISON QUERIES - Previous period for trend analysis

    // Previous period: New users
    db.query<ComparisonRow>(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${prevPeriodStart})
        AND created_at < DATE_SUB(CURDATE(), INTERVAL ${prevPeriodEnd})
    `),

    // Previous period: New listings
    db.query<ComparisonRow>(`
      SELECT COUNT(*) as count
      FROM listings
      WHERE date_created >= DATE_SUB(CURDATE(), INTERVAL ${prevPeriodStart})
        AND date_created < DATE_SUB(CURDATE(), INTERVAL ${prevPeriodEnd})
    `),

    // Previous period: Revenue
    db.query<{ revenue: number }>(`
      SELECT SUM(COALESCE(sp.pricing_monthly, 0)) as revenue
      FROM listing_subscriptions ls
      JOIN subscription_plans sp ON ls.plan_id = sp.id
      WHERE ls.started_at >= DATE_SUB(CURDATE(), INTERVAL ${prevPeriodStart})
        AND ls.started_at < DATE_SUB(CURDATE(), INTERVAL ${prevPeriodEnd})
        AND ls.status = 'active'
    `),

    // Current period: New users (for comparison)
    db.query<ComparisonRow>(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${dateInterval})
    `),

    // Current period: New listings (for comparison)
    db.query<ComparisonRow>(`
      SELECT COUNT(*) as count
      FROM listings
      WHERE date_created >= DATE_SUB(CURDATE(), INTERVAL ${dateInterval})
    `),

    // NEW KPI QUERIES

    // Unique Visitors (distinct session_ids in page views within date range)
    db.query<{ count: bigint | number }>(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM analytics_page_views
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${dateInterval})
    `),

    // Total Active Add-ons
    db.query<{ count: bigint | number }>(`
      SELECT COUNT(*) as count
      FROM listing_subscription_addons
      WHERE status = 'active'
    `),

    // Add-on Distribution by Suite
    db.query<AddonDistributionRow>(`
      SELECT
        ads.suite_name,
        ads.display_name,
        COUNT(lsa.id) as count
      FROM addon_suites ads
      LEFT JOIN listing_subscription_addons lsa ON lsa.addon_suite_id = ads.id AND lsa.status = 'active'
      GROUP BY ads.id, ads.suite_name, ads.display_name
      ORDER BY count DESC
    `)
  ]);

  // Calculate total revenue from monthly data
  const revenueByMonth = (revenueResult.rows || []).map(row => ({
    month: row.month,
    revenue: Number(row.revenue) || 0
  }));
  const totalRevenue = revenueByMonth.reduce((sum, item) => sum + item.revenue, 0);

  // Calculate period-over-period comparison
  const currentUsers = bigIntToNumber(currentPeriodUsersResult.rows?.[0]?.count);
  const previousUsers = bigIntToNumber(prevUsersResult.rows?.[0]?.count);
  const currentListings = bigIntToNumber(currentPeriodListingsResult.rows?.[0]?.count);
  const previousListings = bigIntToNumber(prevListingsResult.rows?.[0]?.count);
  const previousRevenue = Number(prevRevenueResult.rows?.[0]?.revenue) || 0;

  // Calculate percentage changes (handle division by zero)
  const calcPercentChange = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  };

  const comparison = {
    users: {
      current: currentUsers,
      previous: previousUsers,
      change: calcPercentChange(currentUsers, previousUsers)
    },
    listings: {
      current: currentListings,
      previous: previousListings,
      change: calcPercentChange(currentListings, previousListings)
    },
    revenue: {
      current: totalRevenue,
      previous: previousRevenue,
      change: calcPercentChange(totalRevenue, previousRevenue)
    }
  };

  const statistics = {
    totalUsers: bigIntToNumber(usersResult.rows?.[0]?.count),
    totalListings: bigIntToNumber(listingsResult.rows?.[0]?.count),
    totalRevenue,
    activeSubscriptions: bigIntToNumber(subscriptionsResult.rows?.[0]?.count),
    totalEvents: bigIntToNumber(eventsResult.rows?.[0]?.count),
    totalReviews: bigIntToNumber(reviewsResult.rows?.[0]?.count),
    userGrowth: (userGrowthResult.rows || []).map(row => ({
      date: row.date,
      count: bigIntToNumber(row.count)
    })),
    listingGrowth: (listingGrowthResult.rows || []).map(row => ({
      date: row.date,
      count: bigIntToNumber(row.count)
    })),
    revenueByMonth,
    topCategories: (topCategoriesResult.rows || []).map(row => ({
      name: row.name,
      count: bigIntToNumber(row.count)
    })),
    topListings: (topListingsResult.rows || []).map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      views: bigIntToNumber(row.views)
    })),
    topUsers: (topUsersResult.rows || []).map(row => ({
      id: row.id,
      name: row.name,
      username: row.username,
      listingCount: bigIntToNumber(row.listingCount)
    })),
    tierDistribution: (tierDistributionResult.rows || []).map(row => ({
      tier: row.tier,
      count: bigIntToNumber(row.count)
    })),
    activeUsers: bigIntToNumber(activeUsersResult.rows?.[0]?.count),
    activeSessions: bigIntToNumber(activeSessionsResult.rows?.[0]?.count),
    // New KPIs
    uniqueVisitors: bigIntToNumber(uniqueVisitorsResult.rows?.[0]?.count),
    totalAddons: bigIntToNumber(totalAddonsResult.rows?.[0]?.count),
    addonDistribution: (addonDistributionResult.rows || []).map(row => ({
      suiteName: row.suite_name,
      displayName: row.display_name,
      count: bigIntToNumber(row.count)
    })),
    comparison
  };

  return createSuccessResponse({ statistics }, context.requestId);
});
