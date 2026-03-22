/**
 * GET /api/claims/[id]/offline-cache
 * Get offline cache data for a claim with HMAC signature
 *
 * @tier STANDARD
 * @phase Phase 4.5.5 - Technical Debt Resolution (TD-P4-012)
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - /api/claims/[id]/offline-cache
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const claimId = pathSegments[pathSegments.length - 2] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const offerService = getOfferService();
  const cacheData = await offerService.markForOfflineCache(parseInt(claimId, 10), user.id);

  return createSuccessResponse({ cacheData }, context.requestId);
});
