/**
 * Public Event Types API Route
 *
 * GET /api/events/types - List active event types (public, no auth required)
 *
 * Used by: EventFormModal dropdown, public filter bars
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - No authentication required (public lookup data)
 *
 * @authority CLAUDE.md - API Standards
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';

/**
 * GET /api/events/types
 * Public — list all active event types for dropdowns
 */
export const GET = apiHandler(async () => {
  const eventService = getEventService();
  const eventTypes = await eventService.getEventTypes(false);

  return createSuccessResponse({
    eventTypes: eventTypes.map(et => ({
      id: et.id,
      name: et.name,
      slug: et.slug,
    })),
  });
});
