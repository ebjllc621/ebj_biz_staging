/**
 * Job Alerts API Route
 *
 * GET /api/jobs/alerts - Get user's job alerts
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Required
 * - Response format: createSuccessResponse/createErrorResponse
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Phase 2 - Application System
 */

import { getDatabaseService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { safeJsonParse } from '@core/utils/json';

interface AlertRow {
  id: number;
  keyword_filter: string | null;
  employment_type_filter: string | null;
  notification_frequency: string;
  is_active: number;
  created_at: Date;
}

/**
 * GET /api/jobs/alerts
 * Get all job alerts for the authenticated user
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();

  try {
    const result = await db.query<AlertRow>(
      `SELECT
         id,
         keyword_filter,
         employment_type_filter,
         notification_frequency,
         is_active,
         created_at
       FROM job_alerts
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user.id]
    );

    const alerts = result.rows.map(row => ({
      id: row.id,
      keyword_filter: row.keyword_filter,
      employment_type_filter: row.employment_type_filter
        ? safeJsonParse<string[]>(row.employment_type_filter) || []
        : null,
      notification_frequency: row.notification_frequency,
      is_active: Boolean(row.is_active),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    }));

    return createSuccessResponse({
      alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('[JobsAPI] Failed to fetch alerts:', error);
    // Return empty array on error (table may not exist yet)
    return createSuccessResponse({
      alerts: [],
      count: 0
    });
  }
});
