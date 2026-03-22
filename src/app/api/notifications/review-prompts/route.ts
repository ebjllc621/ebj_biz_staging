/**
 * Review Prompts API Route - GET pending prompts, POST schedule, DELETE cancel
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 * @reference src/app/api/subscriptions/categories/route.ts
 */

import { getPostVisitReviewTrigger } from '@core/services/PostVisitReviewTrigger';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';

// ============================================================================
// GET - Get pending review prompts for current user
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const userId = user.id;
  const service = getPostVisitReviewTrigger();
  const prompts = await service.getPendingPrompts(userId);

  return createSuccessResponse({ prompts });
});

// ============================================================================
// POST - Schedule a review prompt (fire-and-forget after interaction)
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  let body: { listingId?: unknown; interactionType?: unknown };
  try {
    body = await request.json() as { listingId?: unknown; interactionType?: unknown };
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const { listingId, interactionType } = body;

  if (!listingId || typeof listingId !== 'number') {
    return createErrorResponse('listingId is required', 400);
  }

  const userId = user.id;
  const service = getPostVisitReviewTrigger();

  // Fire-and-forget scheduling
  await service.scheduleReviewPrompt(
    userId,
    listingId,
    typeof interactionType === 'string' ? interactionType : 'unknown'
  );

  return createSuccessResponse({ scheduled: true });
});

// ============================================================================
// DELETE - Cancel a review prompt
// ============================================================================

export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  let body: { listingId?: unknown };
  try {
    body = await request.json() as { listingId?: unknown };
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const { listingId } = body;
  if (!listingId || typeof listingId !== 'number') {
    return createErrorResponse('listingId is required', 400);
  }

  const userId = user.id;
  const service = getPostVisitReviewTrigger();
  await service.cancelPrompt(userId, listingId);

  return createSuccessResponse({ cancelled: true });
});
