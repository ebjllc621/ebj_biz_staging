/**
 * Event Reviews API Route
 *
 * GET /api/events/[id]/reviews - Get paginated reviews + distribution (public)
 * POST /api/events/[id]/reviews - Submit a review (auth required, CSRF protected)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Public access for GET, authenticated for POST
 * - CSRF protection via apiHandler on POST
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 4 - Task 4.3: Event Reviews API
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { DuplicateEventReviewError, EventReviewNotEligibleError } from '@core/services/EventService';
import { NotificationService } from '@core/services/NotificationService';
import { InternalAnalyticsService } from '@core/services/InternalAnalyticsService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { awardReviewPoints } from '@core/utils/review-rewards';

/**
 * GET /api/events/[id]/reviews
 * Public endpoint — no authentication required
 * Returns paginated reviews, distribution, and pagination metadata
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract event ID from URL path: .../events/[id]/reviews
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2];

  if (!id) {
    return createErrorResponse('Event ID is required', 400);
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return createErrorResponse('Invalid event ID', 400);
  }

  // Parse pagination params
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20);

  const eventService = getEventService();

  const [{ reviews, pagination }, distribution] = await Promise.all([
    eventService.getEventReviews(eventId, page, limit),
    eventService.getEventReviewDistribution(eventId),
  ]);

  return createSuccessResponse({ reviews, distribution, pagination });
});

/**
 * POST /api/events/[id]/reviews
 * Auth required — CSRF protection via apiHandler
 * Body: { rating: number, review_text?: string }
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract event ID from URL path: .../events/[id]/reviews
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2];

  if (!id) {
    return createErrorResponse('Event ID is required', 400);
  }

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return createErrorResponse('Invalid event ID', 400);
  }

  // Require authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  // Parse and validate request body
  let body: { rating?: unknown; review_text?: unknown; images?: unknown };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return createErrorResponse('Rating must be an integer between 1 and 5', 400);
  }

  const reviewText = typeof body.review_text === 'string' ? body.review_text.trim() : undefined;
  const images = Array.isArray(body.images) ? body.images.filter((img: unknown) => typeof img === 'string') : undefined;
  if (reviewText && reviewText.length < 20) {
    return createErrorResponse('Review text must be at least 20 characters if provided', 400);
  }
  if (reviewText && reviewText.length > 2000) {
    return createErrorResponse('Review text must not exceed 2000 characters', 400);
  }

  const eventService = getEventService();

  // Check eligibility before creating
  const eligibility = await eventService.canUserReviewEvent(Number(user.id), eventId);
  if (!eligibility.canReview) {
    return createErrorResponse(eligibility.reason || 'Not eligible to review this event', 403);
  }

  try {
    const review = await eventService.createEventReview(eventId, Number(user.id), {
      rating,
      review_text: reviewText,
      images,
    });

    // Fire-and-forget: notifications + analytics
    const db = getDatabaseService();

    // Notify event owner
    db.query<{ user_id: number; title: string }>(
      'SELECT user_id, title FROM events WHERE id = ? LIMIT 1',
      [eventId]
    ).then(eventResult => {
      const event = eventResult.rows[0];
      if (event && event.user_id !== Number(user.id)) {
        const notificationService = new NotificationService(db);
        notificationService.dispatch({
          type: 'review.received',
          recipientId: event.user_id,
          title: 'New review on your event',
          message: `Someone left a ${rating}-star review on "${event.title}"`,
          entityType: 'review',
          entityId: review.id,
          actionUrl: `/events/${eventId}`,
          priority: 'normal',
          triggeredBy: Number(user.id),
        }).catch(() => {});
      }
    }).catch(() => {});

    // Track analytics conversion + reward points
    const analyticsService = new InternalAnalyticsService(db);
    analyticsService.trackConversion({
      conversionType: 'review_submitted',
      userId: Number(user.id),
    }).catch(() => {});

    awardReviewPoints(Number(user.id), {
      reviewText: reviewText,
      images: images ?? null,
      entityType: 'event',
      entityId: eventId,
    });

    return createSuccessResponse({ review }, 201);
  } catch (error) {
    if (error instanceof DuplicateEventReviewError) {
      return createErrorResponse('You have already reviewed this event', 409);
    }
    if (error instanceof EventReviewNotEligibleError) {
      return createErrorResponse(error.message, 403);
    }
    throw error;
  }
});
