/**
 * Podcasts API Route
 * GET /api/content/podcasts - Podcast list
 *
 * @authority PHASE_3_API_ROUTES.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ContentService, ContentStatus, type SortOption } from '@core/services/ContentService';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getContentFollowService } from '@core/services/ServiceRegistry';

/**
 * GET /api/content/podcasts
 * Get podcasts with optional filters, pagination, and sorting
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sort = (searchParams.get('sort') as SortOption) || 'recent';
  const categoryParam = searchParams.get('category');
  const searchQuery = searchParams.get('q');
  const featuredParam = searchParams.get('featured');

  // Validate pagination
  if (isNaN(page) || page < 1) {
    throw BizError.badRequest('Invalid page parameter', { page: searchParams.get('page') });
  }
  if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw BizError.badRequest('Invalid pageSize parameter', { pageSize: searchParams.get('pageSize') });
  }

  const categoryId = categoryParam ? parseInt(categoryParam) : undefined;
  const isFeatured = featuredParam === 'true' ? true : undefined;
  const followingParam = searchParams.get('following') === 'true';

  // Initialize service
  const db = getDatabaseService();
  const contentService = new ContentService(db);

  let followedListingIds: number[] | undefined;
  if (followingParam) {
    const user = await getUserFromRequest(request);
    if (user) {
      const followService = getContentFollowService();
      const hasAllContent = await followService.hasAllContentFollow(user.id);
      if (!hasAllContent) {
        followedListingIds = await followService.getFollowedListingIds(user.id);
        if (followedListingIds.length === 0) {
          return createSuccessResponse({
            podcasts: [],
            pagination: { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
          }, context.requestId);
        }
      }
    } else {
      return createSuccessResponse({
        podcasts: [],
        pagination: { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      }, context.requestId);
    }
  }

  // Get podcasts
  const result = await contentService.getPodcasts(
    {
      categoryId,
      searchQuery: searchQuery || undefined,
      isFeatured,
      status: ContentStatus.PUBLISHED,
      followedListingIds,
    },
    { page, pageSize },
    sort
  );

  return createSuccessResponse({
    podcasts: result.data,
    pagination: result.pagination
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});
