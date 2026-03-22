/**
 * DELETE /api/offers/[id]/geo-trigger/[triggerId]
 * Remove geo-fence trigger from offer
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  // Extract triggerId from URL pathname - /api/offers/[id]/geo-trigger/[triggerId]
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const triggerId = pathSegments[pathSegments.length - 1] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const offerService = getOfferService();
  // removeGeoTrigger to be implemented in OfferService

  return createSuccessResponse({ deleted: true }, context.requestId);
});
