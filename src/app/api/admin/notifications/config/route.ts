/**
 * Admin Notification Config Endpoint
 *
 * GET /api/admin/notifications/config
 * Returns current admin configuration
 *
 * PUT /api/admin/notifications/config
 * Updates admin configuration
 *
 * @phase Phase 8 - Administrative Actions Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { safeJsonParse } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';
import type { AdminConfigResponse, AdminChannel, ChannelStatus } from '@core/types/notification-admin';

/**
 * Get configuration by key
 */
async function getConfigValue<T>(
  db: ReturnType<typeof getDatabaseService>,
  key: string
): Promise<T | null> {
  const result = await db.query<{
    config_value: string | object;
    updated_at: Date;
    updated_by: number | null;
  }>(
    'SELECT config_value, updated_at, updated_by FROM notification_admin_config WHERE config_key = ?',
    [key]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  if (!row) return null;

  const value = typeof row.config_value === 'string'
    ? safeJsonParse(row.config_value, null)
    : row.config_value;

  return value as T;
}

/**
 * GET /api/admin/notifications/config
 */
async function getConfigHandler(context: ApiContext) {
  const db = getDatabaseService();

  // Get all config values
  const channelStatus = await getConfigValue<Record<AdminChannel, ChannelStatus>>(
    db, 'channel_status'
  ) || { inApp: 'active', push: 'active', email: 'active' };

  const cleanupSettings = await getConfigValue<AdminConfigResponse['cleanupSettings']>(
    db, 'cleanup_settings'
  ) || { staleNotificationsDays: 90, inactiveDevicesDays: 30 };

  const lastCleanup = await getConfigValue<AdminConfigResponse['lastCleanup']>(
    db, 'last_cleanup'
  ) || { tokens: null, notifications: null };

  // Get metadata from any config row
  const metaResult = await db.query<{ updated_at: Date; updated_by: number | null }>(
    'SELECT updated_at, updated_by FROM notification_admin_config ORDER BY updated_at DESC LIMIT 1'
  );
  const meta = metaResult.rows[0];

  const response: AdminConfigResponse = {
    channelStatus,
    cleanupSettings,
    lastCleanup,
    updatedAt: meta?.updated_at?.toISOString() || new Date().toISOString(),
    updatedBy: meta?.updated_by || null
  };

  return createSuccessResponse({ ...response }, context.requestId);
}

/**
 * PUT /api/admin/notifications/config
 */
async function updateConfigHandler(context: ApiContext) {
  const db = getDatabaseService();
  const userId = context.userId;

  let body: Partial<{
    channelStatus: Record<AdminChannel, ChannelStatus>;
    cleanupSettings: AdminConfigResponse['cleanupSettings'];
  }> = {};

  try {
    body = await context.request.json();
  } catch {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_BODY',
        message: 'Request body required',
        userMessage: 'Request body required'
      }),
      context.requestId
    );
  }

  // Update channel_status if provided
  if (body.channelStatus) {
    // Validate all channels have valid status
    const validStatuses: ChannelStatus[] = ['active', 'paused'];
    const validChannels: AdminChannel[] = ['inApp', 'push', 'email'];

    for (const channel of validChannels) {
      if (body.channelStatus[channel] && !validStatuses.includes(body.channelStatus[channel])) {
        return createErrorResponse(
          new BizError({
            code: 'INVALID_STATUS',
            message: `Invalid status for channel ${channel}`,
            userMessage: `Invalid status for channel ${channel}`
          }),
          context.requestId
        );
      }
    }

    await db.query(
      `UPDATE notification_admin_config
       SET config_value = ?, updated_by = ?
       WHERE config_key = 'channel_status'`,
      [JSON.stringify(body.channelStatus), userId]
    );
  }

  // Update cleanup_settings if provided
  if (body.cleanupSettings) {
    if (body.cleanupSettings.staleNotificationsDays < 30) {
      return createErrorResponse(
        new BizError({
          code: 'INVALID_THRESHOLD',
          message: 'Stale notifications threshold must be at least 30 days',
          userMessage: 'Stale notifications threshold must be at least 30 days'
        }),
        context.requestId
      );
    }

    await db.query(
      `UPDATE notification_admin_config
       SET config_value = ?, updated_by = ?
       WHERE config_key = 'cleanup_settings'`,
      [JSON.stringify(body.cleanupSettings), userId]
    );
  }

  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'notification_config',
    targetEntityId: null,
    actionType: 'notification_config_updated',
    actionCategory: 'configuration',
    actionDescription: `Updated notification config: ${[body.channelStatus ? 'channelStatus' : '', body.cleanupSettings ? 'cleanupSettings' : ''].filter(Boolean).join(', ')}`,
    afterData: { ...body },
    severity: 'normal'
  });

  // Return updated config
  return getConfigHandler(context);
}

export const GET = apiHandler(getConfigHandler, {
  allowedMethods: ['GET', 'PUT'],
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

export const PUT = apiHandler(updateConfigHandler, {
  allowedMethods: ['GET', 'PUT'],
  requireAuth: true,
  rbac: {
    action: 'write',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 10,
    windowMs: 60000
  }
});

// Method guards
const ALLOWED_METHODS = ['GET', 'PUT'];

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
