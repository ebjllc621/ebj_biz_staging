/**
 * Exhibitor Impressions API Route
 *
 * POST /api/events/[id]/exhibitors/impressions - Batch increment impression counts
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6B - Exhibitor System
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';

/**
 * POST /api/events/[id]/exhibitors/impressions
 * Public — fire-and-forget analytics tracking
 * Body: { exhibitorIds: number[] }
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  let body: { exhibitorIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  if (!Array.isArray(body.exhibitorIds) || body.exhibitorIds.length === 0) {
    return createSuccessResponse({ tracked: 0 });
  }

  const exhibitorIds = body.exhibitorIds
    .map((id: unknown) => Number(id))
    .filter((id: number) => !isNaN(id) && id > 0);

  if (exhibitorIds.length === 0) {
    return createSuccessResponse({ tracked: 0 });
  }

  const eventService = getEventService();
  await eventService.incrementExhibitorImpressions(exhibitorIds);

  return createSuccessResponse({ tracked: exhibitorIds.length });
});
