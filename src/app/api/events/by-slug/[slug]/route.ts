/**
 * Event Detail API Route by Slug
 *
 * GET /api/events/by-slug/[slug] - Get event with listing data for detail page
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse
 * - Service boundary: EventService
 * - Public access (no auth required)
 * - View count increment (fire-and-forget)
 *
 * @authority CLAUDE.md - API Standards
 * @tier STANDARD
 * @phase Phase 1 - Event Detail Page Core
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';

/**
 * GET /api/events/by-slug/[slug]
 * Get event by slug with listing information for detail page
 *
 * @public No authentication required
 * @response { data: { event: EventDetailData } }
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract slug from URL pathname - format: /api/events/by-slug/[slug]
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const slug = pathSegments[pathSegments.length - 1] || '';

  if (!slug) {
    return createErrorResponse(
      BizError.badRequest('Slug parameter is required'),
      400
    );
  }

  const eventService = getEventService();

  // Get event with listing data via JOIN
  const event = await eventService.getBySlugWithListing(slug);

  if (!event) {
    return createErrorResponse(
      BizError.notFound('Event', slug),
      404
    );
  }

  // GAP-20: Strip virtual_link for non-RSVP'd users
  const user = await getUserFromRequest(request);
  let hasConfirmedRsvp = false;

  if (user && event.id) {
    try {
      const hasRsvped = await eventService.hasRsvped(event.id, user.id);
      if (hasRsvped) {
        const rsvps = await eventService.getRsvps(event.id);
        const userRsvp = rsvps.find((r: { user_id: number }) => r.user_id === user.id);
        hasConfirmedRsvp = userRsvp?.rsvp_status === 'confirmed';
      }
    } catch {
      // Silently fail — default to hiding virtual_link
    }
  }

  const responseEvent = hasConfirmedRsvp
    ? event
    : { ...event, virtual_link: null };

  // Increment view count (fire and forget - don't block response)
  eventService.incrementViewCount(event.id).catch(() => {
    // Silently fail - don't block response for analytics
  });

  return createSuccessResponse({
    event: responseEvent
  }, 200);
});
