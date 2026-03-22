/**
 * Digest Preview API Route - GET digest preview content for current user
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 * @reference src/app/api/subscriptions/categories/route.ts
 */

import { getListingDigestService } from '@core/services/ListingDigestService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';

// ============================================================================
// GET - Generate digest preview content for current user
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const userId = user.id;
  const service = getListingDigestService();
  const preview = await service.generateDigestPreview(userId);

  return createSuccessResponse({ preview });
});
