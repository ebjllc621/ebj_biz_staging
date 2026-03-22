/**
 * Category Subscription by ID API Route - GET status, PUT update frequency
 *
 * @tier STANDARD
 * @phase Listings Phase 3A - Category Subscriptions & Follower Broadcast
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3A_BRAIN_PLAN.md
 */

import { getCategorySubscriptionService } from '@core/services/CategorySubscriptionService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';

const VALID_FREQUENCIES = ['realtime', 'daily', 'weekly'] as const;
type Frequency = typeof VALID_FREQUENCIES[number];

// ============================================================================
// GET - Check subscription status for a specific category
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

  // Extract categoryId from URL path: /api/subscriptions/categories/[categoryId]
  const segments = request.nextUrl.pathname.split('/');
  const categoryIdStr = segments[segments.indexOf('categories') + 1];
  const categoryId = parseInt(categoryIdStr ?? '', 10);

  if (isNaN(categoryId) || categoryId <= 0) {
    return createErrorResponse(
      BizError.badRequest('Invalid category ID'),
      400
    );
  }

  const service = getCategorySubscriptionService();
  const subscription = await service.getSubscription(user.id, categoryId);

  return createSuccessResponse({ subscription });
});

// ============================================================================
// PUT - Update notification frequency for a subscription
// ============================================================================

export const PUT = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Extract categoryId from URL path: /api/subscriptions/categories/[categoryId]
  const segments = request.nextUrl.pathname.split('/');
  const categoryIdStr = segments[segments.indexOf('categories') + 1];
  const categoryId = parseInt(categoryIdStr ?? '', 10);

  if (isNaN(categoryId) || categoryId <= 0) {
    return createErrorResponse(
      BizError.badRequest('Invalid category ID'),
      400
    );
  }

  let body: { frequency?: unknown };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid JSON body'),
      400
    );
  }

  const { frequency } = body;

  if (!frequency || !VALID_FREQUENCIES.includes(frequency as Frequency)) {
    return createErrorResponse(
      BizError.badRequest('frequency must be one of: realtime, daily, weekly'),
      400
    );
  }

  const service = getCategorySubscriptionService();
  await service.updateFrequency(user.id, categoryId, frequency as Frequency);

  return createSuccessResponse({ updated: true });
});
