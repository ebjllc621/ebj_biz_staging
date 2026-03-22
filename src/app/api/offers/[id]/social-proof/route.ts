/**
 * GET /api/offers/[id]/social-proof
 * Get social proof data for an offer
 *
 * @tier STANDARD
 * @phase Phase 4 - Advanced Features
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  try {
    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const offerIdStr = pathSegments[pathSegments.length - 2] || ''; // -2 because last is "social-proof"
    const offerId = parseInt(offerIdStr, 10);

    if (isNaN(offerId)) {
      return createErrorResponse(
        BizError.badRequest('Invalid offer ID'),
        context.requestId
      );
    }

    // Initialize services
    const offerService = getOfferService();

    // Get social proof data
    const socialProof = await offerService.getSocialProofData(offerId);

    return createSuccessResponse({ socialProof }, context.requestId);
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
});
