/**
 * GET /api/user/loyalty
 * Get user's loyalty overview across all businesses
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import type { LoyaltyTier, BusinessLoyaltyStatus } from '@features/offers/types';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const offerService = getOfferService();
  // getUserLoyaltyOverview to be implemented in OfferService
  const tier: LoyaltyTier = 'bronze';
  const totalPoints = 0;
  const businessStatuses: BusinessLoyaltyStatus[] = [];

  return createSuccessResponse({ tier, totalPoints, businessStatuses }, context.requestId);
});
