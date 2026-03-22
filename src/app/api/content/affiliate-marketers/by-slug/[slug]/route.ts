/**
 * Affiliate Marketer Detail API Route
 * GET /api/content/affiliate-marketers/by-slug/[slug] - Single affiliate marketer by slug
 *
 * @authority Tier3_Phases/PHASE_2_PUBLIC_API_ROUTES.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @phase Tier 3 - Phase 2
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService, AffiliateMarketerNotFoundError } from '@core/services/AffiliateMarketerService';
import { BizError } from '@core/errors/BizError';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export const GET = apiHandler(async (context: ApiContext, routeParams?: RouteParams) => {
  // Next.js 15 async params
  const params = await routeParams?.params;
  const slug = params?.slug;

  if (!slug) {
    throw BizError.badRequest('Slug parameter is required');
  }

  // Initialize service
  const db = getDatabaseService();
  const marketerService = new AffiliateMarketerService(db);

  try {
    const marketer = await marketerService.getMarketerBySlug(slug);

    if (!marketer) {
      throw new AffiliateMarketerNotFoundError(slug);
    }

    // Increment view count (fire and forget)
    marketerService.incrementViewCount(marketer.id).catch(() => {
      // Silent failure - view count is non-critical
    });

    return createSuccessResponse({ marketer }, context.requestId);
  } catch (error) {
    if (error instanceof AffiliateMarketerNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  allowedMethods: ['GET']
});
