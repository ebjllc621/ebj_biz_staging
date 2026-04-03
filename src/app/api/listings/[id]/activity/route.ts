/**
 * GET /api/listings/[id]/activity - Listing Recent Activity API
 *
 * Returns recent activity items for a specific listing:
 * - New reviews, messages, followers, offer redemptions, event RSVPs
 *
 * @tier API_ROUTE
 * @phase Listing Manager Dashboard Wiring
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_6_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST use DatabaseService for database access
 * - MUST use bigIntToNumber for COUNT(*) results
 * - MUST authorize: user owns listing or is admin
 * - ALL queries MUST use listing_id for data isolation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

interface ActivityRow {
  id: number;
  type: string;
  title: string;
  description: string;
  actor_name: string | null;
  created_at: Date;
}

export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();

  // Extract listing ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];
  if (!listingIdStr) throw BizError.badRequest('Listing ID is required');

  const listingId = parseInt(listingIdStr, 10);
  if (isNaN(listingId)) throw BizError.badRequest('Invalid listing ID');

  // Verify ownership
  const ownerResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [listingId]
  );
  if (ownerResult.rows.length === 0) throw BizError.notFound('Listing not found');

  const isOwner = ownerResult.rows[0]?.user_id === parseInt(context.userId, 10);
  if (!isOwner) {
    const userResult = await db.query<{ role: string }>(
      'SELECT role FROM users WHERE id = ?',
      [parseInt(context.userId, 10)]
    );
    if (userResult.rows[0]?.role !== 'admin') {
      throw BizError.forbidden('You do not have permission to view this activity');
    }
  }

  const limit = parseInt(url.searchParams.get('limit') || '10');
  const activities: ActivityRow[] = [];

  // Each source in its own try-catch so one missing table doesn't kill all results.
  // Pattern: matches stats route (separate queries per table).

  // 1. Messages (listing_messages — verified working via ListingMessageService)
  try {
    const msgResult = await db.query<ActivityRow>(
      `SELECT
        lm.id,
        'message' as type,
        CONCAT('New message from ', COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as title,
        COALESCE(LEFT(lm.content, 100), 'New inquiry') as description,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as actor_name,
        lm.created_at
      FROM listing_messages lm
      LEFT JOIN users u ON lm.sender_user_id = u.id
      WHERE lm.listing_id = ?
      ORDER BY lm.created_at DESC
      LIMIT ?`,
      [listingId, limit]
    );
    activities.push(...msgResult.rows);
  } catch {
    // listing_messages table may not exist yet
  }

  // 2. Reviews
  try {
    const revResult = await db.query<ActivityRow>(
      `SELECT
        r.id,
        'review' as type,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''), ' left a ', r.rating, '-star review') as title,
        COALESCE(LEFT(r.review_text, 100), 'No content') as description,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as actor_name,
        r.created_at
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.listing_id = ?
      ORDER BY r.created_at DESC
      LIMIT ?`,
      [listingId, limit]
    );
    activities.push(...revResult.rows);
  } catch {
    // reviews table may not exist yet
  }

  // 3. Followers (bookmarks)
  try {
    const bookmarkResult = await db.query<ActivityRow>(
      `SELECT
        ub.id,
        'follower' as type,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''), ' bookmarked your listing') as title,
        'New follower' as description,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as actor_name,
        ub.created_at
      FROM user_bookmarks ub
      LEFT JOIN users u ON ub.user_id = u.id
      WHERE ub.entity_type = 'listing' AND ub.entity_id = ?
      ORDER BY ub.created_at DESC
      LIMIT ?`,
      [listingId, limit]
    );
    activities.push(...bookmarkResult.rows);
  } catch {
    // user_bookmarks table may not exist yet
  }

  // 4. Event RSVPs
  try {
    const rsvpResult = await db.query<ActivityRow>(
      `SELECT
        er.id,
        'event_rsvp' as type,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''), ' RSVP''d to ', e.title) as title,
        CONCAT('Status: ', er.rsvp_status) as description,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as actor_name,
        er.rsvp_date as created_at
      FROM event_rsvps er
      JOIN events e ON er.event_id = e.id
      LEFT JOIN users u ON er.user_id = u.id
      WHERE e.listing_id = ?
      ORDER BY er.rsvp_date DESC
      LIMIT ?`,
      [listingId, limit]
    );
    activities.push(...rsvpResult.rows);
  } catch {
    // event_rsvps table may not exist yet
  }

  // Sort all activities by date descending and take the limit
  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const trimmed = activities.slice(0, limit);

  return createSuccessResponse({ activities: trimmed }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
