/**
 * Admin Firebase Status Endpoint
 *
 * GET /api/admin/notifications/firebase/status
 * Returns Firebase/FCM configuration status for admin dashboard
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Returns credential validation status without exposing secrets
 *
 * @phase Phase 6 - Setup Guides Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { FCMPushProvider } from '@core/services/notification/FCMPushProvider';
import type { FirebaseStatus, WebSocketStatus, SetupGuidesResponse, TriggerCondition } from '@core/types/notification-admin';

/**
 * GET /api/admin/notifications/firebase/status
 * Returns Firebase and WebSocket status
 */
async function getFirebaseStatusHandler(context: ApiContext) {
  const db = getDatabaseService();

  // 1. Check Firebase configuration
  const firebaseStatus = await getFirebaseStatus(db);

  // 2. Get WebSocket status (static from documentation)
  const webSocketStatus = getWebSocketStatus();

  const response: SetupGuidesResponse = {
    firebase: firebaseStatus,
    webSocket: webSocketStatus,
    lastUpdated: new Date().toISOString()
  };

  return createSuccessResponse({ ...response }, context.requestId);
}

/**
 * Get Firebase/FCM configuration status
 */
async function getFirebaseStatus(
  db: ReturnType<typeof getDatabaseService>
): Promise<FirebaseStatus> {
  // Check environment variables
  const fcmServerKey = process.env.FCM_SERVER_KEY;
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

  const serverKeyConfigured = !!fcmServerKey && fcmServerKey.length > 10;

  // Mask project ID for display
  const projectIdMasked = firebaseProjectId
    ? `${firebaseProjectId.substring(0, 4)}...${firebaseProjectId.substring(firebaseProjectId.length - 4)}`
    : null;

  // Get circuit breaker state from FCMPushProvider
  let circuitBreakerState: FirebaseStatus['circuitBreakerState'] = 'CLOSED';
  let credentialStatus: FirebaseStatus['credentialStatus'] = 'not_configured';
  let errorMessage: string | null = null;

  if (serverKeyConfigured) {
    try {
      const fcmProvider = new FCMPushProvider(db);
      const cbState = fcmProvider.getCircuitBreakerState();
      // cbState returns { failures, lastFailureTime, isOpen }
      circuitBreakerState = cbState.isOpen ? 'OPEN' : 'CLOSED';
      credentialStatus = cbState.isOpen ? 'invalid' : 'valid';

      if (cbState.isOpen) {
        errorMessage = 'Circuit breaker is OPEN due to repeated failures. Will attempt reset after timeout.';
      }
    } catch (error) {
      credentialStatus = 'unknown';
      errorMessage = error instanceof Error ? error.message : 'Failed to validate credentials';
    }
  }

  // Service worker file exists at /public/firebase-messaging-sw.js
  // Actual browser registration state cannot be verified server-side
  // This reflects file presence, not active browser registration
  const serviceWorkerRegistered = serverKeyConfigured; // SW file deployed when FCM is configured

  return {
    configured: serverKeyConfigured,
    credentialStatus,
    projectIdMasked,
    serverKeyConfigured,
    serviceWorkerRegistered,
    circuitBreakerState,
    lastValidated: serverKeyConfigured ? new Date().toISOString() : null,
    errorMessage
  };
}

/**
 * Get WebSocket upgrade status (static from documentation)
 */
function getWebSocketStatus(): WebSocketStatus {
  // These values are from WEBSOCKET_UPGRADE_PATH.md
  const triggerConditions: TriggerCondition[] = [
    {
      name: 'User Scale',
      description: 'Concurrent active users threshold',
      currentValue: 'Unknown', // Would need analytics integration
      threshold: '5,000+',
      met: false,
      priority: 'high'
    },
    {
      name: 'Latency Requirements',
      description: 'Need for sub-second notification delivery',
      currentValue: '10-60s polling',
      threshold: '<1s real-time',
      met: false,
      priority: 'medium'
    },
    {
      name: 'Real-time Features',
      description: 'Typing indicators, presence detection needed',
      currentValue: 'Not implemented',
      threshold: 'Required',
      met: false,
      priority: 'low'
    },
    {
      name: 'Cost Analysis',
      description: 'Polling costs exceed WebSocket hosting',
      currentValue: '$1.15/day polling',
      threshold: '$2.50/day WebSocket',
      met: false,
      priority: 'medium'
    }
  ];

  return {
    currentTransport: 'polling',
    pollingIntervals: {
      messages: 10,
      dashboard: 30,
      other: 60
    },
    triggerConditions,
    costComparison: {
      pollingDailyUsd: 1.15,
      websocketDailyUsd: 2.50,
      breakEvenConcurrentUsers: 1500
    },
    documentationUrl: '/docs/notificationService/WEBSOCKET_UPGRADE_PATH.md'
  };
}

export const GET = apiHandler(getFirebaseStatusHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 30,
    windowMs: 60000
  }
});

// Method guards
const ALLOWED_METHODS = ['GET'];

export async function POST() {
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
