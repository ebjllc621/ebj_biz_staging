/**
 * Event Review Testimonial Approval API Route
 *
 * PATCH /api/events/[id]/reviews/testimonial - Approve a review as a testimonial (auth required)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY (includes CSRF protection)
 * - Response format: createSuccessResponse/createErrorResponse
 * - Auth required — only review author can approve their own testimonial
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 4 - Task 4.3: Event Reviews API
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { EventReviewNotFoundError, EventReviewNotEligibleError } from '@core/services/EventService';

/**
 * PATCH /api/events/[id]/reviews/testimonial
 * Auth required — CSRF protection via apiHandler
 * Body: { review_id: number }
 *
 * Marks a review as approved for testimonial display.
 * Only the review author can approve their own review as a testimonial.
 */
export const PATCH = apiHandler(async (context) => {
  const { request } = context;

  // Extract event ID from URL path: .../events/[id]/reviews/testimonial
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  // testimonial is the last segment, reviews is before it, [id] is 2 before reviews
  const id = pathParts[pathParts.length - 3];

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

  // Parse request body
  let body: { review_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const reviewId = Number(body.review_id);
  if (!reviewId || isNaN(reviewId)) {
    return createErrorResponse('review_id is required', 400);
  }

  const eventService = getEventService();

  try {
    await eventService.approveTestimonial(reviewId, Number(user.id));
    return createSuccessResponse({ approved: true });
  } catch (error) {
    if (error instanceof EventReviewNotFoundError) {
      return createErrorResponse('Review not found', 404);
    }
    if (error instanceof EventReviewNotEligibleError) {
      return createErrorResponse('Only the review author can approve their testimonial', 403);
    }
    throw error;
  }
});
