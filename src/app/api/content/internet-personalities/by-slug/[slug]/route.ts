/**
 * Internet Personality Detail API Route
 * GET /api/content/internet-personalities/by-slug/[slug] - Single internet personality by slug
 *
 * @authority Tier3_Phases/PHASE_2_PUBLIC_API_ROUTES.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @phase Tier 3 - Phase 2
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { InternetPersonalityService, InternetPersonalityNotFoundError } from '@core/services/InternetPersonalityService';
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
  const personalityService = new InternetPersonalityService(db);

  try {
    const personality = await personalityService.getPersonalityBySlug(slug);

    if (!personality) {
      throw new InternetPersonalityNotFoundError(slug);
    }

    // Increment view count (fire and forget)
    personalityService.incrementViewCount(personality.id).catch(() => {
      // Silent failure - view count is non-critical
    });

    return createSuccessResponse({ personality }, context.requestId);
  } catch (error) {
    if (error instanceof InternetPersonalityNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  allowedMethods: ['GET']
});
