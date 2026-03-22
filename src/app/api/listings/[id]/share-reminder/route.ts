/**
 * Share Reminder API Route - GET share reminder status for listing owner
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 * @reference src/app/api/listings/[id]/broadcast/route.ts
 */

import { getShareReminderService } from '@core/services/ShareReminderService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';

// ============================================================================
// GET - Check if share reminder should show + get nudge data
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  // Extract listing id from URL path: /api/listings/[id]/share-reminder
  const segments = request.nextUrl.pathname.split('/');
  const listingIdStr = segments[segments.indexOf('listings') + 1];
  const listingId = parseInt(listingIdStr ?? '', 10);

  if (isNaN(listingId) || listingId <= 0) {
    return createErrorResponse('Invalid listing ID', 400);
  }

  const service = getShareReminderService();
  const userId = user.id;

  const [reminder, nudge] = await Promise.all([
    service.shouldShowReminder(listingId, userId),
    service.getPerformanceNudge(listingId)
  ]);

  return createSuccessResponse({ reminder, nudge });
});
