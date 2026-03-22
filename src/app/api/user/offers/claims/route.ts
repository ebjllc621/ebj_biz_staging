/**
 * User Offer Claims API Route
 *
 * GET /api/user/offers/claims - Get current user's claimed offers
 *
 * @tier STANDARD
 * @phase Offers Phase 1 - Core CRUD & Display
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_1_CORE_CRUD_BRAIN_PLAN.md
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import type { ClaimStatus } from '@features/offers/types';

/**
 * GET /api/user/offers/claims
 * Get current user's claimed offers with optional status filter
 *
 * @auth Required
 * @query { status?: ClaimStatus }
 * @response { data: { claims: Claim[], meta: { total: number, status: string } } }
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Please sign in to view your claims'),
      401
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as ClaimStatus | null;

  const offerService = getOfferService();
  const claims = await offerService.getUserClaims(user.id, status || undefined);

  return createSuccessResponse({
    claims,
    meta: {
      total: claims.length,
      status: status || 'all'
    }
  });
});
