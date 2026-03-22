/**
 * Offer Follows API Route - POST create, GET list
 *
 * @tier STANDARD
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import type { FollowType, NotificationFrequency } from '@features/offers/types';

// ============================================================================
// POST - Follow a business or category for offer notifications
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Parse request body
  let body: { follow_type: FollowType; target_id?: number; frequency?: NotificationFrequency };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid JSON body'),
      400
    );
  }

  const { follow_type, target_id, frequency = 'realtime' } = body;

  // Validate follow_type
  const validFollowTypes: FollowType[] = ['business', 'category', 'all_offers'];
  if (!follow_type || !validFollowTypes.includes(follow_type)) {
    return createErrorResponse(
      BizError.badRequest('Invalid follow type'),
      400
    );
  }

  // Validate frequency
  const validFrequencies: NotificationFrequency[] = ['realtime', 'daily', 'weekly'];
  if (!validFrequencies.includes(frequency)) {
    return createErrorResponse(
      BizError.badRequest('Invalid notification frequency'),
      400
    );
  }

  // Validate target_id based on follow_type
  if (follow_type === 'all_offers' && target_id !== undefined) {
    return createErrorResponse(
      BizError.badRequest('all_offers follow type cannot have target_id'),
      400
    );
  }

  if ((follow_type === 'business' || follow_type === 'category') && !target_id) {
    return createErrorResponse(
      BizError.badRequest(`${follow_type} follow type requires target_id`),
      400
    );
  }

  // Get OfferService
  const offerService = getOfferService();

  // Create follow
  const follow = await offerService.followForOffers(
    user.id,
    follow_type,
    target_id || null,
    frequency
  );

  return createSuccessResponse({ follow }, 201);
});

// ============================================================================
// GET - Get user's offer follows
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Get OfferService
  const offerService = getOfferService();

  // Get follows
  const follows = await offerService.getOfferFollows(user.id);

  return createSuccessResponse({ follows }, 200);
});
