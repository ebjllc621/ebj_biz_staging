/**
 * Offer Detail API Route by Slug
 *
 * GET /api/offers/by-slug/[slug] - Get offer by slug for detail page
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse
 * - Service boundary: OfferService
 * - Public access (no auth required)
 * - Analytics tracking on view
 *
 * @authority CLAUDE.md - API Standards
 * @authority Phase 1 Brain Plan - Section 4.1.1
 * @phase Offers Phase 1 - Core CRUD & Display
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/offers/by-slug/[slug]
 * Get offer by slug with listing information for detail page
 *
 * @public No authentication required
 * @response { data: { offer: OfferWithListing } }
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract slug from URL pathname - format: /api/offers/by-slug/[slug]
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const slug = pathSegments[pathSegments.length - 1] || '';

  if (!slug) {
    return createErrorResponse(
      BizError.badRequest('Slug parameter is required'),
      400
    );
  }

  // Initialize service
  const offerService = getOfferService();

  // Get offer with listing data
  const offer = await offerService.getOfferWithListing(slug);

  if (!offer) {
    return createErrorResponse(
      BizError.notFound('Offer', slug),
      404
    );
  }

  // Track page view analytics (fire and forget)
  offerService.trackAnalytics(offer.id, 'page_view').catch(() => {
    // Silently fail analytics - don't block response
  });

  return createSuccessResponse({
    offer
  }, 200);
});
