/**
 * POST /api/claims/offline-validate
 * Validate offline redemption
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { OfflineCacheData } from '@features/offers/types';

export const POST = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  try {
    const body = await request.json();
    const cacheData: OfflineCacheData = {
      claim_id: body.claim_id,
      promo_code: body.promo_code,
      offer_title: body.offer_title,
      business_name: body.business_name,
      expires_at: new Date(body.expires_at),
      cached_at: new Date(body.cached_at),
      signature: body.signature,
    };

    const offerService = getOfferService();
    const result = await offerService.validateOfflineRedemption(cacheData);

    return createSuccessResponse({ result }, context.requestId);
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
});
