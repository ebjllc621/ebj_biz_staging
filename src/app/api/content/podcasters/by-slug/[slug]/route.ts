/**
 * Podcaster By-Slug Lookup API Route
 * GET /api/content/podcasters/by-slug/[slug] - Lookup podcaster by slug (returns id + basic info)
 *
 * @authority PODCASTER_PARITY_BRAIN_PLAN.md - Phase 5, Task 5.6
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @reference src/app/api/content/affiliate-marketers/by-slug/[slug]/route.ts
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
    const podcaster = await podcasterService.getPodcasterBySlug(slug);

    if (!podcaster) {
      throw new PodcasterNotFoundError(slug);
    }

    return createSuccessResponse({ podcaster }, context.requestId);
  } catch (error) {
    if (error instanceof PodcasterNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  allowedMethods: ['GET']
});
