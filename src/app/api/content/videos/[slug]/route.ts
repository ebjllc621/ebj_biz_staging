/**
 * Video Detail API Route
 * GET /api/content/videos/[slug] - Single video by slug
 *
 * @authority PHASE_3_API_ROUTES.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ContentService, ContentNotFoundError } from '@core/services/ContentService';
import { BizError } from '@core/errors/BizError';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/content/videos/[slug]
 * Get single video by slug
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext, routeParams?: RouteParams) => {
  // Next.js 15 async params
  const params = await routeParams?.params;
  const slug = params?.slug;

  if (!slug) {
    throw BizError.badRequest('Slug parameter is required');
  }

  // Initialize service
  const db = getDatabaseService();
  const contentService = new ContentService(db);

  try {
    const video = await contentService.getVideoBySlug(slug);

    if (!video) {
      throw new ContentNotFoundError('video', slug);
    }

    // Increment view count (fire and forget)
    contentService.incrementViewCount('video', video.id).catch(() => {
      // Silent failure - view count is non-critical
    });

    return createSuccessResponse({ video }, context.requestId);
  } catch (error) {
    if (error instanceof ContentNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  allowedMethods: ['GET']
});
