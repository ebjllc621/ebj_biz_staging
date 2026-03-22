/**
 * Admin External Reviews Settings API Route
 *
 * PATCH /api/admin/external-reviews/settings - Update external review feature flags
 *
 * GOVERNANCE: CSRF protected for state-changing operations
 *
 * Allowed keys:
 *   feature_external_reviews_enabled
 *   feature_external_reviews_google
 *   feature_external_reviews_yelp
 *   feature_external_reviews_facebook
 *
 * @authority docs/components/admin/external-reviews/ADMIN_EXTERNAL_REVIEWS_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

const ALLOWED_SETTING_KEYS = [
  'feature_external_reviews_enabled',
  'feature_external_reviews_google',
  'feature_external_reviews_yelp',
  'feature_external_reviews_facebook'
];

interface SettingRow {
  setting_key: string;
  setting_value: string | null;
}

async function handlePatch(context: ApiContext) {
  const body = await context.request.json();
  const { settings } = body;

  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw BizError.badRequest('settings must be an object');
  }

  // Validate all keys are in the allowed list
  const incomingKeys = Object.keys(settings);
  const invalidKeys = incomingKeys.filter(k => !ALLOWED_SETTING_KEYS.includes(k));
  if (invalidKeys.length > 0) {
    throw BizError.badRequest(`Invalid setting key(s): ${invalidKeys.join(', ')}`);
  }
  if (incomingKeys.length === 0) {
    throw BizError.badRequest('No settings provided');
  }

  const db = getDatabaseService();

  for (const key of incomingKeys) {
    const value = settings[key];
    const stringValue = typeof value === 'boolean' ? String(value) : String(value);
    await db.query(
      'UPDATE site_settings SET setting_value = ?, updated_at = NOW(), updated_by = ? WHERE setting_key = ?',
      [stringValue, context.userId, key]
    );
  }

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'setting',
    targetEntityId: null,
    actionType: 'settings_updated',
    actionCategory: 'configuration',
    actionDescription: `Updated external review settings: ${incomingKeys.join(', ')}`,
    afterData: { settingKeys: incomingKeys, values: settings },
    severity: 'normal'
  });

  // Return updated settings
  const updatedResult = await db.query<SettingRow>(
    `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${ALLOWED_SETTING_KEYS.map(() => '?').join(', ')})`,
    ALLOWED_SETTING_KEYS
  );

  const updatedSettings: Record<string, boolean> = {};
  for (const key of ALLOWED_SETTING_KEYS) {
    const row = updatedResult.rows.find(r => r.setting_key === key);
    updatedSettings[key] = row?.setting_value === 'true' || row?.setting_value === '1';
  }

  return createSuccessResponse({ settings: updatedSettings });
}

// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(handlePatch, {
  allowedMethods: ['PATCH'],
  requireAuth: true
}));
