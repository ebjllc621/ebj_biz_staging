/**
 * FCMPushProvider - Firebase Cloud Messaging Push Notification Provider
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Circuit breaker: Required for ADVANCED tier external service calls
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/notificationService/phases/PHASE_3_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/core/services/CategoryService.ts - Service pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

import { ErrorService } from '@core/services/ErrorService';
import {
  PushNotificationProvider,
  PushPayload,
  PushSendResult,
  PushDeviceRegistration,
  PushDevice
} from './push-types';

// ============================================================================
// Custom Errors
// ============================================================================

export class PushNotificationError extends BizError {
  constructor(message: string) {
    super({
      code: 'PUSH_NOTIFICATION_ERROR',
      message,
      userMessage: 'Failed to send push notification'
    });
    this.name = 'PushNotificationError';
  }
}

export class DeviceRegistrationError extends BizError {
  constructor(message: string) {
    super({
      code: 'DEVICE_REGISTRATION_ERROR',
      message,
      userMessage: 'Failed to register device for push notifications'
    });
    this.name = 'DeviceRegistrationError';
  }
}

// ============================================================================
// Circuit Breaker (ADVANCED tier requirement)
// ============================================================================

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  isOpen: boolean;
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: null,
    isOpen: false
  };

  constructor(
    private maxFailures: number = 5,
    private resetTimeoutMs: number = 60000
  ) {}

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should reset
    if (this.state.isOpen && this.shouldReset()) {
      this.reset();
    }

    // Throw if circuit is open
    if (this.state.isOpen) {
      throw new PushNotificationError('Push notification service is temporarily unavailable (circuit breaker open)');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.failures = 0;
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.maxFailures) {
      this.state.isOpen = true;
      console.warn(`[FCMPushProvider] Circuit breaker opened after ${this.state.failures} failures`);
    }
  }

  private shouldReset(): boolean {
    if (!this.state.lastFailureTime) return false;
    return Date.now() - this.state.lastFailureTime >= this.resetTimeoutMs;
  }

  private reset(): void {
    console.log('[FCMPushProvider] Circuit breaker reset');
    this.state.failures = 0;
    this.state.lastFailureTime = null;
    this.state.isOpen = false;
  }

  public getState(): CircuitBreakerState {
    return { ...this.state };
  }

  public restoreState(state: { isOpen: boolean; failures: number; lastFailureTime: number | null }): void {
    this.state.isOpen = state.isOpen;
    this.state.failures = state.failures;
    this.state.lastFailureTime = state.lastFailureTime;
  }
}

// ============================================================================
// FCMPushProvider Implementation
// ============================================================================

export class FCMPushProvider implements PushNotificationProvider {
  private db: DatabaseService;
  private circuitBreaker: CircuitBreaker;
  private fcmServerKey: string | null;

  constructor(db: DatabaseService) {
    this.db = db;
    this.circuitBreaker = new CircuitBreaker(5, 60000);
    this.fcmServerKey = process.env.FCM_SERVER_KEY || null;

    if (!this.fcmServerKey) {
      console.warn('[FCMPushProvider] FCM_SERVER_KEY not configured - push notifications disabled');
    }
  }

  // ==========================================================================
  // Phase 2: Push Logging and Circuit Breaker Persistence
  // ==========================================================================

  /**
   * Log push send result to notification_push_logs table
   * @phase Phase 2 - Push Delivery Tracking
   */
  private async logPushResult(params: {
    userId: number;
    deviceId: number | null;
    deviceToken: string;
    status: 'sent' | 'delivered' | 'failed' | 'invalid_token';
    fcmMessageId?: string;
    errorCode?: string;
    errorMessage?: string;
    latencyMs?: number;
    payloadType?: string;
    notificationId?: number;
  }): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO notification_push_logs
         (notification_id, user_id, device_id, device_token, status,
          fcm_message_id, error_code, error_message, latency_ms, payload_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          params.notificationId || null,
          params.userId,
          params.deviceId,
          params.deviceToken,
          params.status,
          params.fcmMessageId || null,
          params.errorCode || null,
          params.errorMessage || null,
          params.latencyMs || null,
          params.payloadType || null
        ]
      );
    } catch (error) {
      ErrorService.capture('[FCMPushProvider] Failed to log push result:', error);
    }
  }

  /**
   * Persist circuit breaker state to database
   * @phase Phase 2 - Push Delivery Tracking
   */
  private async persistCircuitBreakerState(): Promise<void> {
    const state = this.circuitBreaker.getState();
    try {
      await this.db.query(
        `INSERT INTO notification_admin_config (config_key, config_value, description)
         VALUES ('circuit_breaker_state', ?, 'FCM circuit breaker persisted state')
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [JSON.stringify({
          isOpen: state.isOpen,
          failures: state.failures,
          lastFailureTime: state.lastFailureTime ? new Date(state.lastFailureTime).toISOString() : null,
          lastUpdated: new Date().toISOString()
        })]
      );
    } catch (error) {
      ErrorService.capture('[FCMPushProvider] Failed to persist circuit breaker state:', error);
    }
  }

  /**
   * Load circuit breaker state from database on initialization
   * @phase Phase 2 - Push Delivery Tracking
   */
  public async loadCircuitBreakerState(): Promise<void> {
    try {
      const result = await this.db.query<{ config_value: string | object }>(
        `SELECT config_value FROM notification_admin_config WHERE config_key = 'circuit_breaker_state'`
      );

      if (result.rows.length > 0 && result.rows[0]) {
        const value = typeof result.rows[0].config_value === 'string'
          ? JSON.parse(result.rows[0].config_value)
          : result.rows[0].config_value;

        if (value.isOpen && value.lastFailureTime) {
          const lastFailure = new Date(value.lastFailureTime).getTime();
          const resetTimeoutMs = 60000;

          if (Date.now() - lastFailure < resetTimeoutMs) {
            this.circuitBreaker.restoreState({
              isOpen: true,
              failures: value.failures,
              lastFailureTime: lastFailure
            });
            console.log('[FCMPushProvider] Restored circuit breaker state from database (OPEN)');
          } else {
            console.log('[FCMPushProvider] Circuit breaker state expired, starting fresh');
          }
        }
      }
    } catch (error) {
      ErrorService.capture('[FCMPushProvider] Failed to load circuit breaker state:', error);
    }
  }

  // ==========================================================================
  // Push Sending
  // ==========================================================================

  /**
   * Send push notification to all active devices for a user
   * @phase Phase 2 - Updated with device context passing
   */
  async sendToUser(
    userId: number,
    payload: PushPayload,
    options?: { notificationId?: number; payloadType?: string }
  ): Promise<PushSendResult> {
    const devices = await this.getUserDevices(userId);

    if (devices.length === 0) {
      return {
        success: true,
        successCount: 0,
        failureCount: 0,
        invalidTokens: []
      };
    }

    const results = await Promise.allSettled(
      devices.map((device) =>
        this.sendToDevice(device.deviceToken, payload, {
          userId,
          deviceId: device.id,
          notificationId: options?.notificationId,
          payloadType: options?.payloadType
        })
      )
    );

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const sendResult = result.value;
        successCount += sendResult.successCount;
        failureCount += sendResult.failureCount;
        invalidTokens.push(...sendResult.invalidTokens);
      } else {
        failureCount++;
      }
    });

    if (invalidTokens.length > 0) {
      await this.deactivateDevices(invalidTokens);
    }

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      invalidTokens
    };
  }

  /**
   * Send push notification to specific device
   * @phase Phase 2 - Updated with push logging
   */
  async sendToDevice(
    deviceToken: string,
    payload: PushPayload,
    options?: {
      userId?: number;
      deviceId?: number;
      notificationId?: number;
      payloadType?: string;
    }
  ): Promise<PushSendResult> {
    const startTime = Date.now();
    const userId = options?.userId || 0;

    if (!this.fcmServerKey) {
      await this.logPushResult({
        userId,
        deviceId: options?.deviceId || null,
        deviceToken,
        status: 'failed',
        errorCode: 'FCM_NOT_CONFIGURED',
        errorMessage: 'FCM not configured',
        latencyMs: Date.now() - startTime,
        payloadType: options?.payloadType,
        notificationId: options?.notificationId
      });

      return {
        success: false,
        error: 'FCM not configured',
        successCount: 0,
        failureCount: 1,
        invalidTokens: []
      };
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const fcmPayload = {
          to: deviceToken,
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: payload.badge,
            tag: payload.tag,
            requireInteraction: payload.requireInteraction || false,
            click_action: payload.actionUrl || '/'
          },
          data: payload.data || {},
          priority: 'high'
        };

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${this.fcmServerKey}`
          },
          body: JSON.stringify(fcmPayload)
        });

        const result = await response.json();

        if (result.failure === 1 && result.results?.[0]?.error === 'NotRegistered') {
          await this.logPushResult({
            userId,
            deviceId: options?.deviceId || null,
            deviceToken,
            status: 'invalid_token',
            errorCode: 'NotRegistered',
            errorMessage: 'Device token no longer valid',
            latencyMs: Date.now() - startTime,
            payloadType: options?.payloadType,
            notificationId: options?.notificationId
          });

          return {
            success: false,
            error: 'Invalid token',
            successCount: 0,
            failureCount: 1,
            invalidTokens: [deviceToken]
          };
        }

        if (result.success === 1) {
          await this.logPushResult({
            userId,
            deviceId: options?.deviceId || null,
            deviceToken,
            status: 'sent',
            fcmMessageId: result.results?.[0]?.message_id,
            latencyMs: Date.now() - startTime,
            payloadType: options?.payloadType,
            notificationId: options?.notificationId
          });

          await this.updateDeviceLastUsed(deviceToken);

          return {
            success: true,
            successCount: 1,
            failureCount: 0,
            invalidTokens: []
          };
        }

        const errorMessage = result.results?.[0]?.error || 'Unknown FCM error';
        await this.logPushResult({
          userId,
          deviceId: options?.deviceId || null,
          deviceToken,
          status: 'failed',
          errorCode: errorMessage,
          errorMessage,
          latencyMs: Date.now() - startTime,
          payloadType: options?.payloadType,
          notificationId: options?.notificationId
        });

        return {
          success: false,
          error: errorMessage,
          successCount: 0,
          failureCount: 1,
          invalidTokens: []
        };
      } catch (error) {
        await this.logPushResult({
          userId,
          deviceId: options?.deviceId || null,
          deviceToken,
          status: 'failed',
          errorCode: 'SEND_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          latencyMs: Date.now() - startTime,
          payloadType: options?.payloadType,
          notificationId: options?.notificationId
        });

        await this.persistCircuitBreakerState();

        ErrorService.capture('[FCMPushProvider] Error sending push:', error);
        throw new PushNotificationError(
          error instanceof Error ? error.message : 'Unknown error sending push'
        );
      }
    });
  }

  // ==========================================================================
  // Device Management
  // ==========================================================================

  /**
   * Register a new device for push notifications
   */
  async registerDevice(userId: number, registration: PushDeviceRegistration): Promise<number> {
    try {
      // Check if device already exists
      const existing = await this.db.query<PushDevice>(
        'SELECT id, is_active FROM user_push_devices WHERE user_id = ? AND device_token = ? LIMIT 1',
        [userId, registration.deviceToken]
      );

      if (existing.rows.length > 0) {
        const device = existing.rows[0];
        if (!device) {
          throw new DeviceRegistrationError('Device query returned empty row');
        }

        // Reactivate if inactive
        if (!device.isActive) {
          await this.db.query(
            'UPDATE user_push_devices SET is_active = 1, last_used_at = NOW() WHERE id = ?',
            [device.id]
          );
        }

        return device.id;
      }

      // Insert new device
      const result = await this.db.query(
        `INSERT INTO user_push_devices
         (user_id, device_token, platform, browser, device_name, is_active, last_used_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [
          userId,
          registration.deviceToken,
          registration.platform,
          registration.browser || null,
          registration.deviceName || null
        ]
      );

      return result.insertId!;
    } catch (error) {
      ErrorService.capture('[FCMPushProvider] Error registering device:', error);
      throw new DeviceRegistrationError(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Unregister a device from push notifications
   */
  async unregisterDevice(userId: number, deviceToken: string): Promise<boolean> {
    const result = await this.db.query(
      'UPDATE user_push_devices SET is_active = 0 WHERE user_id = ? AND device_token = ?',
      [userId, deviceToken]
    );

    return result.rowCount > 0;
  }

  /**
   * Get all active devices for a user
   */
  async getUserDevices(userId: number): Promise<PushDevice[]> {
    const result = await this.db.query<{
      id: number;
      user_id: number;
      device_token: string;
      platform: 'web' | 'ios' | 'android';
      browser: string | null;
      device_name: string | null;
      is_active: number;
      last_used_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, user_id, device_token, platform, browser, device_name,
              is_active, last_used_at, created_at
       FROM user_push_devices
       WHERE user_id = ? AND is_active = 1
       ORDER BY last_used_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      deviceToken: row.device_token,
      platform: row.platform,
      browser: row.browser,
      deviceName: row.device_name,
      isActive: row.is_active === 1,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at
    }));
  }

  /**
   * Deactivate invalid device tokens
   */
  async deactivateDevices(deviceTokens: string[]): Promise<number> {
    if (deviceTokens.length === 0) return 0;

    const placeholders = deviceTokens.map(() => '?').join(',');
    const result = await this.db.query(
      `UPDATE user_push_devices SET is_active = 0 WHERE device_token IN (${placeholders})`,
      deviceTokens
    );

    return result.rowCount;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Update device last_used_at timestamp
   */
  private async updateDeviceLastUsed(deviceToken: string): Promise<void> {
    await this.db.query(
      'UPDATE user_push_devices SET last_used_at = NOW() WHERE device_token = ?',
      [deviceToken]
    );
  }

  /**
   * Get circuit breaker state (for monitoring)
   */
  public getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }
}
