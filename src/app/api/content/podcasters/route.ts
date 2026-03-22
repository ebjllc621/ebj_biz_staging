/**
 * Podcasters API Route
 * GET /api/content/podcasters - Podcaster profile list
 *
 * @authority PODCASTER_PARITY_BRAIN_PLAN.md - Phase 5, Task 5.1
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @reference src/app/api/content/affiliate-marketers/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { PodcasterService } from '@core/services/PodcasterService';
import { PodcasterStatus } from '@core/types/podcaster';
import type { PodcasterSortOption } from '@core/types/podcaster';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sort = (searchParams.get('sort') as PodcasterSortOption) || 'recent';
  const minRatingParam = searchParams.get('minRating');

  // Validate pagination
  if (isNaN(page) || page < 1) {
    throw BizError.badRequest('Invalid page parameter', { page: searchParams.get('page') });
  }
  if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw BizError.badRequest('Invalid pageSize parameter', { pageSize: searchParams.get('pageSize') });
  }

  // Initialize service
  const db = getDatabaseService();
  const podcasterService = new PodcasterService(db);

  // Get podcasters (public route: only active)
  const result = await podcasterService.getPodcasters(
    {
      status: PodcasterStatus.ACTIVE,
      genres: searchParams.get('genre') ? [searchParams.get('genre')!] : undefined,
      platforms: searchParams.get('platform') ? [searchParams.get('platform')!] : undefined,
      is_verified: searchParams.get('verified') === 'true' ? true : undefined,
      is_featured: searchParams.get('featured') === 'true' ? true : undefined,
      minRating: minRatingParam ? parseFloat(minRatingParam) : undefined,
      searchQuery: searchParams.get('q') || undefined,
    },
    { page, pageSize },
    sort
  );

  return createSuccessResponse({
    podcasters: result.data,
    pagination: result.pagination
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});
