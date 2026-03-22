/**
 * Admin Channel Control Endpoint
 *
 * POST /api/admin/notifications/channel/[channel]
 * Pause or resume a notification channel
 *
 * Request Body:
 * - action: 'pause' | 'resume'
 *
 * @phase Phase 8 - Administrative Actions Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { safeJsonParse } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';
import type { ChannelActionResult, AdminChannel, ChannelStatus } from '@core/types/notification-admin';

const VALID_CHANNELS: AdminChannel[] = ['inApp', 'push', 'email'];

/**
 * POST /api/admin/notifications/channel/[channel]
 */
async function channelControlHandler(context: ApiContext) {
  const db = getDatabaseService();
  const userId = context.userId;

  // Extract channel from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const channelIndex = pathParts.indexOf('channel') + 1;
  const channel = pathParts[channelIndex] as AdminChannel;

  // Validate channel
  if (!channel || !VALID_CHANNELS.includes(channel)) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_CHANNEL',
        message: `Invalid channel: ${channel}. Valid channels: ${VALID_CHANNELS.join(', ')}`,
        userMessage: `Invalid channel specified`
      }),
      context.requestId
    );
  }

  // Parse request body
  let body: { action?: 'pause' | 'resume' } = {};
  try {
    body = await context.request.json();
  } catch {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_BODY',
        message: 'Request body required with action: pause or resume',
        userMessage: 'Request body required'
      }),
      context.requestId
    );
  }

  const action = body.action;
  if (!action || !['pause', 'resume'].includes(action)) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_ACTION',
        message: 'Action must be "pause" or "resume"',
        userMessage: 'Invalid action specified'
      }),
      context.requestId
    );
  }

  // Get current channel status
  const configResult = await db.query<{ config_value: string | object }>(
    'SELECT config_value FROM notification_admin_config WHERE config_key = ?',
    ['channel_status']
  );

  let channelStatus: Record<AdminChannel, ChannelStatus> = {
    inApp: 'active',
    push: 'active',
    email: 'active'
  };

  if (configResult.rows[0]) {
    const value = configResult.rows[0].config_value;
    channelStatus = typeof value === 'string'
      ? safeJsonParse(value, channelStatus)
      : value as Record<AdminChannel, ChannelStatus>;
  }

  const previousStatus = channelStatus[channel] || 'active';
  const newStatus: ChannelStatus = action === 'pause' ? 'paused' : 'active';

  // Check if status is already the same
  if (previousStatus === newStatus) {
    const result: ChannelActionResult = {
      success: true,
      message: `Channel ${channel} is already ${newStatus}`,
      channel,
      previousStatus,
      newStatus,
      updatedAt: new Date().toISOString()
    };
    return createSuccessResponse({ ...result }, context.requestId);
  }

  // Update channel status
  channelStatus[channel] = newStatus;

  await db.query(
    `UPDATE notification_admin_config
     SET config_value = ?, updated_by = ?
     WHERE config_key = 'channel_status'`,
    [JSON.stringify(channelStatus), userId]
  );

  console.log(`[ChannelControl] Admin ${userId} ${action}d channel: ${channel}`);

  const result: ChannelActionResult = {
    success: true,
    message: `Channel ${channel} has been ${action}d successfully`,
    channel,
    previousStatus,
    newStatus,
    updatedAt: new Date().toISOString()
  };

  return createSuccessResponse({ ...result }, context.requestId);
}

export const POST = apiHandler(channelControlHandler, {
  allowedMethods: ['POST'],
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
