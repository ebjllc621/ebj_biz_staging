/**
 * PushDeviceService - Push Notification Device Management Service
 *
 * Wrapper around FCMPushProvider for simplified device and notification management.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via FCMPushProvider
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/notificationService/phases/PHASE_3_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/core/services/NotificationPreferencesService.ts - Service wrapper pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { FCMPushProvider } from './FCMPushProvider';
import {
  PushPayload,
  PushSendResult,
  PushDeviceRegistration,
  PushDevice
} from './push-types';

// ============================================================================
// PushDeviceService Implementation
// ============================================================================

export class PushDeviceService {
  private provider: FCMPushProvider;

  constructor(db: DatabaseService) {
    this.provider = new FCMPushProvider(db);
  }

  // ==========================================================================
  // Device Management
  // ==========================================================================

  /**
   * Register a new device for push notifications
   *
   * @param userId User ID
   * @param registration Device registration data
   * @returns Created device ID
   */
  async registerDevice(userId: number, registration: PushDeviceRegistration): Promise<number> {
    return this.provider.registerDevice(userId, registration);
  }

  /**
   * Unregister a device from push notifications
   *
   * @param userId User ID
   * @param deviceToken Device token to remove
   * @returns Whether device was removed
   */
  async unregisterDevice(userId: number, deviceToken: string): Promise<boolean> {
    return this.provider.unregisterDevice(userId, deviceToken);
  }

  /**
   * Get all active devices for a user
   *
   * @param userId User ID
   * @returns List of active devices
   */
  async getUserDevices(userId: number): Promise<PushDevice[]> {
    return this.provider.getUserDevices(userId);
  }

  /**
   * Get count of active devices for a user
   *
   * @param userId User ID
   * @returns Number of active devices
   */
  async getDeviceCount(userId: number): Promise<number> {
    const devices = await this.provider.getUserDevices(userId);
    return devices.length;
  }

  // ==========================================================================
  // Push Notification Sending
  // ==========================================================================

  /**
   * Send push notification to all user's devices
   *
   * @param userId User ID
   * @param payload Push notification payload
   * @param options Optional context for push logging
   * @returns Send result
   */
  async sendToUser(
    userId: number,
    payload: PushPayload,
    options?: { notificationId?: number; payloadType?: string }
  ): Promise<PushSendResult> {
    return this.provider.sendToUser(userId, payload, options);
  }

  /**
   * Check if user has any registered devices
   *
   * @param userId User ID
   * @returns Whether user has devices
   */
  async hasRegisteredDevices(userId: number): Promise<boolean> {
    const count = await this.getDeviceCount(userId);
    return count > 0;
  }

  // ==========================================================================
  // Health & Monitoring
  // ==========================================================================

  /**
   * Get circuit breaker health status
   *
   * @returns Circuit breaker state
   */
  getHealth() {
    return this.provider.getCircuitBreakerState();
  }
}
