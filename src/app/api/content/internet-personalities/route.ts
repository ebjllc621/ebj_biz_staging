/**
 * Internet Personalities API Route
 * GET /api/content/internet-personalities - Internet personality list
 *
 * @authority Tier3_Phases/PHASE_2_PUBLIC_API_ROUTES.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @phase Tier 3 - Phase 2
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { InternetPersonalityStatus } from '@core/types/internet-personality';
import type { InternetPersonalitySortOption } from '@core/types/internet-personality';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sort = (searchParams.get('sort') as InternetPersonalitySortOption) || 'recent';
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
  const personalityService = new InternetPersonalityService(db);

  // Get personalities (public route: only active)
  const result = await personalityService.getPersonalities(
    {
      status: InternetPersonalityStatus.ACTIVE,
      location: searchParams.get('location') || undefined,
      content_categories: searchParams.get('category') ? [searchParams.get('category')!] : undefined,
      platforms: searchParams.get('platform') ? [searchParams.get('platform')!] : undefined,
      collaboration_types: searchParams.get('collaboration_type') ? [searchParams.get('collaboration_type')!] : undefined,
      is_verified: searchParams.get('verified') === 'true' ? true : undefined,
      minRating: minRatingParam ? parseFloat(minRatingParam) : undefined,
      searchQuery: searchParams.get('q') || undefined,
    },
    { page, pageSize },
    sort
  );

  return createSuccessResponse({
    personalities: result.data,
    pagination: result.pagination
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});
