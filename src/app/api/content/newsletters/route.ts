/**
 * Newsletters API Route
 * GET /api/content/newsletters - Newsletter list
 *
 * @authority TIER_2_CONTENT_TYPES_MASTER_INDEX.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @phase Tier 2 - Phase N2
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { NewsletterStatus } from '@core/types/newsletter';
import type { NewsletterSortOption } from '@core/types/newsletter';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getContentFollowService } from '@core/services/ServiceRegistry';

/**
 * GET /api/content/newsletters
 * Get newsletters with optional filters, pagination, and sorting
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sort = (searchParams.get('sort') as NewsletterSortOption) || 'recent';
  const categoryParam = searchParams.get('category');
  const searchQuery = searchParams.get('q');
  const featuredParam = searchParams.get('featured');
  const listingIdParam = searchParams.get('listing_id');

  // Validate pagination
  if (isNaN(page) || page < 1) {
    throw BizError.badRequest('Invalid page parameter', { page: searchParams.get('page') });
  }
  if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw BizError.badRequest('Invalid pageSize parameter', { pageSize: searchParams.get('pageSize') });
  }

  const categoryId = categoryParam ? parseInt(categoryParam) : undefined;
  const isFeatured = featuredParam === 'true' ? true : undefined;
  const listingId = listingIdParam ? parseInt(listingIdParam) : undefined;
  const followingParam = searchParams.get('following') === 'true';

  // Initialize service
  const db = getDatabaseService();
  const newsletterService = new NewsletterService(db);

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
            newsletters: [],
            pagination: { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
          }, context.requestId);
        }
      }
    } else {
      return createSuccessResponse({
        newsletters: [],
        pagination: { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      }, context.requestId);
    }
  }

  // Get newsletters (public route: only published)
  const result = await newsletterService.getNewsletters(
    {
      listing_id: listingId,
      category_id: categoryId,
      searchQuery: searchQuery || undefined,
      is_featured: isFeatured,
      status: NewsletterStatus.PUBLISHED,
      followedListingIds,
    },
    { page, pageSize },
    sort
  );

  return createSuccessResponse({
    newsletters: result.data,
    pagination: result.pagination
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});
