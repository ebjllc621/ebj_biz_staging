/**
 * Admin Token Cleanup Endpoint
 *
 * POST /api/admin/notifications/cleanup/tokens
 * Clean up inactive/invalid push device tokens
 *
 * Request Body:
 * - inactiveDays: number (default: 30, min: 7)
 * - dryRun: boolean (default: false)
 *
 * @phase Phase 8 - Administrative Actions Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { bigIntToNumber } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';
import type { TokenCleanupResult } from '@core/types/notification-admin';
import { ErrorService } from '@core/services/ErrorService';

/**
 * POST /api/admin/notifications/cleanup/tokens
 */
async function cleanupTokensHandler(context: ApiContext) {
  const db = getDatabaseService();
  const userId = context.userId;

  // Parse request body
  let body: { inactiveDays?: number; dryRun?: boolean } = {};
  try {
    body = await context.request.json();
  } catch {
    // Empty body is allowed - use defaults
  }

  const inactiveDays = Math.max(7, body.inactiveDays || 30);
  const dryRun = body.dryRun === true;

  // Get counts before cleanup
  const beforeResult = await db.query<{ total: bigint; active: bigint; inactive: bigint }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
       SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
     FROM user_push_devices`
  );

  const totalDevicesBefore = bigIntToNumber(beforeResult.rows[0]?.total ?? 0n);
  const alreadyInactiveCount = bigIntToNumber(beforeResult.rows[0]?.inactive ?? 0n);

  // Find tokens to deactivate (active but not used in X days)
  const toCleanupResult = await db.query<{ count: bigint }>(
    `SELECT COUNT(*) as count FROM user_push_devices
     WHERE is_active = 1
     AND (last_used_at IS NULL OR last_used_at < DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [inactiveDays]
  );

  const cleanedCount = bigIntToNumber(toCleanupResult.rows[0]?.count ?? 0n);

  // Dry run - just return preview
  if (dryRun) {
    const result: TokenCleanupResult = {
      success: true,
      message: `Dry run: ${cleanedCount} tokens would be deactivated (inactive for ${inactiveDays}+ days)`,
      cleanedCount,
      alreadyInactiveCount,
      totalDevicesBefore,
      activeDevicesAfter: totalDevicesBefore - alreadyInactiveCount - cleanedCount,
      cleanedAt: new Date().toISOString(),
      dryRun: true
    };
    return createSuccessResponse({ ...result }, context.requestId);
  }

  // No tokens to clean
  if (cleanedCount === 0) {
    const result: TokenCleanupResult = {
      success: true,
      message: `No inactive tokens found older than ${inactiveDays} days`,
      cleanedCount: 0,
      alreadyInactiveCount,
      totalDevicesBefore,
      activeDevicesAfter: totalDevicesBefore - alreadyInactiveCount,
      cleanedAt: new Date().toISOString(),
      dryRun: false
    };
    return createSuccessResponse({ ...result }, context.requestId);
  }

  // Execute cleanup - deactivate stale tokens
  try {
    await db.query(
      `UPDATE user_push_devices
       SET is_active = 0
       WHERE is_active = 1
       AND (last_used_at IS NULL OR last_used_at < DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [inactiveDays]
    );

    // Update last_cleanup timestamp
    await db.query(
      `UPDATE notification_admin_config
       SET config_value = JSON_SET(config_value, '$.tokens', ?)
       WHERE config_key = 'last_cleanup'`,
      [new Date().toISOString()]
    );

    console.log(`[TokenCleanup] Admin ${userId} deactivated ${cleanedCount} stale tokens`);

    const result: TokenCleanupResult = {
      success: true,
      message: `Successfully deactivated ${cleanedCount} stale tokens (inactive for ${inactiveDays}+ days)`,
      cleanedCount,
      alreadyInactiveCount,
      totalDevicesBefore,
      activeDevicesAfter: totalDevicesBefore - alreadyInactiveCount - cleanedCount,
      cleanedAt: new Date().toISOString(),
      dryRun: false
    };

    return createSuccessResponse({ ...result }, context.requestId);

  } catch (error) {
    ErrorService.capture('[TokenCleanup] Error:', error);
    return createErrorResponse(
      new BizError({
        code: 'CLEANUP_FAILED',
        message: 'Failed to clean up tokens',
        userMessage: 'Token cleanup failed'
      }),
      context.requestId
    );
  }
}

export const POST = apiHandler(cleanupTokensHandler, {
  allowedMethods: ['POST'],
  requireAuth: true,
  rbac: {
    action: 'write',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 5,
    windowMs: 60000
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
