/**
 * Category Subscriptions API Route - GET list, POST subscribe, DELETE unsubscribe
 *
 * @tier STANDARD
 * @phase Listings Phase 3A - Category Subscriptions & Follower Broadcast
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3A_BRAIN_PLAN.md
 * @reference src/app/api/user/offer-follows/route.ts
 */

import { getCategorySubscriptionService } from '@core/services/CategorySubscriptionService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';

const VALID_FREQUENCIES = ['realtime', 'daily', 'weekly'] as const;
type Frequency = typeof VALID_FREQUENCIES[number];

// ============================================================================
// GET - List user's category subscriptions
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  const service = getCategorySubscriptionService();
  const subscriptions = await service.getUserSubscriptions(user.id);

  return createSuccessResponse({ subscriptions });
});

// ============================================================================
// POST - Subscribe to a category
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  let body: { categoryId?: unknown; frequency?: unknown };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid JSON body'),
      400
    );
  }

  const { categoryId, frequency = 'daily' } = body;

  // Validate categoryId
  if (!categoryId || typeof categoryId !== 'number' || !Number.isInteger(categoryId) || categoryId <= 0) {
    return createErrorResponse(
      BizError.badRequest('categoryId must be a positive integer'),
      400
    );
  }

  // Validate frequency
  if (!VALID_FREQUENCIES.includes(frequency as Frequency)) {
    return createErrorResponse(
      BizError.badRequest('frequency must be one of: realtime, daily, weekly'),
      400
    );
  }

  const service = getCategorySubscriptionService();
  const result = await service.subscribe(user.id, categoryId, frequency as Frequency);

  return createSuccessResponse({ subscription: result }, 201);
});

// ============================================================================
// DELETE - Unsubscribe from a category
// ============================================================================

export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  let body: { categoryId?: unknown };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid JSON body'),
      400
    );
  }

  const { categoryId } = body;

  // Validate categoryId
  if (!categoryId || typeof categoryId !== 'number' || !Number.isInteger(categoryId) || categoryId <= 0) {
    return createErrorResponse(
      BizError.badRequest('categoryId must be a positive integer'),
      400
    );
  }

  const service = getCategorySubscriptionService();
  await service.unsubscribe(user.id, categoryId);

  return createSuccessResponse({ unsubscribed: true });
});
