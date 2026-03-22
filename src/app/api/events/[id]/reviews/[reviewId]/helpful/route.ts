/**
 * Event Review Helpfulness API Route
 * POST /api/events/[id]/reviews/[reviewId]/helpful - Mark event review as helpful/not helpful
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing POST
 * - requireAuth: MANDATORY — user must be authenticated to vote
 * - Direct counter increment on event_reviews (no separate tracking table)
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 4B - Helpful Voting for Event Reviews
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * POST /api/events/[id]/reviews/[reviewId]/helpful
 * Increment helpful_count or not_helpful_count directly on event_reviews row.
 * Body: { isHelpful: boolean }
 *
 * @authenticated User authentication required
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract eventId and reviewId from URL path
  // Path: /api/events/[id]/reviews/[reviewId]/helpful
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  // segments: ['', 'api', 'events', id, 'reviews', reviewId, 'helpful']
  const reviewId = parseInt(segments[segments.length - 2] ?? '');
  const eventId = parseInt(segments[segments.length - 4] ?? '');

  if (isNaN(eventId)) {
    throw BizError.badRequest('Invalid event ID');
  }
  if (isNaN(reviewId)) {
    throw BizError.badRequest('Invalid review ID');
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

  if (requestBody.isHelpful === undefined || typeof requestBody.isHelpful !== 'boolean') {
    throw BizError.validation('isHelpful', requestBody.isHelpful, 'isHelpful is required and must be a boolean');
  }

  const isHelpful = requestBody.isHelpful;

  const db = getDatabaseService();

  // Validate the review exists and belongs to this event
  const reviewCheck = await db.query<{ id: number }>(
    'SELECT id FROM event_reviews WHERE id = ? AND event_id = ? LIMIT 1',
    [reviewId, eventId]
  );

  if (reviewCheck.rows.length === 0) {
    throw BizError.notFound('Review not found for this event');
  }

  // Increment the appropriate counter
  const column = isHelpful ? 'helpful_count' : 'not_helpful_count';
  await db.query(
    `UPDATE event_reviews SET ${column} = ${column} + 1 WHERE id = ?`,
    [reviewId]
  );

  return createSuccessResponse(
    { reviewId, isHelpful, message: 'Vote recorded' },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
