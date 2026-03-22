/**
 * Admin Notification Troubleshoot - User Lookup Endpoint
 *
 * GET /api/admin/notifications/troubleshoot/user?email=...&id=...
 * Returns user details with notification statistics
 *
 * AUTHENTICATED ENDPOINT:
 * - Requires admin authentication
 * - Returns comprehensive user notification context
 *
 * @phase Phase 5 - Troubleshooting Panel
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { jsonMethodNotAllowed } from '@/lib/http/json';
import { bigIntToNumber } from '@core/utils/bigint';
import type { TroubleshootUserResponse, TroubleshootUserResult } from '@core/types/notification-admin';

/**
 * GET /api/admin/notifications/troubleshoot/user
 * Lookup user by email or ID for troubleshooting
 */
async function getUserHandler(context: ApiContext) {
  const { searchParams } = new URL(context.request.url);
  const email = searchParams.get('email')?.trim();
  const userId = searchParams.get('id');

  // Validate search parameters
  if (!email && !userId) {
    throw new BizError({
      code: 'VALIDATION_ERROR',
      message: 'Either email or id parameter is required'
    });
  }

  const db = getDatabaseService();
  const searchType = email ? 'email' : 'id';
  const searchTerm = email || userId || '';

  // 1. Find user
  const userQuery = email
    ? `SELECT id, email, first_name, last_name, account_type, created_at, last_login_at
       FROM users WHERE email = ?`
    : `SELECT id, email, first_name, last_name, account_type, created_at, last_login_at
       FROM users WHERE id = ?`;

  const userResult = await db.query<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    account_type: string;
    created_at: Date;
    last_login_at: Date | null;
  }>(userQuery, [email || parseInt(userId!, 10)]);

  if (userResult.rows.length === 0) {
    const response: TroubleshootUserResponse = {
      user: null,
      found: false,
      searchTerm,
      searchType
    };
    return createSuccessResponse({ ...response }, context.requestId);
  }

  const userData = userResult.rows[0]!;

  // 2. Get notification statistics
  const statsResult = await db.query<{
    total: bigint;
    unread: bigint;
    last7Days: bigint;
  }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
       SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as last7Days
     FROM user_notifications WHERE user_id = ?`,
    [userData.id]
  );

  const stats = statsResult.rows[0];

  // 3. Get push device count
  const deviceResult = await db.query<{ total: bigint; active: bigint }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
     FROM user_push_devices WHERE user_id = ?`,
    [userData.id]
  );

  const devices = deviceResult.rows[0];

  // 4. Get notification preferences
  const prefsResult = await db.query<{
    master_enabled: number;
    quiet_hours_enabled: number;
  }>(
    `SELECT master_enabled, quiet_hours_enabled
     FROM notification_preferences WHERE user_id = ?`,
    [userData.id]
  );

  const prefs = prefsResult.rows[0];

  const user: TroubleshootUserResult = {
    id: userData.id,
    email: userData.email,
    firstName: userData.first_name,
    lastName: userData.last_name,
    accountType: userData.account_type,
    createdAt: userData.created_at.toISOString(),
    lastLoginAt: userData.last_login_at?.toISOString() ?? null,
    notificationStats: {
      total: bigIntToNumber(stats?.total ?? 0n),
      unread: bigIntToNumber(stats?.unread ?? 0n),
      last7Days: bigIntToNumber(stats?.last7Days ?? 0n)
    },
    pushDevices: {
      total: bigIntToNumber(devices?.total ?? 0n),
      active: bigIntToNumber(devices?.active ?? 0n)
    },
    preferences: {
      masterEnabled: prefs?.master_enabled === 1,
      quietHoursEnabled: prefs?.quiet_hours_enabled === 1
    }
  };

  const response: TroubleshootUserResponse = {
    user,
    found: true,
    searchTerm,
    searchType
  };

  return createSuccessResponse({ ...response }, context.requestId);
}

export const GET = apiHandler(getUserHandler, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: {
    action: 'read',
    resource: 'notification_admin'
  },
  rateLimit: {
    requests: 60,
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
