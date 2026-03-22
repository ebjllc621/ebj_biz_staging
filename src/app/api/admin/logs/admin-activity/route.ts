/**
 * Admin Activity Logs API Route
 *
 * GET /api/admin/logs/admin-activity - Get admin activity audit logs
 *
 * Filters:
 * - dateFrom, dateTo: Time range filter
 * - adminUserId: Filter by admin who performed action
 * - actionCategory: deletion, moderation, update, etc.
 * - targetEntityType: category, listing, user, etc.
 * - severity: low, normal, high, critical
 * - page, limit: Pagination
 *
 * @authority CLAUDE.md - API Standards
 * @tier STANDARD
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';

interface AdminActivityRow {
  id: number;
  admin_user_id: number;
  target_user_id: number | null;
  target_entity_type: string;
  target_entity_id: number | null;
  action_type: string;
  action_category: string;
  action_description: string;
  before_data: string | null;
  after_data: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  severity: string;
  requires_approval: number;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
}

interface AdminActivityResponse {
  id: number;
  admin_user_id: number;
  target_user_id: number | null;
  target_entity_type: string;
  target_entity_id: number | null;
  action_type: string;
  action_category: string;
  action_description: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  severity: string;
  requires_approval: boolean;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  admin_username?: string;
}

/**
 * GET /api/admin/logs/admin-activity
 * Get admin activity logs with filters and pagination
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const adminUserId = searchParams.get('adminUserId');
  const actionCategory = searchParams.get('actionCategory');
  const targetEntityType = searchParams.get('targetEntityType');
  const severity = searchParams.get('severity');
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

  if (adminUserId) {
    conditions.push('aa.admin_user_id = ?');
    params.push(parseInt(adminUserId));
  }

  if (actionCategory) {
    conditions.push('aa.action_category = ?');
    params.push(actionCategory);
  }

  if (targetEntityType) {
    conditions.push('aa.target_entity_type = ?');
    params.push(targetEntityType);
  }

  if (severity) {
    conditions.push('aa.severity = ?');
    params.push(severity);
  }

  if (dateFrom) {
    conditions.push('aa.created_at >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    // Append end-of-day time so the filter includes the entire dateTo day
    conditions.push('aa.created_at <= ?');
    params.push(`${dateTo} 23:59:59`);
  }

  if (search) {
    conditions.push('(aa.action_description LIKE ? OR aa.action_type LIKE ? OR aa.target_entity_type LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const whereClause = conditions.join(' AND ');

  const db = getDatabaseService();

  // Get total count
  const countResult = await db.query<{ total: bigint | number }>(
    `SELECT COUNT(*) as total FROM admin_activity aa WHERE ${whereClause}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.total);

  // Get logs with pagination and join with users for admin username
  const logsResult = await db.query<AdminActivityRow & { admin_username: string | null }>(
    `SELECT aa.*, u.username as admin_username
     FROM admin_activity aa
     LEFT JOIN users u ON aa.admin_user_id = u.id
     WHERE ${whereClause}
     ORDER BY aa.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Transform rows
  const logs: AdminActivityResponse[] = logsResult.rows.map(row => ({
    id: row.id,
    admin_user_id: row.admin_user_id,
    admin_username: row.admin_username || `Admin #${row.admin_user_id}`,
    target_user_id: row.target_user_id,
    target_entity_type: row.target_entity_type,
    target_entity_id: row.target_entity_id,
    action_type: row.action_type,
    action_category: row.action_category,
    action_description: row.action_description,
    before_data: safeJsonParse(row.before_data, null),
    after_data: safeJsonParse(row.after_data, null),
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    session_id: row.session_id,
    severity: row.severity,
    requires_approval: row.requires_approval === 1,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    created_at: row.created_at
  }));

  // Get unique categories and entity types for filter dropdowns
  const categoriesResult = await db.query<{ action_category: string }>(
    'SELECT DISTINCT action_category FROM admin_activity ORDER BY action_category'
  );
  const actionCategories = categoriesResult.rows.map(r => r.action_category);

  const entityTypesResult = await db.query<{ target_entity_type: string }>(
    'SELECT DISTINCT target_entity_type FROM admin_activity ORDER BY target_entity_type'
  );
  const entityTypes = entityTypesResult.rows.map(r => r.target_entity_type);

  // Get statistics
  const statsResult = await db.query<{ action_category: string; count: bigint | number }>(
    `SELECT action_category, COUNT(*) as count FROM admin_activity aa
     WHERE ${whereClause}
     GROUP BY action_category`,
    params
  );
  const stats = {
    byCategory: statsResult.rows.reduce((acc, row) => {
      acc[row.action_category] = bigIntToNumber(row.count);
      return acc;
    }, {} as Record<string, number>)
  };

  return createSuccessResponse({
    logs,
    actionCategories,
    entityTypes,
    stats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, 200);
});
