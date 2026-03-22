/**
 * POST /api/offers/[id]/self-redeem
 *
 * Self-report redemption (honor system)
 * Allows users to mark their own claim as redeemed
 *
 * @tier STANDARD
 * @phase TD-P3-004 - Self-Redemption UI Flow
 * @authority Phase 3 Brain Plan
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * POST handler - Self-report redemption
 *
 * Auth: Authenticated user (must own the claim)
 * Body: { claimId: number }
 * Returns: RedemptionResult
 *
 * @example
 * POST /api/offers/123/self-redeem
 * Body: { "claimId": 456 }
 * Response: { data: { success, claimId, redemptionMethod, redeemedAt, message } }
 */
export const POST = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to report redemption');
  }

  // Parse request body
  const body = await context.request.json();
  const { claimId } = body;

  if (!claimId || typeof claimId !== 'number') {
    throw BizError.badRequest('claimId is required and must be a number');
  }

  // Self-report redemption
  const offerService = getOfferService();
  const result = await offerService.selfReportRedemption(claimId, user.id);

  return createSuccessResponse(result);
});
