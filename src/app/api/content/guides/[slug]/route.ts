/**
 * Guide Detail API Route
 * GET /api/content/guides/[slug] - Single guide by slug with sections
 *
 * @authority TIER_2_CONTENT_TYPES_MASTER_INDEX.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @phase Tier 2 - Phase G2
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { GuideService, GuideNotFoundError } from '@core/services/GuideService';
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
  const guideService = new GuideService(db);

  try {
    const guide = await guideService.getGuideBySlug(slug);

    if (!guide) {
      throw new GuideNotFoundError(slug);
    }

    // Increment view count (fire and forget)
    guideService.incrementViewCount(guide.id).catch(() => {
      // Silent failure - view count is non-critical
    });

    return createSuccessResponse({ guide }, context.requestId);
  } catch (error) {
    if (error instanceof GuideNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  allowedMethods: ['GET']
});
