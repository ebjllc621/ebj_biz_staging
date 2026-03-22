/**
 * Offer Redemption API Route
 * POST /api/offers/[id]/redeem - Redeem an offer
 * GET /api/offers/[id]/redeem - Check if user can redeem
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: COMPLIANT
 * - DatabaseService boundary
 * - Build Map v2.1 ENHANCED patterns
 * - Redemption tracking with duplicate prevention
 *
 * @authority CLAUDE.md - API Standards
 * @authority Phase 4 Brain Plan - Task 4.3: OfferService API
 * @compliance E2.4 - API Route Standards
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getOfferService, getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * POST /api/offers/[id]/redeem
 * Redeem an offer for the current user
 */
export const POST = apiHandler(async (context) => {
  const url = new URL(context.request.url);
  const idMatch = url.pathname.match(/\/offers\/(\d+)\/redeem/);

  if (!idMatch || !idMatch[1]) {
    throw BizError.badRequest('Invalid offer ID');
  }

  const id = parseInt(idMatch[1]);

  if (isNaN(id)) {
    throw BizError.badRequest('Invalid offer ID');
  }

  const body = await context.request.json();

  if (!body.userId) {
    throw BizError.badRequest('userId is required', { field: 'userId' });
  }

  const userId = parseInt(body.userId);
  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { userId: body.userId });
  }

  // Initialize services
  
  
  
  const listingService = getListingService();
  const offerService = getOfferService();

  // Redeem offer
  const redemption = await offerService.redeem(id, userId, body.code);
  const offer = await offerService.getById(id);

  return createSuccessResponse({
    redemption,
    offer,
    message: 'Offer redeemed successfully'
  }, 201);
});

/**
 * GET /api/offers/[id]/redeem
 * Check if user can redeem an offer
 */
export const GET = apiHandler(async (context) => {
  const url = new URL(context.request.url);
  const idMatch = url.pathname.match(/\/offers\/(\d+)\/redeem/);

  if (!idMatch || !idMatch[1]) {
    throw BizError.badRequest('Invalid offer ID');
  }

  const id = parseInt(idMatch[1]);

  if (isNaN(id)) {
    throw BizError.badRequest('Invalid offer ID');
  }

  const userIdParam = url.searchParams.get('userId');
  if (!userIdParam) {
    throw BizError.badRequest('userId query parameter is required', {
      field: 'userId'
    });
  }

  const userId = parseInt(userIdParam);
  if (isNaN(userId)) {
    throw BizError.badRequest('Invalid user ID', { userId: userIdParam });
  }

  // Initialize services
  
  
  
  const listingService = getListingService();
  const offerService = getOfferService();

  // Check if user can redeem
  const check = await offerService.canRedeem(id, userId);

  return createSuccessResponse(check, 200);
});
