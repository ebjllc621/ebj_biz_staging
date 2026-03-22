/**
 * Push Notification Types
 *
 * Type definitions for push notification functionality including
 * Firebase Cloud Messaging integration.
 *
 * @authority docs/notificationService/phases/PHASE_3_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

// ============================================================================
// Push Payload
// ============================================================================

/**
 * Push notification payload structure
 * Maps to FCM notification format
 */
export interface PushPayload {
  /** Notification title */
  title: string;

  /** Notification body text */
  body: string;

  /** Icon URL (defaults to app icon) */
  icon?: string;

  /** Badge count (mobile only) */
  badge?: string;

  /** URL to open when notification is clicked */
  actionUrl?: string;

  /** Additional data payload */
  data?: Record<string, string>;

  /** Tag for notification grouping/replacement */
  tag?: string;

  /** Require user interaction to dismiss */
  requireInteraction?: boolean;
}

// ============================================================================
// Push Send Result
// ============================================================================

/**
 * Result of sending push notifications
 */
export interface PushSendResult {
  /** Whether the operation was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Number of devices successfully sent to */
  successCount: number;

  /** Number of devices that failed */
  failureCount: number;

  /** Device tokens that are no longer valid */
  invalidTokens: string[];
}

// ============================================================================
// Device Registration
// ============================================================================

/**
 * Device registration payload
 */
export interface PushDeviceRegistration {
  /** FCM device token */
  deviceToken: string;

  /** Device platform */
  platform: 'web' | 'ios' | 'android';

  /** Browser name (web only) */
  browser?: string;

  /** User-friendly device name */
  deviceName?: string;
}

/**
 * Stored device record
 */
export interface PushDevice {
  id: number;
  userId: number;
  deviceToken: string;
  platform: 'web' | 'ios' | 'android';
  browser: string | null;
  deviceName: string | null;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}

// ============================================================================
// Push Notification Provider Interface
// ============================================================================

/**
 * Interface for push notification providers (FCM, APNs, etc.)
 */
export interface PushNotificationProvider {
  /**
   * Send push notification to specific user
   * @param userId User ID
   * @param payload Push notification payload
   * @param options Optional context for logging
   * @returns Send result
   */
  sendToUser(
    userId: number,
    payload: PushPayload,
    options?: { notificationId?: number; payloadType?: string }
  ): Promise<PushSendResult>;

  /**
   * Send push notification to specific device
   * @param deviceToken Device token
   * @param payload Push notification payload
   * @param options Optional context for logging
   * @returns Send result
   */
  sendToDevice(
    deviceToken: string,
    payload: PushPayload,
    options?: {
      userId?: number;
      deviceId?: number;
      notificationId?: number;
      payloadType?: string;
    }
  ): Promise<PushSendResult>;

  /**
   * Register a new device for push notifications
   * @param userId User ID
   * @param registration Device registration data
   * @returns Created device ID
   */
  registerDevice(userId: number, registration: PushDeviceRegistration): Promise<number>;

  /**
   * Unregister a device from push notifications
   * @param userId User ID
   * @param deviceToken Device token to remove
   * @returns Whether device was removed
   */
  unregisterDevice(userId: number, deviceToken: string): Promise<boolean>;

  /**
   * Get all active devices for a user
   * @param userId User ID
   * @returns List of active devices
   */
  getUserDevices(userId: number): Promise<PushDevice[]>;

  /**
   * Deactivate invalid device tokens
   * @param deviceTokens Array of invalid tokens
   * @returns Number of devices deactivated
   */
  deactivateDevices(deviceTokens: string[]): Promise<number>;
}
