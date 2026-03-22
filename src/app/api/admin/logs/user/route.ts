/**
 * Admin User Logs API Route
 *
 * GET /api/admin/logs/user - Get user activity logs with filters
 *
 * Filters:
 * - dateFrom, dateTo: Time range filter
 * - userId: Filter by specific user
 * - action: Filter by action type (login, logout, etc.)
 * - actionType: Filter by category (auth, registration, etc.)
 * - success: Filter by success/failure
 * - page, limit: Pagination
 *
 * @authority CLAUDE.md - API Standards
 * @tier STANDARD
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';

interface UserLogRow {
  id: number;
  user_id: number | null;
  action: string;
  action_type: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  browser_info: string | null;
  device_type: string | null;
  location: string | null;
  referrer: string | null;
  session_id: string | null;
  duration: number | null;
  success: number;
  error_message: string | null;
  metadata: string | null;
  created_at: string;
}

interface UserLogResponse {
  id: number;
  user_id: number | null;
  action: string;
  action_type: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  location: string | null;
  session_id: string | null;
  duration: number | null;
  success: boolean;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * GET /api/admin/logs/user
 * Get user activity logs with filters and pagination
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const userId = searchParams.get('userId');
  const action = searchParams.get('action');
  const actionType = searchParams.get('actionType');
  const success = searchParams.get('success');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const search = searchParams.get('search');

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  // Build query
  const conditions: string[] = ['1=1'];
  const params: (string | number)[] = [];

  if (userId) {
    conditions.push('user_id = ?');
    params.push(parseInt(userId));
  }

  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }

  if (actionType) {
    conditions.push('action_type = ?');
    params.push(actionType);
  }

  if (success !== null && success !== '') {
    conditions.push('success = ?');
    params.push(success === 'true' ? 1 : 0);
  }

  if (dateFrom) {
    conditions.push('created_at >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('created_at <= ?');
    params.push(dateTo);
  }

  if (search) {
    conditions.push('(description LIKE ? OR action LIKE ? OR error_message LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const whereClause = conditions.join(' AND ');

  const db = getDatabaseService();

  // Get total count
  const countResult = await db.query<{ total: bigint | number }>(
    `SELECT COUNT(*) as total FROM user_log WHERE ${whereClause}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.total);

  // Get logs with pagination
  const logsResult = await db.query<UserLogRow>(
    `SELECT * FROM user_log
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Transform rows
  const logs: UserLogResponse[] = logsResult.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    action_type: row.action_type,
    description: row.description,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    device_type: row.device_type,
    location: row.location,
    session_id: row.session_id,
    duration: row.duration,
    success: row.success === 1,
    error_message: row.error_message,
    metadata: safeJsonParse(row.metadata, null),
    created_at: row.created_at
  }));

  // Get unique action types for filter dropdown
  const actionTypesResult = await db.query<{ action_type: string }>(
    'SELECT DISTINCT action_type FROM user_log ORDER BY action_type'
  );
  const actionTypes = actionTypesResult.rows.map(r => r.action_type);

  return createSuccessResponse({
    logs,
    actionTypes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, 200);
});
