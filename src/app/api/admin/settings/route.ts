/**
 * Admin Settings API Routes
 * GET /api/admin/settings - Get all system settings
 * PUT /api/admin/settings - Update system settings
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.3
 * @remediation Phase R1.3 - API handler enforcement
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

async function handleGet(context: ApiContext) {
  const db = getDatabaseService();
  const results = await db.query('SELECT * FROM site_settings ORDER BY `group`, `key`');

  return createSuccessResponse({ settings: results.rows });
}

async function handlePut(context: ApiContext) {
  const body = await context.request.json();
  const { settings } = body;

  if (!Array.isArray(settings)) {
    throw BizError.badRequest('Settings must be an array');
  }

  const db = getDatabaseService();

  for (const setting of settings) {
    await db.query(
      'UPDATE site_settings SET value = ?, updated_at = NOW() WHERE `key` = ?',
      [setting.value, setting.key]
    );
  }

  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'setting',
    targetEntityId: null,
    actionType: 'settings_updated',
    actionCategory: 'configuration',
    actionDescription: `Updated ${settings.length} setting(s)`,
    afterData: { settingKeys: settings.map((s: { key: string }) => s.key) },
    severity: 'normal'
  });

  return createSuccessResponse({ success: true });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'settings'
  }
});

// GOVERNANCE: CSRF protection for state-changing operations
export const PUT = withCsrf(apiHandler(handlePut, {
  allowedMethods: ['PUT'],
  requireAuth: true,
  rbac: {
    action: 'update',
    resource: 'settings'
  }
}));
