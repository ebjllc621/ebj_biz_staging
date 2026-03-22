/**
 * Admin Notification Preferences Analytics Endpoint
 *
 * GET /api/admin/notifications/analytics/preferences
 * Returns aggregate analytics about user notification preferences
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Aggregates preferences data from users table
 *
 * @phase Phase 7 - Preferences Analytics Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import type {
  PreferencesAnalyticsResponse,
  CategoryAnalytics,
  QuietHoursAnalytics,
  DigestAnalytics
} from '@core/types/notification-admin';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@core/services/notification/types';

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  messages: 'Messages',
  connections: 'Connections',
  reviews: 'Reviews',
  events: 'Events',
  subscriptions: 'Subscriptions',
  system: 'System'
};

/**
 * GET /api/admin/notifications/analytics/preferences
 * Returns aggregate notification preferences analytics
 */
async function getPreferencesAnalyticsHandler(context: ApiContext) {
  const startTime = Date.now();
  const db = getDatabaseService();

  // 1. Get total user count (all authenticated users)
  // NOTE: Visitors are not stored in DB - they're unauthenticated, so no WHERE clause needed
  const totalResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM users`
  );
  const totalUsers = bigIntToNumber(totalResult.rows[0]?.count ?? 0n);

  // 2. Get users with notification preferences set
  // NOTE: All rows in users table are authenticated users (visitors have no DB record)
  const prefsResult = await db.query<{
    id: number;
    user_preferences: string | object | null;
  }>(
    `SELECT id, user_preferences FROM users`
  );

  // 3. Parse preferences and calculate analytics
  const preferences = prefsResult.rows.map(row => {
    const prefs = (typeof row.user_preferences === 'string'
      ? safeJsonParse<Record<string, unknown>>(row.user_preferences, {} as Record<string, unknown>)
      : (row.user_preferences as Record<string, unknown> | null) || ({} as Record<string, unknown>));

    return (prefs.notificationPreferences as Record<string, unknown> | null) || null;
  }) as Array<Record<string, unknown> | null>;

  // 4. Calculate global opt-out
  const globalOptOut = calculateGlobalOptOut(preferences, totalUsers);

  // 5. Calculate category analytics
  const categories = calculateCategoryAnalytics(preferences, totalUsers);

  // 6. Calculate quiet hours analytics
  const quietHours = calculateQuietHoursAnalytics(preferences, totalUsers);

  // 7. Calculate digest analytics
  const digest = calculateDigestAnalytics(preferences, totalUsers);

  // 8. Count users with custom preferences
  const usersWithCustomPreferences = preferences.filter(p => p !== null).length;

  const analysisTimeMs = Date.now() - startTime;

  const response: PreferencesAnalyticsResponse = {
    totalUsers,
    usersWithCustomPreferences,
    globalOptOut,
    categories,
    quietHours,
    digest,
    analyzedAt: new Date().toISOString(),
    metadata: {
      analysisTimeMs,
      dataAge: 'fresh'
    }
  };

  return createSuccessResponse({ ...response }, context.requestId);
}

/**
 * Calculate global opt-out statistics
 */
function calculateGlobalOptOut(
  preferences: Array<Record<string, unknown> | null>,
  totalUsers: number
): PreferencesAnalyticsResponse['globalOptOut'] {
  // Users without preferences = using default (globalEnabled: true)
  // Users with preferences but globalEnabled: false = opted out
  let optOutCount = 0;

  for (const prefs of preferences) {
    if (prefs && prefs.globalEnabled === false) {
      optOutCount++;
    }
    // null prefs = default = enabled, so not counted as opt-out
  }

  return {
    count: optOutCount,
    percentage: totalUsers > 0 ? (optOutCount / totalUsers) * 100 : 0
  };
}

/**
 * Calculate per-category analytics
 */
function calculateCategoryAnalytics(
  preferences: Array<Record<string, unknown> | null>,
  totalUsers: number
): CategoryAnalytics[] {
  const categoryNames = ['messages', 'connections', 'reviews', 'events', 'subscriptions', 'system'];
  const results: CategoryAnalytics[] = [];

  for (const category of categoryNames) {
    let enabledCount = 0;
    let inAppCount = 0;
    let pushCount = 0;
    let emailImmediate = 0;
    let emailDigest = 0;
    let emailNever = 0;

    for (const prefs of preferences) {
      // If no prefs, use defaults
      const categories = prefs?.categories as Record<string, unknown> | undefined;
      const catPrefs = categories?.[category] as {
        enabled?: boolean;
        inApp?: boolean;
        push?: boolean;
        email?: 'immediate' | 'digest' | 'never';
      } | undefined;

      const defaults = DEFAULT_NOTIFICATION_PREFERENCES.categories[category as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES.categories];

      const isEnabled = catPrefs?.enabled ?? defaults.enabled;
      const hasInApp = catPrefs?.inApp ?? defaults.inApp;
      const hasPush = catPrefs?.push ?? defaults.push;
      const emailMode = catPrefs?.email ?? defaults.email;

      if (isEnabled) enabledCount++;
      if (hasInApp) inAppCount++;
      if (hasPush) pushCount++;

      if (emailMode === 'immediate') emailImmediate++;
      else if (emailMode === 'digest') emailDigest++;
      else emailNever++;
    }

    // For users without prefs, they use defaults
    const usersWithoutPrefs = totalUsers - preferences.filter(p => p !== null).length;
    const defaultCat = DEFAULT_NOTIFICATION_PREFERENCES.categories[category as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES.categories];

    if (defaultCat.enabled) enabledCount += usersWithoutPrefs;
    if (defaultCat.inApp) inAppCount += usersWithoutPrefs;
    if (defaultCat.push) pushCount += usersWithoutPrefs;

    if (defaultCat.email === 'immediate') emailImmediate += usersWithoutPrefs;
    else if (defaultCat.email === 'digest') emailDigest += usersWithoutPrefs;
    else emailNever += usersWithoutPrefs;

    results.push({
      category,
      label: CATEGORY_LABELS[category] || category,
      enabledCount,
      enabledPercentage: totalUsers > 0 ? (enabledCount / totalUsers) * 100 : 0,
      inAppEnabledCount: inAppCount,
      pushEnabledCount: pushCount,
      emailBreakdown: {
        immediate: emailImmediate,
        digest: emailDigest,
        never: emailNever
      }
    });
  }

  return results;
}

/**
 * Calculate quiet hours analytics
 */
function calculateQuietHoursAnalytics(
  preferences: Array<Record<string, unknown> | null>,
  totalUsers: number
): QuietHoursAnalytics {
  let enabledCount = 0;
  const startTimes: Record<string, number> = {};
  const endTimes: Record<string, number> = {};
  const timezones: Record<string, number> = {};

  for (const prefs of preferences) {
    const qhEnabled = prefs?.quietHoursEnabled as boolean | undefined;

    if (qhEnabled === true) {
      enabledCount++;

      const start = (prefs?.quietHoursStart as string) || '22:00';
      const end = (prefs?.quietHoursEnd as string) || '08:00';
      const tz = (prefs?.timezone as string) || 'America/New_York';

      startTimes[start] = (startTimes[start] || 0) + 1;
      endTimes[end] = (endTimes[end] || 0) + 1;
      timezones[tz] = (timezones[tz] || 0) + 1;
    }
  }

  // Default quiet hours is disabled, so users without prefs don't add to enabled count

  const sortByCount = (obj: Record<string, number>) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([time, count]) => ({ time, count }));

  const topTimezone = Object.entries(timezones)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'America/New_York';

  return {
    enabledCount,
    enabledPercentage: totalUsers > 0 ? (enabledCount / totalUsers) * 100 : 0,
    commonStartTimes: sortByCount(startTimes),
    commonEndTimes: sortByCount(endTimes),
    topTimezone
  };
}

/**
 * Calculate digest analytics
 */
function calculateDigestAnalytics(
  preferences: Array<Record<string, unknown> | null>,
  totalUsers: number
): DigestAnalytics {
  let enabledCount = 0;
  let dailyCount = 0;
  let weeklyCount = 0;
  const digestTimes: Record<string, number> = {};

  for (const prefs of preferences) {
    const digestEnabled = prefs?.digestEnabled as boolean | undefined;

    // If prefs exist and digestEnabled is explicitly set
    if (prefs !== null) {
      if (digestEnabled !== false) {
        // Default is true, so undefined or true = enabled
        enabledCount++;

        const freq = (prefs?.digestFrequency as string) || 'daily';
        const time = (prefs?.digestTime as string) || '09:00';

        if (freq === 'daily') dailyCount++;
        else if (freq === 'weekly') weeklyCount++;

        digestTimes[time] = (digestTimes[time] || 0) + 1;
      }
    }
  }

  // Users without prefs use defaults (digestEnabled: true, frequency: daily)
  const usersWithoutPrefs = totalUsers - preferences.filter(p => p !== null).length;
  enabledCount += usersWithoutPrefs;
  dailyCount += usersWithoutPrefs;
  digestTimes['09:00'] = (digestTimes['09:00'] || 0) + usersWithoutPrefs;

  const sortByCount = (obj: Record<string, number>) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([time, count]) => ({ time, count }));

  return {
    enabledCount,
    enabledPercentage: totalUsers > 0 ? (enabledCount / totalUsers) * 100 : 0,
    frequencyBreakdown: {
      daily: dailyCount,
      weekly: weeklyCount
    },
    commonDigestTimes: sortByCount(digestTimes)
  };
}

export const GET = apiHandler(getPreferencesAnalyticsHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 20,
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
