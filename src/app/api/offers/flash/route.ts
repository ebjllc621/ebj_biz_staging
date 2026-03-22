/**
 * GET /api/offers/flash
 * Get active flash offers
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
    // Parse query parameters
    const url = new URL(request.url);
    const urgencyLevel = url.searchParams.get('urgencyLevel') as 'normal' | 'high' | 'critical' | null;

    // Initialize services
    const offerService = getOfferService();

    // Get active flash offers
    const filters = urgencyLevel ? { urgencyLevel } : undefined;
    const offers = await offerService.getActiveFlashOffers(filters);

    return createSuccessResponse({ offers }, context.requestId);
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
});
