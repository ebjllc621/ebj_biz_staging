/**
 * Admin Dashboard Stats API
 *
 * GET /api/admin/dashboard
 * Returns aggregate stats, page view analytics, and recent activity for dashboard
 *
 * @authority PHASE_5_DASHBOARD_ENHANCEMENT_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

interface PageViewStat {
  page_type: string;
  view_count: number;
  percentage: number;
}

interface AdminActivityEntry {
  id: number;
  admin_user_id: number;
  admin_name: string;
  action_type: string;
  action_category: string;
  action_description: string;
  target_entity_type: string;
  target_entity_id: number | null;
  severity: string;
  created_at: string;
}

interface LoggedInUserEntry {
  session_id: string;
  user_id: number;
  user_name: string;
  email: string;
  role: string;
  last_activity: string;
  created_at: string;
  expires_at: string;
  ip_coarse: string | null;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);

  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const db = getDatabaseService();

  // Get time range from query params (default 24 hours)
  const url = new URL(context.request.url);
  const hours = parseInt(url.searchParams.get('hours') || '24', 10);

  // Parallel queries for all KPIs and data
  const [
    usersResult,
    listingsResult,
    reviewsResult,
    eventsResult,
    uniqueVisitorsResult,
    activeSessionsResult,
    activeOffersResult,
    pendingClaimsResult,
    pendingListingsResult,
    pendingEventsResult,
    pendingContentResult,
    newUsersResult,
    pageViewsResult,
    totalPageViewsResult,
    topUrlsResult,
    activityResult,
    adminActivityResult,
    loggedInUsersResult
  ] = await Promise.all([
    // KPI 1: Total Users
    db.query<{ count: bigint | number }>('SELECT COUNT(*) as count FROM users WHERE is_active = 1'),

    // KPI 2: Total Listings (active listings)
    db.query<{ count: bigint | number }>("SELECT COUNT(*) as count FROM listings WHERE status = 'active'"),

    // KPI 3: Pending Reviews
    db.query<{ count: bigint | number }>("SELECT COUNT(*) as count FROM reviews WHERE status = 'pending'"),

    // KPI 4: Upcoming Events (all future events)
    db.query<{ count: bigint | number }>('SELECT COUNT(*) as count FROM events WHERE start_date >= CURDATE()'),

    // KPI 5: Unique Visitors (distinct IPs/sessions in time range)
    db.query<{ count: bigint | number }>(`
      SELECT COUNT(DISTINCT COALESCE(session_id, ip_address)) as count
      FROM analytics_page_views
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${hours} HOUR)
    `),

    // KPI 6: Active Sessions
    db.query<{ count: bigint | number }>('SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW() AND revoked_at IS NULL'),

    // KPI 7: Active Offers
    db.query<{ count: bigint | number }>("SELECT COUNT(*) as count FROM offers WHERE status = 'active' AND end_date >= CURDATE()"),

    // KPI 8: Pending Claims
    db.query<{ count: bigint | number }>("SELECT COUNT(*) as count FROM listing_claims WHERE status = 'pending'"),

    // Quick Action Badges: Pending Listings (awaiting approval)
    db.query<{ count: bigint | number }>("SELECT COUNT(*) as count FROM listings WHERE approved = 'pending'"),

    // Quick Action Badges: Events pending moderation
    db.query<{ count: bigint | number }>("SELECT COUNT(*) as count FROM events WHERE status = 'pending_moderation'"),

    // Quick Action Badges: Pending content (articles + podcasts + videos)
    db.query<{ count: bigint | number }>(`
      SELECT (
        (SELECT COUNT(*) FROM content_articles WHERE status = 'pending') +
        (SELECT COUNT(*) FROM content_podcasts WHERE status = 'pending') +
        (SELECT COUNT(*) FROM content_videos WHERE status = 'pending')
      ) as count
    `),

    // Quick Action Badges: New users in last 24 hours
    db.query<{ count: bigint | number }>("SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"),

    // Page Views by Type (for analytics panel) - Comprehensive categorization
    db.query<{ page_type: string; view_count: bigint | number }>(`
      SELECT
        CASE
          WHEN url = '/' THEN 'Home'
          WHEN url LIKE '/listings/%' AND url NOT LIKE '/listings/%/%' THEN 'Listing Details'
          WHEN url = '/listings' OR url LIKE '/listings?%' THEN 'Listings Browse'
          WHEN url LIKE '/categories/%' THEN 'Category'
          WHEN url LIKE '/events/%' THEN 'Event Details'
          WHEN url = '/events' OR url LIKE '/events?%' THEN 'Events Browse'
          WHEN url LIKE '/offers/%' THEN 'Offer Details'
          WHEN url = '/offers' OR url LIKE '/offers?%' THEN 'Offers Browse'
          WHEN url LIKE '/search%' THEN 'Search'
          WHEN url LIKE '/profile/%' THEN 'User Profile'
          WHEN url = '/profile' THEN 'Profile'
          WHEN url LIKE '/dashboard/listings/%' THEN 'Listing Manager'
          WHEN url LIKE '/dashboard%' THEN 'Dashboard'
          WHEN url LIKE '/services/memberships%' THEN 'Memberships'
          WHEN url LIKE '/services/%' THEN 'Services'
          WHEN url = '/content' OR url LIKE '/content/%' THEN 'Content'
          WHEN url = '/join' OR url LIKE '/join?%' THEN 'Registration'
          WHEN url LIKE '/auth%' OR url LIKE '/login%' OR url LIKE '/register%' THEN 'Auth'
          WHEN url LIKE '/verify-email%' THEN 'Email Verification'
          WHEN url LIKE '/notifications%' THEN 'Notifications'
          WHEN url LIKE '/account%' THEN 'Account'
          WHEN url LIKE '/about%' THEN 'About'
          WHEN url LIKE '/contact%' THEN 'Contact'
          WHEN url LIKE '/privacy%' THEN 'Privacy Policy'
          WHEN url LIKE '/terms%' THEN 'Terms of Service'
          WHEN url LIKE '/help%' OR url LIKE '/faq%' THEN 'Help/FAQ'
          WHEN url LIKE '/admin%' THEN 'Admin'
          ELSE CONCAT('Uncategorized: ', SUBSTRING(url, 1, 30))
        END as page_type,
        COUNT(*) as view_count
      FROM analytics_page_views
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${hours} HOUR)
      GROUP BY page_type
      ORDER BY view_count DESC
    `),

    // Total page views for percentage calculation
    db.query<{ count: bigint | number }>(`
      SELECT COUNT(*) as count FROM analytics_page_views
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${hours} HOUR)
    `),

    // Top individual URLs for granular analytics (top 20)
    db.query<{ url: string; title: string | null; view_count: bigint | number }>(`
      SELECT
        url,
        MAX(title) as title,
        COUNT(*) as view_count
      FROM analytics_page_views
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${hours} HOUR)
      GROUP BY url
      ORDER BY view_count DESC
      LIMIT 20
    `),

    // Recent Activity from user_log (20 most recent) - ALL activity types
    // JOIN with users table to get actual username for authenticated users
    db.query<{
      id: number;
      user_id: number | null;
      user_name: string;
      action: string;
      action_type: string;
      description: string;
      ip_display: string | null;
      location: string | null;
      device_type: string | null;
      created_at: string;
    }>(`
      SELECT
        ul.id,
        ul.user_id,
        CASE
          WHEN ul.user_id IS NOT NULL AND u.display_name IS NOT NULL THEN u.display_name
          WHEN ul.user_id IS NOT NULL AND u.username IS NOT NULL THEN u.username
          ELSE 'Visitor'
        END as user_name,
        ul.action,
        ul.action_type,
        ul.description,
        CASE
          WHEN ul.ip_address IS NOT NULL THEN CONCAT('IP-', UPPER(SUBSTRING(ul.ip_address, 1, 6)))
          ELSE NULL
        END as ip_display,
        ul.location,
        ul.device_type,
        ul.created_at
      FROM user_log ul
      LEFT JOIN users u ON ul.user_id = u.id
      ORDER BY ul.created_at DESC
      LIMIT 20
    `),

    // Admin Activity (20 most recent admin actions with time filtering)
    db.query<AdminActivityEntry>(`
      SELECT
        aa.id,
        aa.admin_user_id,
        COALESCE(u.display_name, u.username, 'Unknown Admin') as admin_name,
        COALESCE(aa.action_type, 'action') as action_type,
        COALESCE(aa.action_category, 'other') as action_category,
        COALESCE(aa.action_description, '') as action_description,
        COALESCE(aa.target_entity_type, '') as target_entity_type,
        aa.target_entity_id,
        COALESCE(aa.severity, 'normal') as severity,
        aa.created_at
      FROM admin_activity aa
      LEFT JOIN users u ON aa.admin_user_id = u.id
      WHERE aa.created_at >= DATE_SUB(NOW(), INTERVAL ${hours} HOUR)
      ORDER BY aa.created_at DESC
      LIMIT 20
    `),

    // Logged In Users (active sessions with user details)
    db.query<LoggedInUserEntry>(`
      SELECT
        us.id as session_id,
        us.user_id,
        COALESCE(u.display_name, u.username, 'Unknown') as user_name,
        u.email,
        u.role,
        u.avatar_url,
        u.avatar_bg_color,
        us.updated_at as last_activity,
        us.created_at,
        us.expires_at,
        CASE
          WHEN us.ip_coarse IS NOT NULL THEN CONCAT('IP-', UPPER(HEX(LEFT(us.ip_coarse, 3))))
          ELSE NULL
        END as ip_coarse
      FROM user_sessions us
      INNER JOIN users u ON us.user_id = u.id
      WHERE us.expires_at > NOW()
        AND us.revoked_at IS NULL
        AND us.created_at >= DATE_SUB(NOW(), INTERVAL ${hours} HOUR)
      ORDER BY us.updated_at DESC
      LIMIT 50
    `)
  ]);

  // Calculate page view percentages
  const totalViews = bigIntToNumber(totalPageViewsResult.rows?.[0]?.count) || 1;
  const pageViewStats: PageViewStat[] = (pageViewsResult.rows || []).map(row => ({
    page_type: row.page_type,
    view_count: bigIntToNumber(row.view_count),
    percentage: Math.round((bigIntToNumber(row.view_count) / totalViews) * 100)
  }));

  // Top URLs for granular analytics
  const topUrls = (topUrlsResult.rows || []).map(row => ({
    url: row.url,
    title: row.title,
    view_count: bigIntToNumber(row.view_count),
    percentage: Math.round((bigIntToNumber(row.view_count) / totalViews) * 100)
  }));

  return createSuccessResponse({
    stats: {
      totalUsers: bigIntToNumber(usersResult.rows?.[0]?.count),
      totalListings: bigIntToNumber(listingsResult.rows?.[0]?.count),
      pendingReviews: bigIntToNumber(reviewsResult.rows?.[0]?.count),
      upcomingEvents: bigIntToNumber(eventsResult.rows?.[0]?.count),
      uniqueVisitors: bigIntToNumber(uniqueVisitorsResult.rows?.[0]?.count),
      activeSessions: bigIntToNumber(activeSessionsResult.rows?.[0]?.count),
      activeOffers: bigIntToNumber(activeOffersResult.rows?.[0]?.count),
      pendingClaims: bigIntToNumber(pendingClaimsResult.rows?.[0]?.count),
      pendingListings: bigIntToNumber(pendingListingsResult.rows?.[0]?.count),
      pendingEvents: bigIntToNumber(pendingEventsResult.rows?.[0]?.count),
      pendingContent: bigIntToNumber(pendingContentResult.rows?.[0]?.count),
      newUsers: bigIntToNumber(newUsersResult.rows?.[0]?.count)
    },
    pageViewStats: {
      totalViews,
      byType: pageViewStats,
      topUrls,
      timeRangeHours: hours
    },
    recentActivity: activityResult.rows || [],
    adminActivities: adminActivityResult.rows || [],
    loggedInUsers: loggedInUsersResult.rows || []
  }, context.requestId);
});
