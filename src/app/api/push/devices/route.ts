/**
 * User Push Devices API Route
 *
 * GET - List user's registered push notification devices
 *
 * @authority docs/notificationService/phases/PHASE_3_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/settings/notification-preferences/route.ts - API pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getPushDeviceService } from '@core/services/ServiceRegistry';

/**
 * GET - List user's registered devices
 * Returns devices with masked tokens (last 8 chars only)
 */
export const GET = apiHandler(
  async (context: ApiContext) => {
    const service = getPushDeviceService();
    const userId = parseInt(context.userId!, 10);

    const devices = await service.getUserDevices(userId);

    // Mask device tokens for security
    const maskedDevices = devices.map((device) => ({
      id: device.id,
      platform: device.platform,
      browser: device.browser,
      deviceName: device.deviceName,
      isActive: device.isActive,
      lastUsedAt: device.lastUsedAt,
      createdAt: device.createdAt,
      // Show only last 8 characters of token
      deviceToken: `...${device.deviceToken.slice(-8)}`
    }));

    return createSuccessResponse(
      {
        devices: maskedDevices,
        count: maskedDevices.length
      },
      context.requestId
    );
  },
  { requireAuth: true }
);
