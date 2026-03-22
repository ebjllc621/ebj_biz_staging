/**
 * Event Analytics Tracking API Route
 *
 * POST /api/events/[id]/analytics - Track analytics event
 * GET /api/events/[id]/analytics - Get analytics funnel data (authenticated, owner/admin)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Public access (optional auth) for POST, authenticated for GET
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 3 - Event Analytics & Social Sharing
 */

import { getDatabaseService, getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';
import type { EventAnalyticsMetricType, EventAnalyticsSource } from '@features/events/types';

interface AnalyticsRequestBody {
  metric_type: EventAnalyticsMetricType;
  source?: EventAnalyticsSource;
  platform?: string;
}

/**
 * POST /api/events/[id]/analytics
 * Track analytics event for an event (impressions, views, clicks, etc.)
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract event ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../events/[id]/analytics

  if (!id) {
    return createErrorResponse('Event ID is required', 400);
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return createErrorResponse('Invalid event ID', 400);
  }

  // Parse request body
  let body: AnalyticsRequestBody;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  if (!body.metric_type) {
    return createErrorResponse('metric_type is required', 400);
  }

  // Validate metric_type
  const validMetricTypes: EventAnalyticsMetricType[] = [
    'impression',
    'page_view',
    'save',
    'share',
    'external_click'
  ];

  if (!validMetricTypes.includes(body.metric_type)) {
    return createErrorResponse('Invalid metric_type', 400);
  }

  // Validate source (must match database ENUM constraint)
  const validSources: EventAnalyticsSource[] = [
    'search',
    'notification',
    'direct',
    'social',
    'listing',
    'homepage'
  ];

  if (body.source && !validSources.includes(body.source)) {
    console.warn(`[EventAPI] Invalid source value: '${body.source}' - sanitizing to null`);
    body.source = undefined;
  }

  // Get user ID if authenticated (optional)
  const user = await getUserFromRequest(request);
  const userId = user?.id || null;

  // Delegate to EventService with server-side deduplication
  const eventService = getEventService();
  try {
    await eventService.recordAnalyticsEvent(
      eventId,
      body.metric_type,
      userId,
      body.source,
      body.platform
    );

    // Update denormalized view_count on events table for page_view
    if (body.metric_type === 'page_view') {
      const db = getDatabaseService();
      await db.query(
        'UPDATE events SET view_count = view_count + 1 WHERE id = ?',
        [eventId]
      );
    }
  } catch (error) {
    console.error('[EventAPI] Failed to track analytics:', error);
    return createErrorResponse('Failed to track analytics', 500);
  }

  return createSuccessResponse({
    message: 'Analytics event tracked',
    metric_type: body.metric_type,
    event_id: eventId
  }, 200);
});

/**
 * GET /api/events/[id]/analytics
 * Get analytics funnel data for an event (authenticated, owner/admin only)
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract event ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../events/[id]/analytics

  if (!id) {
    return createErrorResponse('Event ID is required', 400);
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return createErrorResponse('Invalid event ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const eventService = getEventService();

  // Verify event exists
  const event = await eventService.getById(eventId);
  if (!event) {
    return createErrorResponse('Event not found', 404);
  }

  // Verify ownership or admin
  if (user.role !== 'admin') {
    if (!event.listing_id) {
      return createErrorResponse('Event has no associated listing', 400);
    }
    const listingService = getListingService();
    const listing = await listingService.getById(event.listing_id);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse('You do not have permission to view analytics for this event', 403);
    }
  }

  const funnel = await eventService.getEventAnalyticsFunnel(eventId);
  const shares = await eventService.getSharesByPlatform(eventId);

  // Get referral count from user_referrals table
  const db = getDatabaseService();
  const referralResult = await db.query<{ count: bigint }>(
    "SELECT COUNT(*) as count FROM user_referrals WHERE entity_type = 'event' AND entity_id = ?",
    [String(eventId)]
  );
  const referrals = bigIntToNumber(referralResult.rows[0]?.count ?? 0);

  return createSuccessResponse({
    funnel,
    shares,
    referrals,
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
      created_at: event.created_at
    }
  });
});
