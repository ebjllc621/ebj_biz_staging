/**
 * Newsletter Detail API Route
 * GET /api/content/newsletters/[slug] - Single newsletter by slug
 *
 * @authority TIER_2_CONTENT_TYPES_MASTER_INDEX.md
 * @tier SIMPLE
 * @pattern Public GET (Pattern A - no auth)
 * @phase Tier 2 - Phase N2
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService, NewsletterNotFoundError } from '@core/services/NewsletterService';
import { BizError } from '@core/errors/BizError';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/content/newsletters/[slug]
 * Get single newsletter by slug
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
  const newsletterService = new NewsletterService(db);

  try {
    const newsletter = await newsletterService.getNewsletterBySlug(slug);

    if (!newsletter) {
      throw new NewsletterNotFoundError(slug);
    }

    // Increment view count (fire and forget)
    newsletterService.incrementViewCount(newsletter.id).catch(() => {
      // Silent failure - view count is non-critical
    });

    return createSuccessResponse({ newsletter }, context.requestId);
  } catch (error) {
    if (error instanceof NewsletterNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  allowedMethods: ['GET']
});
