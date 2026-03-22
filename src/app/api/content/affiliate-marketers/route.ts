/**
 * Affiliate Marketers API Route
 * GET /api/content/affiliate-marketers - Affiliate marketer list
 *
 * @authority Tier3_Phases/PHASE_2_PUBLIC_API_ROUTES.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @phase Tier 3 - Phase 2
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { AffiliateMarketerStatus } from '@core/types/affiliate-marketer';
import type { AffiliateMarketerSortOption } from '@core/types/affiliate-marketer';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const sort = (searchParams.get('sort') as AffiliateMarketerSortOption) || 'recent';
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
  const marketerService = new AffiliateMarketerService(db);

  // Get marketers (public route: only active)
  const result = await marketerService.getMarketers(
    {
      status: AffiliateMarketerStatus.ACTIVE,
      location: searchParams.get('location') || undefined,
      niches: searchParams.get('niche') ? [searchParams.get('niche')!] : undefined,
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
    marketers: result.data,
    pagination: result.pagination
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});
