/**
 * GET /api/listings/[id]/cross-feature-completeness
 *
 * Returns cross-feature completeness data for business owner dashboard.
 * Includes bonus points scoring and suggestions for improving completeness.
 *
 * @tier STANDARD
 * @auth Required (listing owner or admin)
 * @phase Phase 5A - Cross-Feature Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5A_BRAIN_PLAN.md
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required');
  }

  const listingId = parseInt(listingIdStr, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  const listingService = getListingService();
  const data = await listingService.getCrossFeatureCompleteness(listingId);

  return createSuccessResponse(data, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
