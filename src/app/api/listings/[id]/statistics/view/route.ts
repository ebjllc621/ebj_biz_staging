/**
 * POST /api/listings/[id]/statistics/view - Track Listing View
 *
 * @tier API_ROUTE
 * @phase Phase 10 - Marketing & Advanced Features (Enhanced with referrer tracking)
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST query real database (NO mock data)
 * - Fire-and-forget pattern (tracking doesn't fail requests)
 * - Captures referrer for traffic source analytics
 *
 * @reference src/core/services/InternalAnalyticsService.ts - Analytics tracking patterns
 * @reference src/app/api/listings/[id]/stats/route.ts - Real query patterns
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';

/** Request body for view tracking */
interface ViewTrackingRequest {
  referrer?: string;
  sessionId?: string;
}

/** Response type for view tracking */
interface ViewTrackingResponse {
  tracked: boolean;
  listingId?: number;
  reason?: string;
}

/**
 * POST handler - Track a listing view with referrer
 *
 * Inserts a record into analytics_listing_views table including referrer.
 * Uses fire-and-forget pattern: always returns success even if tracking fails.
 */
export const POST = apiHandler<ViewTrackingResponse>(async (context: ApiContext) => {
  // Extract listing ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    return createSuccessResponse<ViewTrackingResponse>({ tracked: false, reason: 'no_listing_id' }, context.requestId);
  }

  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    return createSuccessResponse<ViewTrackingResponse>({ tracked: false, reason: 'invalid_listing_id' }, context.requestId);
  }

  try {
    // Parse request body for referrer and session info
    let referrer: string | null = null;
    let sessionId: string | null = null;

    try {
      const body = await context.request.json() as ViewTrackingRequest;
      referrer = body.referrer || null;
      sessionId = body.sessionId || null;
    } catch {
      // No body or invalid JSON - continue without referrer
    }

    // Fallback to header-based session ID
    if (!sessionId) {
      sessionId = context.request.headers.get('x-session-id') || null;
    }

    const db = getDatabaseService();
    const userId = context.userId ? parseInt(context.userId, 10) : null;

    // Insert directly with referrer support
    await db.query(
      `INSERT INTO analytics_listing_views (
        listing_id, user_id, session_id, referrer
      ) VALUES (?, ?, ?, ?)`,
      [listingId, userId, sessionId, referrer]
    );

    console.log(`[View Tracking] Tracked view for listing ${listingId}, user: ${context.userId || 'anonymous'}, referrer: ${referrer || 'none'}`);

    return createSuccessResponse<ViewTrackingResponse>({ tracked: true, listingId }, context.requestId);
  } catch (error) {
    // Circuit breaker: tracking failures should never impact user experience
    console.error('[View Tracking] Error tracking view:', error);
    return createSuccessResponse<ViewTrackingResponse>({ tracked: false, reason: 'tracking_error' }, context.requestId);
  }
}, {
  allowedMethods: ['POST'],
  requireAuth: false // Allow anonymous users to be tracked
});
