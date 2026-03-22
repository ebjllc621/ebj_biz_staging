/**
 * Listing Followers API Route
 * GET /api/listings/[id]/followers - Get users who bookmarked the listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Data isolation: listing_id context
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 9 Brain Plan - Communication/Reputation Pages
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

interface Follower {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bookmarked_at: Date;
  notes: string | null;
}

/**
 * GET /api/listings/[id]/followers
 * Get users who have bookmarked this listing
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20)
 *
 * @authenticated User must own the listing
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const reqUrl = new URL(context.request.url);
  const segments = reqUrl.pathname.split('/');
  const idSegment = segments[segments.indexOf('listings') + 1];
  const listingId = parseInt(idSegment || '');
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: idSegment });
  }

  // Get authenticated user ID
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const ownerId = parseInt(userId);
  if (isNaN(ownerId)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Verify listing ownership
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);

  if (!listing || listing.user_id !== ownerId) {
    throw BizError.forbidden('You do not have permission to view followers for this listing');
  }

  // Get query params
  const page = parseInt(reqUrl.searchParams.get('page') || '1');
  const limit = parseInt(reqUrl.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Get followers
  const db = getDatabaseService();

  const followersSql = `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.avatar_url,
      b.created_at AS bookmarked_at,
      b.notes
    FROM user_bookmarks b
    JOIN users u ON b.user_id = u.id
    WHERE b.entity_type = 'listing' AND b.entity_id = ?
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const followersResult = await db.query<Follower>(followersSql, [listingId, limit, offset]);

  // Get total count
  const countSql = `
    SELECT COUNT(*) as total
    FROM user_bookmarks
    WHERE entity_type = 'listing' AND entity_id = ?
  `;

  const countResult = await db.query<{ total: bigint | number }>(countSql, [listingId]);
  const countRow = countResult.rows[0];
  const total = bigIntToNumber(countRow?.total ?? 0);

  return createSuccessResponse({
    data: followersResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
