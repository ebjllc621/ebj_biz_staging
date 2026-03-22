/**
 * Podcaster Episodes API Route
 * GET /api/content/podcasters/[slug]/episodes - Episodes for a podcaster profile
 *
 * @authority PODCASTER_PARITY_BRAIN_PLAN.md - Phase 5, Task 5.4
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @reference src/app/api/content/affiliate-marketers/[slug]/portfolio/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { PodcasterService, PodcasterNotFoundError } from '@core/services/PodcasterService';
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
  const podcasterService = new PodcasterService(db);

  try {
    // Resolve slug to profile to get the numeric ID
    const podcaster = await podcasterService.getPodcasterBySlug(slug);

    if (!podcaster) {
      throw new PodcasterNotFoundError(slug);
    }

    const episodes = await podcasterService.getEpisodes(podcaster.id);

    return createSuccessResponse({ episodes }, context.requestId);
  } catch (error) {
    if (error instanceof PodcasterNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  allowedMethods: ['GET']
});
