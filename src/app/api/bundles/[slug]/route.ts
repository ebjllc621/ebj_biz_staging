/**
 * GET /api/bundles/[slug]
 * Get bundle details by slug
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract slug from URL pathname - /api/bundles/[slug]
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const slug = pathSegments[pathSegments.length - 1] || '';

  const offerService = getOfferService();
  const bundle = await offerService.getBundleBySlug(slug);

  if (!bundle) {
    return createErrorResponse(
      BizError.notFound('Bundle', slug),
      context.requestId
    );
  }

  return createSuccessResponse({ bundle }, context.requestId);
});
