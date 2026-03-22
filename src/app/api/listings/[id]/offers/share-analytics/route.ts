/**
 * Business Share Analytics API Route - GET business-level share performance
 *
 * @tier STANDARD
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 */

import { getOfferService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';

// ============================================================================
// GET - Get share analytics for all listing's offers
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Extract listing ID from URL pathname - /api/listings/[id]/offers/share-analytics
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // pathSegments: ['', 'api', 'listings', '[id]', 'offers', 'share-analytics']
  const listingIdStr = pathSegments[3] || '';
  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid listing ID'),
      400
    );
  }

  // Get services
  const listingService = getListingService();
  const offerService = getOfferService();

  // Verify listing exists
  const listing = await listingService.getById(listingId);
  if (!listing) {
    return createErrorResponse(
      BizError.notFound('Listing', listingId),
      404
    );
  }

  // Authorization: Only listing owner or admin can view analytics
  if (user.role !== 'admin' && listing.user_id !== user.id) {
    return createErrorResponse(
      BizError.forbidden('You are not authorized to view this listing\'s analytics'),
      403
    );
  }

  // Get business share performance
  const performance = await offerService.getBusinessSharePerformance(listingId);

  return createSuccessResponse({ performance }, 200);
});
