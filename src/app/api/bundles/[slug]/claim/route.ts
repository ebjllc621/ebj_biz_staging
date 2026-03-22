/**
 * POST /api/bundles/[slug]/claim
 * Claim all offers in a bundle
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract slug from URL pathname - /api/bundles/[slug]/claim
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const slug = pathSegments[pathSegments.length - 2] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const offerService = getOfferService();

  // Get bundle by slug first
  const bundle = await offerService.getBundleBySlug(slug);
  if (!bundle) {
    return createErrorResponse(
      BizError.notFound('Bundle', slug),
      context.requestId
    );
  }

  // Claim the bundle
  const result = await offerService.claimBundle(bundle.id, user.id);

  return createSuccessResponse({ result }, context.requestId);
});
