/**
 * VAPID Public Key API Route
 *
 * GET - Return VAPID public key for push notification subscription
 *
 * @authority docs/notificationService/phases/PHASE_3_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/settings/notification-preferences/route.ts - API pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';

/**
 * GET - Return VAPID public key
 * Public endpoint - no auth required
 */
export const GET = apiHandler(
  async (context: ApiContext) => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;

    return createSuccessResponse(
      {
        vapidPublicKey,
        configured: vapidPublicKey !== null
      },
      context.requestId
    );
  },
  { requireAuth: false }
);
