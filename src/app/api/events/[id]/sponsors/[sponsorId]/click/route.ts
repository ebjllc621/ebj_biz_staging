/**
 * Sponsor Click Tracking API Route
 * POST /api/events/[id]/sponsors/[sponsorId]/click
 *
 * Fire-and-forget click tracking. No auth required.
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 8C - Sponsor Tracking
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getEventService } from '@core/services/ServiceRegistry';

/**
 * POST /api/events/[id]/sponsors/[sponsorId]/click
 * Increment click count for a sponsor (fire-and-forget)
 */
export const POST = apiHandler(async (context) => {
  const url = new URL(context.request.url);
  const parts = url.pathname.split('/');
  // path: /api/events/[id]/sponsors/[sponsorId]/click
  const clickIndex = parts.indexOf('click');
  const sponsorId = clickIndex > 0 ? parseInt(parts[clickIndex - 1] ?? '') : NaN;

  if (isNaN(sponsorId)) {
    return createSuccessResponse({ tracked: false });
  }

  try {
    const eventService = getEventService();
    await eventService.incrementSponsorClick(sponsorId);
  } catch {
    // Silently succeed — fire-and-forget tracking
  }

  return createSuccessResponse({ tracked: true });
});
