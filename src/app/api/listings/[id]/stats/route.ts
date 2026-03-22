/**
 * GET /api/listings/[id]/stats - Listing Statistics API
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder v3.0
 * @phase Phase 6 - Listing Manager Dashboard
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_6_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST use DatabaseService for database access
 * - MUST use bigIntToNumber for COUNT(*) results
 * - MUST use createSuccessResponse for responses
 * - MUST authorize: user owns listing or is admin
 * - ALL queries MUST use listing_id (NOT user_id) - LISTING-CENTRIC DATA ISOLATION
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';
import { ListingStats } from '@features/dashboard/types';

/**
 * GET handler - Fetch aggregated statistics for a listing
 */
export const GET = apiHandler(async (context: ApiContext) => {
  console.log('[Stats API] Handler started');

  try {
    // Ensure user is authenticated
    if (!context.userId) {
      throw BizError.unauthorized('Authentication required');
    }

    console.log('[Stats API] UserId:', context.userId);
    const db = getDatabaseService();

    // Extract listing ID from URL pattern (Next.js 14 provides this via pathname)
    const url = new URL(context.request.url);
    const pathParts = url.pathname.split('/');
    const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

    console.log('[Stats API] Extracted listingId:', listingIdStr);

    if (!listingIdStr) {
      throw BizError.badRequest('Listing ID is required');
    }

    const listingId = parseInt(listingIdStr, 10);

    if (isNaN(listingId)) {
      throw BizError.badRequest('Invalid listing ID');
    }

    console.log('[Stats API] Checking ownership for listing:', listingId);
    // Verify user owns the listing or is admin
    const ownershipResult = await db.query<{ user_id: number }>(
      'SELECT user_id FROM listings WHERE id = ?',
      [listingId]
    );
    console.log('[Stats API] Ownership result:', ownershipResult.rows.length, 'rows');

  if (ownershipResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

    const isOwner = ownershipResult.rows[0]?.user_id === parseInt(context.userId, 10);
    // Get user role to check for admin (column is 'role', not 'account_type')
    const userResult = await db.query<{ role: string }>(
      'SELECT role FROM users WHERE id = ?',
      [parseInt(context.userId, 10)]
    );
    const isAdmin = userResult.rows[0]?.role === 'admin';
    console.log('[Stats API] isOwner:', isOwner, 'isAdmin:', isAdmin);

  if (!isOwner && !isAdmin) {
    throw BizError.forbidden('You do not have permission to view these statistics');
  }

  // Fetch statistics (all queries use listing_id for data isolation)

  // 1. Views (total and last 30 days) - gracefully handle missing table
  let totalViews = 0;
  let last30DaysViews = 0;
  let previous30DaysViews = 0;
  let trend: 'up' | 'down' | 'neutral' = 'neutral';
  let trendPercent = 0;

  try {
    const totalViewsResult = await db.query<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM analytics_listing_views WHERE listing_id = ?',
      [listingId]
    );
    totalViews = bigIntToNumber(totalViewsResult.rows[0]?.count ?? 0n);

    const last30DaysViewsResult = await db.query<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM analytics_listing_views WHERE listing_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [listingId]
    );
    last30DaysViews = bigIntToNumber(last30DaysViewsResult.rows[0]?.count ?? 0n);

    // Previous 30 days for trend calculation
    const previous30DaysViewsResult = await db.query<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM analytics_listing_views WHERE listing_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [listingId]
    );
    previous30DaysViews = bigIntToNumber(previous30DaysViewsResult.rows[0]?.count ?? 0n);

    // Calculate trend
    if (previous30DaysViews > 0) {
      trendPercent = Math.round(((last30DaysViews - previous30DaysViews) / previous30DaysViews) * 100);
      if (trendPercent > 0) trend = 'up';
      else if (trendPercent < 0) trend = 'down';
    } else if (last30DaysViews > 0) {
      trend = 'up';
      trendPercent = 100;
    }
  } catch {
    // analytics_listing_views table doesn't exist yet - use placeholder values
    totalViews = 0;
    last30DaysViews = 0;
    trend = 'neutral';
    trendPercent = 0;
  }

  // 2. Reviews (gracefully handle missing table)
  let totalReviews = 0;
  let averageRating = 0;
  let pendingReviews = 0;
  try {
    const reviewsResult = await db.query<{ total: bigint; avg_rating: number | null }>(
      "SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM reviews WHERE listing_id = ? AND status = 'approved'",
      [listingId]
    );
    totalReviews = bigIntToNumber(reviewsResult.rows[0]?.total ?? 0n);
    averageRating = reviewsResult.rows[0]?.avg_rating ?? 0;

    const pendingReviewsResult = await db.query<{ count: bigint }>(
      "SELECT COUNT(*) as count FROM reviews WHERE listing_id = ? AND status = 'pending'",
      [listingId]
    );
    pendingReviews = bigIntToNumber(pendingReviewsResult.rows[0]?.count ?? 0n);
  } catch {
    // Table doesn't exist yet - use placeholder
    totalReviews = 0;
    averageRating = 0;
    pendingReviews = 0;
  }

  // 3. Followers (bookmarks) - gracefully handle missing table
  let followers = 0;
  try {
    const followersResult = await db.query<{ count: bigint }>(
      "SELECT COUNT(*) as count FROM user_bookmarks WHERE entity_type = 'listing' AND entity_id = ?",
      [listingId]
    );
    followers = bigIntToNumber(followersResult.rows[0]?.count ?? 0n);
  } catch {
    // Table doesn't exist yet - use placeholder
    followers = 0;
  }

  // 4. Messages (check if table exists, otherwise use placeholder)
  let totalMessages = 0;
  let unreadMessages = 0;
  try {
    const messagesResult = await db.query<{ total: bigint; unread: bigint }>(
      'SELECT COUNT(*) as total, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread FROM listing_messages WHERE listing_id = ?',
      [listingId]
    );
    totalMessages = bigIntToNumber(messagesResult.rows[0]?.total ?? 0n);
    unreadMessages = bigIntToNumber(messagesResult.rows[0]?.unread ?? 0n);
  } catch {
    // Table doesn't exist yet - use placeholder
    totalMessages = 0;
    unreadMessages = 0;
  }

  // 5. Offers (gracefully handle missing table)
  let totalOffers = 0;
  let activeOffers = 0;
  try {
    const offersResult = await db.query<{ total: bigint; active: bigint }>(
      "SELECT COUNT(*) as total, SUM(CASE WHEN end_date >= CURDATE() THEN 1 ELSE 0 END) as active FROM offers WHERE listing_id = ?",
      [listingId]
    );
    totalOffers = bigIntToNumber(offersResult.rows[0]?.total ?? 0n);
    activeOffers = bigIntToNumber(offersResult.rows[0]?.active ?? 0n);
  } catch {
    // Table doesn't exist yet - use placeholder
    totalOffers = 0;
    activeOffers = 0;
  }

  // 6. Events (gracefully handle missing table)
  let totalEvents = 0;
  let upcomingEvents = 0;
  try {
    const eventsResult = await db.query<{ total: bigint; upcoming: bigint }>(
      "SELECT COUNT(*) as total, SUM(CASE WHEN start_date >= NOW() THEN 1 ELSE 0 END) as upcoming FROM events WHERE listing_id = ?",
      [listingId]
    );
    totalEvents = bigIntToNumber(eventsResult.rows[0]?.total ?? 0n);
    upcomingEvents = bigIntToNumber(eventsResult.rows[0]?.upcoming ?? 0n);
  } catch {
    // Table doesn't exist yet - use placeholder
    totalEvents = 0;
    upcomingEvents = 0;
  }

  // 7. Recommendations received (user_referrals where this listing was recommended)
  let recommendations = 0;
  try {
    const recResult = await db.query<{ count: bigint }>(
      "SELECT COUNT(*) as count FROM user_referrals WHERE entity_type = 'listing' AND entity_id = ?",
      [String(listingId)]
    );
    recommendations = bigIntToNumber(recResult.rows[0]?.count ?? 0n);
  } catch {
    recommendations = 0;
  }

  // 8. Affiliated listings (other listings whose owners share connection groups with this listing's owner)
  let affiliatedListings = 0;
  const ownerUserId = parseInt(context.userId, 10);
  try {
    const affResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(DISTINCT l.id) as count
       FROM connection_group_members cgm1
       JOIN connection_group_members cgm2 ON cgm1.group_id = cgm2.group_id AND cgm1.member_user_id != cgm2.member_user_id
       JOIN listings l ON cgm2.member_user_id = l.user_id
       WHERE cgm1.member_user_id = ?`,
      [ownerUserId]
    );
    affiliatedListings = bigIntToNumber(affResult.rows[0]?.count ?? 0n);
  } catch {
    affiliatedListings = 0;
  }

  // 9. Quotes received (quote_requests targeting this listing)
  let quotesReceived = 0;
  try {
    const quoteResult = await db.query<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM quote_requests WHERE target_listing_id = ?',
      [listingId]
    );
    quotesReceived = bigIntToNumber(quoteResult.rows[0]?.count ?? 0n);
  } catch {
    quotesReceived = 0;
  }

  // 10. Total Engagements - aggregates ALL user interactions within this listing's ecosystem
  // Tracks the full "rabbit trail": page views, shares, contacts, event views, RSVPs,
  // offer clicks, redeems, directions, recommendations — everything.
  let pageClicks = 0;

  // 10a. Page views (analytics_listing_views)
  try {
    const viewResult = await db.query<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM analytics_listing_views WHERE listing_id = ?',
      [listingId]
    );
    pageClicks += bigIntToNumber(viewResult.rows[0]?.count ?? 0n);
  } catch {
    // table may not exist
  }

  // 10b. BizWire interactions (modal opens, messages sent, replies, reads)
  try {
    const bizwireResult = await db.query<{ count: bigint }>(
      'SELECT COUNT(*) as count FROM bizwire_analytics WHERE listing_id = ?',
      [listingId]
    );
    pageClicks += bigIntToNumber(bizwireResult.rows[0]?.count ?? 0n);
  } catch {
    // table may not exist
  }

  // 10c. Offer share clicks (clicks on shared offer links for this listing's offers)
  try {
    const offerClickResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM offer_share_clicks osc
       JOIN offers o ON osc.offer_id = o.id
       WHERE o.listing_id = ?`,
      [listingId]
    );
    pageClicks += bigIntToNumber(offerClickResult.rows[0]?.count ?? 0n);
  } catch {
    // table may not exist
  }

  // 10d. Event RSVPs for this listing's events
  try {
    const rsvpResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM event_rsvps er
       JOIN events e ON er.event_id = e.id
       WHERE e.listing_id = ?`,
      [listingId]
    );
    pageClicks += bigIntToNumber(rsvpResult.rows[0]?.count ?? 0n);
  } catch {
    // table may not exist
  }

  // 10e. Recommendations/referrals targeting this listing
  try {
    const refResult = await db.query<{ count: bigint }>(
      "SELECT COUNT(*) as count FROM user_referrals WHERE entity_type = 'listing' AND entity_id = ?",
      [String(listingId)]
    );
    pageClicks += bigIntToNumber(refResult.rows[0]?.count ?? 0n);
  } catch {
    // table may not exist
  }

  // 10f. Analytics events (shares, directions, etc.) linked to this listing via JSON event_data
  try {
    const eventResult = await db.query<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM analytics_events
       WHERE JSON_EXTRACT(event_data, '$.listingId') = ?
       OR JSON_EXTRACT(event_data, '$.listing_id') = ?`,
      [listingId, listingId]
    );
    pageClicks += bigIntToNumber(eventResult.rows[0]?.count ?? 0n);
  } catch {
    // table may not exist or JSON_EXTRACT not supported
  }

  // 11. Completeness (basic calculation - can be enhanced later)
  const listingDataResult = await db.query<{
    description: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    logo_url: string | null;
  }>(
    'SELECT description, phone, email, website, address, logo_url FROM listings WHERE id = ?',
    [listingId]
  );

  const listingData = listingDataResult.rows[0];
  const requiredFields = ['description', 'phone', 'email', 'address'];
  const optionalFields = ['website', 'logo_url'];

  const missingRequired = requiredFields.filter(field => !listingData?.[field as keyof typeof listingData]);
  const missingOptional = optionalFields.filter(field => !listingData?.[field as keyof typeof listingData]);

  const totalFields = requiredFields.length + optionalFields.length;
  const completedFields = totalFields - (missingRequired.length + missingOptional.length);
  const completenessPercentage = Math.round((completedFields / totalFields) * 100);

    console.log('[Stats API] Building response');
    // Build response
    const stats: ListingStats = {
      views: {
        total: totalViews,
        last30Days: last30DaysViews,
        trend,
        trendPercent
      },
      reviews: {
        total: totalReviews,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        pending: pendingReviews
      },
      followers,
      messages: {
        total: totalMessages,
        unread: unreadMessages
      },
      offers: {
        active: activeOffers,
        total: totalOffers
      },
      events: {
        upcoming: upcomingEvents,
        total: totalEvents
      },
      recommendations,
      affiliatedListings,
      quotesReceived,
      pageClicks,
      completeness: {
        percentage: completenessPercentage,
        missingRequired,
        missingOptional
      }
    };

    console.log('[Stats API] Success, returning stats');
    return createSuccessResponse(stats, context.requestId);
  } catch (error) {
    console.error('[Stats API] ERROR:', error);
    console.error('[Stats API] Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('[Stats API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    throw error; // Re-throw for apiHandler to process
  }
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
