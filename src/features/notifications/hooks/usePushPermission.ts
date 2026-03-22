/**
 * usePushPermission Hook
 *
 * Manages push notification permission and device registration.
 * Handles browser permission flow, service worker registration, and FCM token management.
 *
 * @authority docs/notificationService/phases/PHASE_3_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/notifications/hooks/useNotificationPreferences.ts - Hook pattern
 */

'use client';

import { useState, useEffect } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// Types
// ============================================================================

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushPermissionReturn {
  permission: PermissionState;
  isRequesting: boolean;
  isRegistered: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  isPushSupported: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Get browser name
 */
function getBrowserName(): string {
  const userAgent = navigator.userAgent;

  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';

  return 'Unknown';
}

/**
 * Get OS name
 */
function getOSName(): string {
  const userAgent = navigator.userAgent;

  if (userAgent.includes('Win')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';

  return 'Unknown';
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePushPermission(): UsePushPermissionReturn {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push is supported
  const isPushSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  // Initialize permission state
  useEffect(() => {
    if (!isPushSupported) {
      setPermission('unsupported');
      return;
    }

    // Check current permission
    if (Notification.permission === 'granted') {
      setPermission('granted');
      // Check if we have a registered device
      checkRegistrationStatus();
    } else if (Notification.permission === 'denied') {
      setPermission('denied');
    } else {
      setPermission('default');
    }
  }, [isPushSupported]);

  /**
   * Check if device is already registered
   */
  async function checkRegistrationStatus() {
    try {
      const response = await fetch('/api/push/devices', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIsRegistered(data.data.count > 0);
      }
    } catch (err) {
      ErrorService.capture('[usePushPermission] Error checking registration status:', err);
    }
  }

  /**
   * Request push notification permission
   */
  async function requestPermission() {
    if (!isPushSupported) {
      setError('Push notifications are not supported in this browser');
      return;
    }

    if (permission === 'denied') {
      setError('Push notifications are blocked. Please enable them in your browser settings.');
      return;
    }

    setIsRequesting(true);
    setError(null);

    try {
      // 1. Request browser permission
      const permissionResult = await Notification.requestPermission();

      if (permissionResult !== 'granted') {
        setPermission('denied');
        setError('Permission denied');
        return;
      }

      setPermission('granted');

      // 2. Register service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      console.log('[usePushPermission] Service worker registered');

      // 3. Get VAPID public key
      const vapidResponse = await fetch('/api/push/vapid-key');
      const vapidData = await vapidResponse.json();

      if (!vapidData.data.vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      const vapidKey = urlBase64ToUint8Array(vapidData.data.vapidPublicKey);

      // 4. Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey as BufferSource
      });

      // 5. Get device token (endpoint is the token for web push)
      const deviceToken = subscription.endpoint;

      // 6. Register device with backend
      await fetchWithCsrf('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceToken,
          platform: 'web',
          browser: getBrowserName(),
          deviceName: `${getBrowserName()} on ${getOSName()}`
        })
      });

      setIsRegistered(true);
      console.log('[usePushPermission] Device registered successfully');
    } catch (err) {
      ErrorService.capture('[usePushPermission] Error requesting permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable push notifications');
    } finally {
      setIsRequesting(false);
    }
  }

  return {
    permission,
    isRequesting,
    isRegistered,
    error,
    requestPermission,
    isPushSupported
  };
}
