/**
 * Listing Reviews API Route
 * GET /api/listings/[id]/reviews - Get reviews for listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getReviewService } from '@core/services/ServiceRegistry';
import { ReviewStatus } from '@core/services/ReviewService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/listings/[id]/reviews
 * Get all reviews for a listing
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10)
 *   - minRating: Minimum rating filter (1-5)
 *   - maxRating: Maximum rating filter (1-5)
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'reviews')
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
  }

  const { searchParams } = url;

  // Parse filters — only show approved reviews to public
  interface ReviewFilters {
    listingId: number;
    status: ReviewStatus;
    minRating?: number;
    maxRating?: number;
  }
  const filters: ReviewFilters = { listingId, status: ReviewStatus.APPROVED };

  const minRatingParam = searchParams.get('minRating');
  if (minRatingParam !== null) {
    const minRating = parseInt(minRatingParam);
    if (isNaN(minRating) || minRating < 1 || minRating > 5) {
      throw BizError.badRequest('Invalid minRating parameter (must be 1-5)', { minRating: minRatingParam });
    }
    filters.minRating = minRating;
  }

  const maxRatingParam = searchParams.get('maxRating');
  if (maxRatingParam !== null) {
    const maxRating = parseInt(maxRatingParam);
    if (isNaN(maxRating) || maxRating < 1 || maxRating > 5) {
      throw BizError.badRequest('Invalid maxRating parameter (must be 1-5)', { maxRating: maxRatingParam });
    }
    filters.maxRating = maxRating;
  }

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (isNaN(page) || page < 1) {
    throw BizError.badRequest('Invalid page parameter', { page: searchParams.get('page') });
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw BizError.badRequest('Invalid limit parameter (must be 1-100)', { limit: searchParams.get('limit') });
  }

  // Get reviews and distribution in parallel
  const service = getReviewService();
  const [result, distribution] = await Promise.all([
    service.getAll(filters, { page, limit }),
    service.getRatingDistribution(listingId),
  ]);

  // Enrich reviews with user data (name + avatar)
  const reviewData = result.data;
  if (reviewData.length > 0) {
    const userIds = [...new Set(reviewData.map((r) => r.user_id))];
    const placeholders = userIds.map(() => '?').join(',');
    const db = getDatabaseService();
    interface UserRow { id: number; display_name: string | null; username: string; avatar_url: string | null }
    const userResult = await db.query<UserRow>(
      `SELECT id, display_name, username, avatar_url FROM users WHERE id IN (${placeholders})`,
      userIds
    );
    const userMap = new Map(userResult.rows.map((u) => [u.id, u]));

    const enrichedData = reviewData.map((review) => {
      const user = userMap.get(review.user_id);
      return {
        ...review,
        reviewer_name: user?.display_name || user?.username || null,
        reviewer_avatar_url: user?.avatar_url || null,
      };
    });

    return createSuccessResponse({ ...result, data: enrichedData, distribution }, context.requestId);
  }

  return createSuccessResponse({ ...result, distribution }, context.requestId);
}, {
  allowedMethods: ['GET']
});
