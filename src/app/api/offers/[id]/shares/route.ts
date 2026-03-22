/**
 * Offer Shares API Route - POST record share, GET analytics
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
import type { ShareType, SharePlatform } from '@features/offers/types';

// ============================================================================
// POST - Record a share action
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // pathSegments: ['', 'api', 'offers', '[id]', 'shares']
  const offerIdStr = pathSegments[pathSegments.length - 2] || '';
  const offerId = parseInt(offerIdStr, 10);

  if (isNaN(offerId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid offer ID'),
      400
    );
  }

  // Parse request body
  let body: { platform: SharePlatform; share_type?: ShareType };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid JSON body'),
      400
    );
  }

  const { platform, share_type = 'consumer' } = body;

  // Validate platform
  const validPlatforms: SharePlatform[] = [
    'facebook', 'instagram', 'twitter', 'linkedin', 'nextdoor',
    'whatsapp', 'sms', 'email', 'copy_link'
  ];

  if (!platform || !validPlatforms.includes(platform)) {
    return createErrorResponse(
      BizError.badRequest('Invalid share platform'),
      400
    );
  }

  // Validate share_type
  const validShareTypes: ShareType[] = ['business_owner', 'consumer'];
  if (!validShareTypes.includes(share_type)) {
    return createErrorResponse(
      BizError.badRequest('Invalid share type'),
      400
    );
  }

  // Get OfferService
  const offerService = getOfferService();

  // Record share
  const share = await offerService.recordShare(offerId, user.id, share_type, platform);

  return createSuccessResponse({ share }, 201);
});

// ============================================================================
// GET - Get share analytics for an offer
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

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerIdStr = pathSegments[pathSegments.length - 2] || '';
  const offerId = parseInt(offerIdStr, 10);

  if (isNaN(offerId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid offer ID'),
      400
    );
  }

  // Get services
  const offerService = getOfferService();

  // Verify offer exists
  const offer = await offerService.getById(offerId);
  if (!offer) {
    return createErrorResponse(
      BizError.notFound('Offer', offerId),
      404
    );
  }

  // Authorization: Only business owner or admin can view analytics
  if (user.role !== 'admin') {
    const listingService = getListingService();
    const listing = await listingService.getById(offer.listing_id);

    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse(
        BizError.forbidden('You are not authorized to view this offer\'s analytics'),
        403
      );
    }
  }

  // Get analytics
  const analytics = await offerService.getShareAnalytics(offerId);

  return createSuccessResponse({ analytics }, 200);
});
