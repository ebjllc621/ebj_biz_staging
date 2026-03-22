/**
 * Push Device Registration API Route
 *
 * POST - Register device for push notifications
 * DELETE - Unregister device from push notifications
 *
 * @authority docs/notificationService/phases/PHASE_3_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/settings/notification-preferences/route.ts - API pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getPushDeviceService } from '@core/services/ServiceRegistry';
import { PushDeviceRegistration } from '@core/services/notification/push-types';
import { BizError } from '@core/errors/BizError';

/**
 * POST - Register device for push notifications
 */
export const POST = apiHandler(
  async (context: ApiContext) => {
    const service = getPushDeviceService();
    const userId = parseInt(context.userId!, 10);

    const body = await context.request.json() as PushDeviceRegistration;

    // Validate required fields
    if (!body.deviceToken) {
      throw BizError.badRequest('deviceToken is required');
    }

    if (!body.platform) {
      throw BizError.badRequest('platform is required');
    }

    if (!['web', 'ios', 'android'].includes(body.platform)) {
      throw BizError.badRequest('platform must be web, ios, or android');
    }

    const deviceId = await service.registerDevice(userId, body);

    return createSuccessResponse(
      {
        deviceId,
        message: 'Device registered successfully'
      },
      context.requestId
    );
  },
  { requireAuth: true }
);

/**
 * DELETE - Unregister device from push notifications
 */
export const DELETE = apiHandler(
  async (context: ApiContext) => {
    const service = getPushDeviceService();
    const userId = parseInt(context.userId!, 10);

    const body = await context.request.json() as { deviceToken: string };

    if (!body.deviceToken) {
      throw BizError.badRequest('deviceToken is required');
    }

    const removed = await service.unregisterDevice(userId, body.deviceToken);

    return createSuccessResponse(
      {
        removed,
        message: removed ? 'Device unregistered successfully' : 'Device not found'
      },
      context.requestId
    );
  },
  { requireAuth: true }
);
