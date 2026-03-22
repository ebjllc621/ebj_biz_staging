/**
 * Admin Error Logs API Route
 *
 * GET /api/admin/logs/error - Get error logs with filters
 *
 * Filters:
 * - dateFrom, dateTo: Time range filter
 * - severity: low, medium, high, critical
 * - status: unresolved, investigating, resolved
 * - errorType: Filter by error type
 * - page, limit: Pagination
 *
 * @authority CLAUDE.md - API Standards
 * @tier STANDARD
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';

const VALID_STATUSES = ['unresolved', 'under_review', 'resolved'] as const;
type ErrorLogStatus = typeof VALID_STATUSES[number];

interface ErrorLogRow {
  id: number;
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  request_url: string | null;
  request_method: string | null;
  user_id: number | null;
  user_agent: string | null;
  ip_address: string | null;
  environment: string;
  severity: string;
  status: string;
  resolved_at: string | null;
  resolved_by: number | null;
  metadata: string | null;
  created_at: string;
}

interface ErrorLogResponse {
  id: number;
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  request_url: string | null;
  request_method: string | null;
  user_id: number | null;
  user_agent: string | null;
  ip_address: string | null;
  environment: string;
  severity: string;
  status: string;
  resolved_at: string | null;
  resolved_by: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * GET /api/admin/logs/error
 * Get error logs with filters and pagination
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const errorType = searchParams.get('errorType');
  const environment = searchParams.get('environment');
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

  if (severity) {
    conditions.push('severity = ?');
    params.push(severity);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (errorType) {
    conditions.push('error_type = ?');
    params.push(errorType);
  }

  if (environment) {
    conditions.push('environment = ?');
    params.push(environment);
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
    conditions.push('(error_message LIKE ? OR error_type LIKE ? OR stack_trace LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const whereClause = conditions.join(' AND ');

  const db = getDatabaseService();

  // Get total count
  const countResult = await db.query<{ total: bigint | number }>(
    `SELECT COUNT(*) as total FROM error_logs WHERE ${whereClause}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.total);

  // Get logs with pagination
  const logsResult = await db.query<ErrorLogRow>(
    `SELECT * FROM error_logs
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Transform rows
  const logs: ErrorLogResponse[] = logsResult.rows.map(row => ({
    id: row.id,
    error_type: row.error_type,
    error_message: row.error_message,
    stack_trace: row.stack_trace,
    request_url: row.request_url,
    request_method: row.request_method,
    user_id: row.user_id,
    user_agent: row.user_agent,
    ip_address: row.ip_address,
    environment: row.environment,
    severity: row.severity,
    status: row.status,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    metadata: safeJsonParse(row.metadata, null),
    created_at: row.created_at
  }));

  // Get unique error types and severities for filter dropdowns
  const errorTypesResult = await db.query<{ error_type: string }>(
    'SELECT DISTINCT error_type FROM error_logs ORDER BY error_type'
  );
  const errorTypes = errorTypesResult.rows.map(r => r.error_type);

  // Get statistics
  const statsResult = await db.query<{ severity: string; count: bigint | number }>(
    `SELECT severity, COUNT(*) as count FROM error_logs
     WHERE ${whereClause}
     GROUP BY severity`,
    params
  );
  const stats = {
    bySeverity: statsResult.rows.reduce((acc, row) => {
      acc[row.severity] = bigIntToNumber(row.count);
      return acc;
    }, {} as Record<string, number>)
  };

  return createSuccessResponse({
    logs,
    errorTypes,
    stats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, 200);
});

/**
 * PATCH /api/admin/logs/error
 * Update error log status (unresolved, under_review, resolved)
 * Body: { id: number, status: string }
 */
export const PATCH = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }
  if (user.role !== 'admin') {
    return createErrorResponse('Admin privileges required', 403);
  }

  const body = await context.request.json();
  const { id, status } = body as { id: number; status: string };

  if (!id || typeof id !== 'number') {
    return createErrorResponse('Valid error log ID required', 400);
  }

  if (!VALID_STATUSES.includes(status as ErrorLogStatus)) {
    return createErrorResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  }

  const db = getDatabaseService();

  // Verify the error log exists
  const existing = await db.query<{ id: number }>(
    'SELECT id FROM error_logs WHERE id = ?',
    [id]
  );
  if (!existing.rows[0]) {
    return createErrorResponse('Error log not found', 404);
  }

  // Build update
  const updates: string[] = ['status = ?'];
  const params: (string | number)[] = [status];

  if (status === 'resolved') {
    updates.push('resolved_at = NOW()');
    updates.push('resolved_by = ?');
    params.push(user.id);
  } else {
    // Clear resolved fields when moving back to non-resolved status
    updates.push('resolved_at = NULL');
    updates.push('resolved_by = NULL');
  }

  params.push(id);

  await db.query(
    `UPDATE error_logs SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'error_log',
    targetEntityId: id,
    actionType: 'error_log_status_updated',
    actionCategory: 'moderation',
    actionDescription: `Updated error log #${id} status to "${status}"`,
    afterData: { id, status },
    severity: 'normal'
  });

  // Return updated row
  const updatedResult = await db.query<ErrorLogRow>(
    'SELECT * FROM error_logs WHERE id = ?',
    [id]
  );
  const row = updatedResult.rows[0];

  return createSuccessResponse({
    log: row ? {
      id: row.id,
      error_type: row.error_type,
      error_message: row.error_message,
      status: row.status,
      resolved_at: row.resolved_at,
      resolved_by: row.resolved_by
    } : null
  });
});
