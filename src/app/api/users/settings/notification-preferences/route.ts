/**
 * Notification Preferences API Route
 *
 * GET - Retrieve user's notification preferences
 * PUT - Update user's notification preferences
 *
 * @authority docs/notificationService/phases/PHASE_2_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/settings/connection-privacy/route.ts - API pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getNotificationPreferencesService } from '@core/services/ServiceRegistry';
import { UserNotificationPreferences } from '@core/services/notification/types';
import { BizError } from '@core/errors/BizError';

/**
 * GET - Retrieve user's notification preferences
 */
export const GET = apiHandler(
  async (context: ApiContext) => {
    const service = getNotificationPreferencesService();
    const userId = parseInt(context.userId!, 10);

    const preferences = await service.getPreferences(userId);

    return createSuccessResponse(
      { preferences },
      context.requestId
    );
  },
  { requireAuth: true }
);

/**
 * PUT - Update user's notification preferences
 */
export const PUT = apiHandler(
  async (context: ApiContext) => {
    const service = getNotificationPreferencesService();
    const userId = parseInt(context.userId!, 10);

    const body = await context.request.json() as { preferences: Partial<UserNotificationPreferences> };

    if (!body.preferences) {
      throw BizError.badRequest('preferences field is required');
    }

    const updatedPreferences = await service.updatePreferences(userId, body.preferences);

    return createSuccessResponse(
      {
        preferences: updatedPreferences,
        message: 'Notification preferences updated successfully'
      },
      context.requestId
    );
  },
  { requireAuth: true }
);
