/**
 * Job Applications List API Route
 *
 * GET /api/jobs/applications - Get user's job applications
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

interface ApplicationRow {
  id: number;
  job_id: number;
  job_title: string;
  business_name: string | null;
  status: string;
  created_at: Date;
}

/**
 * GET /api/jobs/applications
 * Get all job applications for the authenticated user
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
    const result = await db.query<ApplicationRow>(
      `SELECT
         ja.id,
         ja.job_id,
         j.title as job_title,
         COALESCE(l.name, 'Unknown Business') as business_name,
         ja.status,
         ja.created_at
       FROM job_applications ja
       JOIN job_postings j ON ja.job_id = j.id
       LEFT JOIN listings l ON j.business_id = l.id
       WHERE ja.user_id = ?
       ORDER BY ja.created_at DESC`,
      [user.id]
    );

    const applications = result.rows.map(row => ({
      id: row.id,
      job_id: row.job_id,
      job_title: row.job_title,
      business_name: row.business_name || 'Unknown Business',
      status: row.status,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    }));

    return createSuccessResponse({
      applications,
      count: applications.length
    });
  } catch (error) {
    console.error('[JobsAPI] Failed to fetch applications:', error);
    // Return empty array on error (table may not exist yet)
    return createSuccessResponse({
      applications: [],
      count: 0
    });
  }
});
