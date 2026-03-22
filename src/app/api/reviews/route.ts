/**
 * Reviews API Routes
 * GET /api/reviews - Get all reviews (with filters)
 * POST /api/reviews - Create new review
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Response format: createSuccessResponse/createErrorResponse
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getReviewService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { InternalAnalyticsService } from '@core/services/InternalAnalyticsService';
import { awardReviewPoints } from '@core/utils/review-rewards';

/**
 * GET /api/reviews
 * Get all reviews with optional filters
 * Query parameters:
 *   - listingId: Filter by listing ID
 *   - userId: Filter by user ID
 *   - status: Filter by status (pending, approved, rejected)
 *   - minRating: Minimum rating (1-5)
 *   - maxRating: Maximum rating (1-5)
 *   - hasOwnerResponse: Filter by owner response existence (true/false)
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10)
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse filters from query parameters
  const filters: Record<string, unknown> = {};

  const listingIdParam = searchParams.get('listingId');
  if (listingIdParam !== null) {
    const listingId = parseInt(listingIdParam);
    if (isNaN(listingId)) {
      throw BizError.badRequest('Invalid listingId parameter', { listingId: listingIdParam });
    }
    filters.listingId = listingId;
  }

  const userIdParam = searchParams.get('userId');
  if (userIdParam !== null) {
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      throw BizError.badRequest('Invalid userId parameter', { userId: userIdParam });
    }
    filters.userId = userId;
  }

  const statusParam = searchParams.get('status');
  if (statusParam !== null) {
    filters.status = statusParam;
  }

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

  const hasOwnerResponseParam = searchParams.get('hasOwnerResponse');
  if (hasOwnerResponseParam !== null) {
    filters.hasOwnerResponse = hasOwnerResponseParam === 'true';
  }

  const isMockParam = searchParams.get('isMock');
  if (isMockParam !== null) {
    filters.isMock = isMockParam === 'true';
  }

  const searchQuery = searchParams.get('searchQuery');
  if (searchQuery !== null) {
    filters.searchQuery = searchQuery;
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

  // Get reviews
  const service = getReviewService();
  const result = await service.getAll(filters, { page, limit });

  // Enrich reviews with user data (name + avatar)
  const reviewData = result.data;
  if (reviewData.length > 0) {
    const userIds = [...new Set(reviewData.map((r) => r.user_id))];
    const placeholders = userIds.map(() => '?').join(',');
    const db = getDatabaseService();
    interface UserRow { id: number; display_name: string | null; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null }
    const userResult = await db.query<UserRow>(
      `SELECT id, display_name, username, first_name, last_name, avatar_url FROM users WHERE id IN (${placeholders})`,
      userIds
    );
    const userMap = new Map(userResult.rows.map((u) => [u.id, u]));

    const enrichedData = reviewData.map((review) => {
      const user = userMap.get(review.user_id);
      return {
        ...review,
        reviewer_name: user?.display_name || user?.username || null,
        reviewer_avatar_url: user?.avatar_url || null,
        user_first_name: user?.first_name || null,
        user_last_name: user?.last_name || null,
      };
    });

    return createSuccessResponse({ ...result, data: enrichedData }, context.requestId);
  }

  return createSuccessResponse(result, context.requestId);
}, {
  allowedMethods: ['GET', 'POST']
});

/**
 * POST /api/reviews
 * Create a new review
 * Body:
 *   - listing_id: Listing ID (required)
 *   - user_id: User ID (required)
 *   - rating: Rating 1-5 (required)
 *   - title: Review title (optional)
 *   - review_text: Review text (optional)
 *   - images: Array of image URLs (optional)
 *   - is_verified_purchase: Verified purchase status (optional, default: false)
 *
 * @authenticated User authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields
  if (!requestBody.listing_id || typeof requestBody.listing_id !== 'number') {
    throw BizError.validation('listing_id', requestBody.listing_id, 'Listing ID is required and must be a number');
  }

  if (!requestBody.user_id || typeof requestBody.user_id !== 'number') {
    throw BizError.validation('user_id', requestBody.user_id, 'User ID is required and must be a number');
  }

  if (!requestBody.rating || typeof requestBody.rating !== 'number' || requestBody.rating < 1 || requestBody.rating > 5) {
    throw BizError.validation('rating', requestBody.rating, 'Rating is required and must be a number between 1 and 5');
  }

  // Prepare create data (typed per CreateReviewInput)
  const createData: {
    rating: number;
    title?: string;
    review_text?: string;
    images?: string[];
    is_verified_purchase?: boolean;
    is_mock?: boolean;
  } = {
    rating: requestBody.rating as number
  };

  // Add optional fields
  if (requestBody.title !== undefined) createData.title = requestBody.title as string;
  if (requestBody.review_text !== undefined) createData.review_text = requestBody.review_text as string;
  if (requestBody.images !== undefined) {
    if (!Array.isArray(requestBody.images)) {
      throw BizError.validation('images', requestBody.images, 'Images must be an array');
    }
    createData.images = requestBody.images as string[];
  }
  if (requestBody.is_verified_purchase !== undefined) createData.is_verified_purchase = requestBody.is_verified_purchase as boolean;
  if (requestBody.is_mock !== undefined) createData.is_mock = requestBody.is_mock as boolean;

  // Create review
  const service = getReviewService();
  const review = await service.create(requestBody.listing_id, requestBody.user_id, createData);

  // Fire-and-forget analytics + reward points
  const db = getDatabaseService();
  const analyticsService = new InternalAnalyticsService(db);
  analyticsService.trackConversion({
    conversionType: 'review_submitted',
    userId: requestBody.user_id as number,
  }).catch(() => {});

  awardReviewPoints(requestBody.user_id as number, {
    reviewText: createData.review_text,
    images: createData.images,
    entityType: 'listing',
    entityId: requestBody.listing_id as number,
  });

  return createSuccessResponse({ review }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST']
}));
