/**
 * POST /api/listings/[id]/track - Track Listing Analytics Events
 *
 * @tier API_ROUTE
 * @phase Phase 10 - Marketing & Advanced Features (Analytics E2E)
 * @generated SYSREP Diagnostic Fix
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST use InternalAnalyticsService for database operations
 * - Fire-and-forget pattern (always returns success)
 * - Stores proper listing_id column (not JSON)
 *
 * Tracks:
 * - Click events (favorite, share, contact, website, directions, phone, email)
 * - Conversion events (contact sent, quote request, booking)
 *
 * @reference src/core/services/InternalAnalyticsService.ts - Analytics patterns
 * @reference src/app/api/listings/[id]/statistics/view/route.ts - Fire-and-forget pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';

/** Request body types */
interface ClickEventBody {
  eventType: 'click';
  eventName: string;
  eventData?: Record<string, unknown>;
  sessionId?: string;
  referrer?: string;
}

interface ConversionEventBody {
  eventType: 'conversion';
  conversionType: string;
  value?: number | null;
  sessionId?: string;
  referrer?: string;
}

type TrackRequestBody = ClickEventBody | ConversionEventBody;

/** Response type */
interface TrackResponse {
  tracked: boolean;
  listingId?: number;
  eventType?: string;
  reason?: string;
}

/**
 * POST handler - Track a listing analytics event
 *
 * Fire-and-forget pattern: Always returns success, tracking errors are swallowed.
 */
export const POST = apiHandler<TrackResponse>(async (context: ApiContext) => {
  // Extract listing ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    return createSuccessResponse<TrackResponse>(
      { tracked: false, reason: 'no_listing_id' },
      context.requestId
    );
  }

  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    return createSuccessResponse<TrackResponse>(
      { tracked: false, reason: 'invalid_listing_id' },
      context.requestId
    );
  }

  try {
    // Parse request body
    const body = await context.request.json() as TrackRequestBody;

    if (!body.eventType) {
      return createSuccessResponse<TrackResponse>(
        { tracked: false, reason: 'missing_event_type' },
        context.requestId
      );
    }

    const db = getDatabaseService();
    const userId = context.userId ? parseInt(context.userId, 10) : null;

    if (body.eventType === 'click') {
      // Track click event
      const clickBody = body as ClickEventBody;

      await db.query(
        `INSERT INTO analytics_events (
          event_name, event_data, listing_id, user_id, session_id
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          clickBody.eventName,
          clickBody.eventData ? JSON.stringify(clickBody.eventData) : null,
          listingId,
          userId,
          clickBody.sessionId || null,
        ]
      );

      console.log(
        `[Analytics] Click tracked: ${clickBody.eventName} for listing ${listingId}` +
        (userId ? `, user ${userId}` : '')
      );

      return createSuccessResponse<TrackResponse>(
        { tracked: true, listingId, eventType: clickBody.eventName },
        context.requestId
      );
    } else if (body.eventType === 'conversion') {
      // Track conversion event
      const convBody = body as ConversionEventBody;

      await db.query(
        `INSERT INTO analytics_conversions (
          conversion_type, value, listing_id, user_id, session_id
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          convBody.conversionType,
          convBody.value || null,
          listingId,
          userId,
          convBody.sessionId || null,
        ]
      );

      console.log(
        `[Analytics] Conversion tracked: ${convBody.conversionType} for listing ${listingId}` +
        (convBody.value ? `, value: ${convBody.value}` : '') +
        (userId ? `, user ${userId}` : '')
      );

      return createSuccessResponse<TrackResponse>(
        { tracked: true, listingId, eventType: convBody.conversionType },
        context.requestId
      );
    }

    return createSuccessResponse<TrackResponse>(
      { tracked: false, reason: 'unknown_event_type' },
      context.requestId
    );
  } catch (error) {
    // Fire-and-forget: Log error but always return success
    console.error('[Analytics] Tracking error (non-blocking):', error);

    return createSuccessResponse<TrackResponse>(
      { tracked: false, reason: 'tracking_error' },
      context.requestId
    );
  }
}, {
  allowedMethods: ['POST'],
  requireAuth: false, // Allow anonymous tracking
});
