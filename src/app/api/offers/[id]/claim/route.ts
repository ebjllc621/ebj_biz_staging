/**
 * Offer Claim API Route
 *
 * POST /api/offers/[id]/claim - Claim an offer
 * GET /api/offers/[id]/claim - Check if user has claimed
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse
 * - Service boundary: OfferService
 * - Auth required: getUserFromRequest
 * - Analytics tracking on claim
 *
 * @authority CLAUDE.md - API Standards
 * @authority Phase 1 Brain Plan - Section 3.1.2 & 3.1.3
 * @phase Offers Phase 1 - Core CRUD & Display
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import type { ClaimResult } from '@features/offers/types';

/**
 * POST /api/offers/[id]/claim
 * Claim an offer for the authenticated user
 *
 * @auth Required
 * @body { source?: AnalyticsSource }
 * @response { data: ClaimResult }
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - URL format: /api/offers/[id]/claim
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // pathSegments: ['', 'api', 'offers', '[id]', 'claim']
  const offerIdStr = pathSegments[pathSegments.length - 2] || '';
  const offerId = parseInt(offerIdStr);

  if (isNaN(offerId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid offer ID'),
      400
    );
  }

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('You must be logged in to claim offers'),
      401
    );
  }

  // Parse request body
  let body: { source?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional
  }

  // Initialize service
  const offerService = getOfferService();

  // Claim the offer
  const claimResult: ClaimResult = await offerService.claimOffer(offerId, user.id);

  // Track source if provided
  if (body.source) {
    offerService.trackAnalytics(
      offerId,
      'claim',
      user.id,
      body.source as 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage' | 'category'
    ).catch(() => {
      // Silently fail analytics
    });
  }

  return createSuccessResponse(claimResult, 201);
});

/**
 * GET /api/offers/[id]/claim
 * Check if the authenticated user has claimed this offer
 *
 * @auth Required
 * @response { data: { hasClaimed: boolean, claim?: Claim } }
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - URL format: /api/offers/[id]/claim
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerIdStr = pathSegments[pathSegments.length - 2] || '';
  const offerId = parseInt(offerIdStr);

  if (isNaN(offerId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid offer ID'),
      400
    );
  }

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('You must be logged in to check claim status'),
      401
    );
  }

  // Initialize service
  const offerService = getOfferService();

  // Get user's claims for this offer
  const claims = await offerService.getUserClaims(user.id);
  const claim = claims.find(c => c.offer_id === offerId);

  return createSuccessResponse({
    hasClaimed: !!claim,
    claim: claim || null
  }, 200);
});
