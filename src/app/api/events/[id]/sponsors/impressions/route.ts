/**
 * Sponsor Impressions Tracking API Route
 * POST /api/events/[id]/sponsors/impressions
 *
 * Bulk impression tracking. No auth required.
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 8C - Sponsor Tracking
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getEventService } from '@core/services/ServiceRegistry';

/**
 * POST /api/events/[id]/sponsors/impressions
 * Increment impression count for multiple sponsors (fire-and-forget)
 */
export const POST = apiHandler(async (context) => {
  let body: { sponsorIds?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const { sponsorIds } = body;

  if (!Array.isArray(sponsorIds) || sponsorIds.length === 0 || !sponsorIds.every(id => typeof id === 'number')) {
    return createErrorResponse('sponsorIds must be a non-empty array of numbers', 400);
  }

  try {
    const eventService = getEventService();
    await eventService.incrementSponsorImpressions(sponsorIds as number[]);
  } catch {
    // Silently succeed — fire-and-forget tracking
  }

  return createSuccessResponse({ tracked: true });
});
