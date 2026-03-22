/**
 * NotificationPreferencesService - User Notification Preferences Management
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/notificationService/phases/PHASE_2_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/profile/services/ProfileService.ts - Service pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { safeJsonParse } from '@core/utils/bigint';
import {
  UserNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationCategory,
  NotificationEventType,
  EVENT_TYPE_TO_CATEGORY
} from './notification/types';

// ============================================================================
// Custom Errors
// ============================================================================

export class PreferencesNotFoundError extends BizError {
  constructor(userId: number) {
    super({
      code: 'PREFERENCES_NOT_FOUND',
      message: `Notification preferences not found for user ${userId}`,
      userMessage: 'Notification preferences not found'
    });
    this.name = 'PreferencesNotFoundError';
  }
}

// ============================================================================
// NotificationPreferencesService Implementation
// ============================================================================

export class NotificationPreferencesService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // Preference Retrieval
  // ==========================================================================

  /**
   * Get user notification preferences
   * Returns defaults if not set
   *
   * @param userId User ID
   * @returns User's notification preferences
   */
  async getPreferences(userId: number): Promise<UserNotificationPreferences> {
    const result = await this.db.query<{ user_preferences: string | object | null }>(
      'SELECT user_preferences FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new PreferencesNotFoundError(userId);
    }

    const row = result.rows[0];
    if (!row) {
      throw new PreferencesNotFoundError(userId);
    }

    // Handle mariadb auto-parse behavior
    const prefs = (typeof row.user_preferences === 'string'
      ? safeJsonParse(row.user_preferences, {})
      : row.user_preferences || {}) as Record<string, unknown>;

    // Extract notification preferences from user_preferences object
    const notificationPrefs = (prefs.notificationPreferences || {}) as Partial<UserNotificationPreferences>;

    // Merge with defaults to ensure all fields exist
    return this.mergeWithDefaults(notificationPrefs);
  }

  /**
   * Update user notification preferences
   *
   * @param userId User ID
   * @param updates Partial preference updates
   * @returns Updated preferences
   */
  async updatePreferences(
    userId: number,
    updates: Partial<UserNotificationPreferences>
  ): Promise<UserNotificationPreferences> {
    // Get current full user_preferences
    const result = await this.db.query<{ user_preferences: string | object | null }>(
      'SELECT user_preferences FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new PreferencesNotFoundError(userId);
    }

    const row = result.rows[0];
    if (!row) {
      throw new PreferencesNotFoundError(userId);
    }

    // Handle mariadb auto-parse behavior
    const currentPrefs = (typeof row.user_preferences === 'string'
      ? safeJsonParse(row.user_preferences, {})
      : row.user_preferences || {}) as Record<string, unknown>;

    // Get current notification preferences
    const currentNotifPrefs = (currentPrefs.notificationPreferences || {}) as Partial<UserNotificationPreferences>;

    // Deep merge updates with current preferences
    const updatedNotifPrefs = this.deepMerge(
      this.mergeWithDefaults(currentNotifPrefs),
      updates
    );

    // Update the full user_preferences object
    const updatedPrefs = {
      ...currentPrefs,
      notificationPreferences: updatedNotifPrefs
    };

    // Save to database
    await this.db.query(
      'UPDATE users SET user_preferences = ? WHERE id = ?',
      [JSON.stringify(updatedPrefs), userId]
    );

    return updatedNotifPrefs;
  }

  // ==========================================================================
  // Preference Checking (Called by NotificationService)
  // ==========================================================================

  /**
   * Check if a notification should be sent based on user preferences
   *
   * @param userId User ID
   * @param eventType Notification event type
   * @returns Whether the notification should be dispatched
   */
  async shouldNotify(userId: number, eventType: NotificationEventType): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    // Check global toggle
    if (!prefs.globalEnabled) {
      return false;
    }

    // Get category for this event type
    const category = EVENT_TYPE_TO_CATEGORY[eventType];
    const categoryPrefs = prefs.categories[category];

    // Check category enabled
    if (!categoryPrefs || !categoryPrefs.enabled) {
      return false;
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours for user
   *
   * @param userId User ID
   * @returns Whether quiet hours are active
   */
  async isQuietHours(userId: number): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    if (!prefs.quietHoursEnabled) {
      return false;
    }

    // Get current time in user's timezone
    const now = new Date();
    const userTime = new Intl.DateTimeFormat('en-US', {
      timeZone: prefs.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    const currentMinutes = this.timeToMinutes(userTime);
    const startMinutes = this.timeToMinutes(prefs.quietHoursStart);
    const endMinutes = this.timeToMinutes(prefs.quietHoursEnd);

    // Handle quiet hours spanning midnight
    if (startMinutes > endMinutes) {
      // e.g., 22:00 to 08:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      // e.g., 00:00 to 06:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }

  /**
   * Get channels enabled for a notification type
   *
   * @param userId User ID
   * @param eventType Notification event type
   * @returns List of enabled channels
   */
  async getEnabledChannels(
    userId: number,
    eventType: NotificationEventType
  ): Promise<('in_app' | 'push' | 'email')[]> {
    const prefs = await this.getPreferences(userId);
    const category = EVENT_TYPE_TO_CATEGORY[eventType];
    const categoryPrefs = prefs.categories[category];

    const channels: ('in_app' | 'push' | 'email')[] = [];

    if (categoryPrefs.inApp) {
      channels.push('in_app');
    }

    if (categoryPrefs.push) {
      channels.push('push');
    }

    if (categoryPrefs.email !== 'never') {
      channels.push('email');
    }

    return channels;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Merge partial preferences with defaults
   */
  private mergeWithDefaults(
    partial: Partial<UserNotificationPreferences>
  ): UserNotificationPreferences {
    return {
      globalEnabled: partial.globalEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.globalEnabled,
      quietHoursEnabled: partial.quietHoursEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled,
      quietHoursStart: partial.quietHoursStart ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
      quietHoursEnd: partial.quietHoursEnd ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd,
      timezone: partial.timezone ?? DEFAULT_NOTIFICATION_PREFERENCES.timezone,
      categories: {
        messages: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.messages, ...partial.categories?.messages },
        bizwire: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.bizwire, ...partial.categories?.bizwire },
        connections: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.connections, ...partial.categories?.connections },
        reviews: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.reviews, ...partial.categories?.reviews },
        events: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.events, ...partial.categories?.events },
        subscriptions: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.subscriptions, ...partial.categories?.subscriptions },
        system: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.system, ...partial.categories?.system },
        recommendations: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.recommendations, ...partial.categories?.recommendations },
        referrals: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.referrals, ...partial.categories?.referrals },
        offers: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.offers, ...partial.categories?.offers },
        jobs: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.jobs, ...partial.categories?.jobs },
        content: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories.content, ...partial.categories?.content },
      },
      digestEnabled: partial.digestEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.digestEnabled,
      digestFrequency: partial.digestFrequency ?? DEFAULT_NOTIFICATION_PREFERENCES.digestFrequency,
      digestTime: partial.digestTime ?? DEFAULT_NOTIFICATION_PREFERENCES.digestTime,
    };
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const output = { ...target };

    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          output[key] = this.deepMerge(
            target[key] as Record<string, any>,
            source[key] as Record<string, any>
          ) as T[Extract<keyof T, string>];
        } else {
          output[key] = source[key] as T[Extract<keyof T, string>];
        }
      }
    }

    return output;
  }

  /**
   * Convert HH:mm time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
