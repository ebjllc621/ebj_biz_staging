/**
 * Event Review Owner Response API Route
 * POST /api/events/[id]/reviews/[reviewId]/response - Add owner response to event review
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing POST
 * - requireAuth: MANDATORY — event owner must be authenticated
 * - Validates: authenticated user owns the event (events.user_id match)
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 4B - Owner Response for Event Reviews
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';

/**
 * POST /api/events/[id]/reviews/[reviewId]/response
 * Add owner response to an event review.
 * Body: { response: string }
 *
 * @authenticated Event owner authentication required
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract eventId and reviewId from URL path
  // Path: /api/events/[id]/reviews/[reviewId]/response
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  // segments: ['', 'api', 'events', id, 'reviews', reviewId, 'response']
  const reviewId = parseInt(segments[segments.length - 2] ?? '');
  const eventId = parseInt(segments[segments.length - 4] ?? '');

  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID');
  }
  if (isNaN(reviewId)) {
    throw BizError.badRequest('Invalid review ID');
  }

  // Get authenticated user ID (event owner)
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const ownerId = parseInt(userId);
  if (isNaN(ownerId)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.response || typeof requestBody.response !== 'string' || requestBody.response.trim() === '') {
    throw BizError.validation('response', requestBody.response, 'Response is required and must be a non-empty string');
  }

  const responseText = requestBody.response.trim();

  const db = getDatabaseService();

  // Validate the event exists and belongs to this user
  // Events are owned via events.listing_id -> listings.user_id
  const eventCheck = await db.query<{ id: number; user_id: number }>(
    `SELECT e.id, l.user_id
     FROM events e
     JOIN listings l ON l.id = e.listing_id
     WHERE e.id = ? LIMIT 1`,
    [eventId]
  );

  if (eventCheck.rows.length === 0) {
    throw BizError.notFound('Event not found');
  }

  if (eventCheck.rows[0]!.user_id !== ownerId) {
    throw BizError.forbidden('You do not own this event');
  }

  // Validate the review exists and belongs to this event
  const reviewCheck = await db.query<{ id: number; user_id: number }>(
    'SELECT id, user_id FROM event_reviews WHERE id = ? AND event_id = ? LIMIT 1',
    [reviewId, eventId]
  );

  if (reviewCheck.rows.length === 0) {
    throw BizError.notFound('Review not found for this event');
  }

  const reviewerId = reviewCheck.rows[0]!.user_id;

  // Update the owner response
  await db.query(
    'UPDATE event_reviews SET owner_response = ?, owner_response_date = NOW() WHERE id = ?',
    [responseText, reviewId]
  );

  // Fire-and-forget: notify reviewer that owner has responded
  db.query<{ user_id: number }>(
    'SELECT user_id FROM event_reviews WHERE id = ? LIMIT 1',
    [reviewId]
  ).then(() => {
    const notificationService = new NotificationService(db);
    notificationService.dispatch({
      type: 'review.response',
      recipientId: reviewerId,
      title: 'Event organizer responded to your review',
      message: 'The event organizer has responded to your review',
      entityType: 'review',
      entityId: reviewId,
      actionUrl: `/events`,
      priority: 'normal',
      triggeredBy: ownerId,
    }).catch(() => {});
  }).catch(() => {});

  return createSuccessResponse(
    { reviewId, eventId, message: 'Response submitted' },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
