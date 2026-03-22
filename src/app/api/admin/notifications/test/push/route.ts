/**
 * Admin Test Push Notification Endpoint
 *
 * POST /api/admin/notifications/test/push
 * Sends a test push notification to the requesting admin
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Sends test notification to admin's registered devices
 *
 * @phase Phase 6 - Setup Guides Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { FCMPushProvider } from '@core/services/notification/FCMPushProvider';
import { PushDeviceService } from '@core/services/notification/PushDeviceService';
import { BizError } from '@core/errors/BizError';
import type { TestPushResponse } from '@core/types/notification-admin';
import { ErrorService } from '@core/services/ErrorService';

/**
 * POST /api/admin/notifications/test/push
 * Send test push notification to admin
 */
async function testPushHandler(context: ApiContext) {
  const db = getDatabaseService();

  // Get current admin user ID from context
  const userId = context.userId;

  if (!userId) {
    throw new BizError({
      code: 'UNAUTHORIZED',
      message: 'User ID not found in context',
      userMessage: 'Authentication required'
    });
  }

  // Check if FCM is configured
  const fcmServerKey = process.env.FCM_SERVER_KEY;
  if (!fcmServerKey) {
    const response: TestPushResponse = {
      success: false,
      message: 'Firebase Cloud Messaging is not configured. Please set FCM_SERVER_KEY environment variable.',
      error: 'FCM_NOT_CONFIGURED'
    };
    return createSuccessResponse({ ...response }, context.requestId);
  }

  try {
    // Initialize services
    const pushDeviceService = new PushDeviceService(db);
    const fcmProvider = new FCMPushProvider(db);

    // Get admin's push devices
    const devices = await pushDeviceService.getUserDevices(Number(userId));

    if (devices.length === 0) {
      const response: TestPushResponse = {
        success: false,
        message: 'No push devices registered for your account. Please enable push notifications in your browser first.',
        error: 'NO_DEVICES_REGISTERED'
      };
      return createSuccessResponse({ ...response }, context.requestId);
    }

    // Send test notification to first active device
    const activeDevice = devices.find(d => d.isActive) || devices[0];

    if (!activeDevice) {
      const response: TestPushResponse = {
        success: false,
        message: 'No valid devices found for your account.',
        error: 'NO_VALID_DEVICES'
      };
      return createSuccessResponse({ ...response }, context.requestId);
    }

    const testPayload = {
      title: '🔔 Test Push Notification',
      body: 'Firebase Cloud Messaging is working correctly! This is a test from the Notification Manager.',
      icon: '/icons/notification-icon.png',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        source: 'admin_notification_manager'
      }
    };

    const result = await fcmProvider.sendToDevice(activeDevice.deviceToken, testPayload, {
      userId: Number(userId),
      deviceId: activeDevice.id,
      payloadType: 'admin_test'
    });

    if (result.success) {
      const response: TestPushResponse = {
        success: true,
        message: `Test push notification sent successfully to ${activeDevice.platform || 'unknown'} device!`,
        deviceToken: `${activeDevice.deviceToken.substring(0, 10)}...`,
        fcmResponse: {
          messageId: 'sent',
          success: true
        }
      };
      return createSuccessResponse({ ...response }, context.requestId);
    } else {
      const response: TestPushResponse = {
        success: false,
        message: 'Failed to send test push notification. Check Firebase configuration.',
        error: result.error || 'SEND_FAILED'
      };
      return createSuccessResponse({ ...response }, context.requestId);
    }

  } catch (error) {
    ErrorService.capture('[TestPush] Error:', error);
    const response: TestPushResponse = {
      success: false,
      message: 'An error occurred while sending test push notification.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
    return createSuccessResponse({ ...response }, context.requestId);
  }
}

export const POST = apiHandler(testPushHandler, {
  allowedMethods: ['POST'],
  requireAuth: true,
  rbac: {
    action: 'write',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 5,
    windowMs: 60000 // Max 5 test pushes per minute
  }
});

// Method guards
const ALLOWED_METHODS = ['POST'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
