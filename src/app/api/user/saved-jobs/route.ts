/**
 * User Saved Jobs API Route
 *
 * GET /api/user/saved-jobs - Get user's saved/bookmarked jobs
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Required
 * - Response format: createSuccessResponse/createErrorResponse
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Analytics Dashboard
 */

import { getDatabaseService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

interface SavedJobRow {
  id: number;
  job_id: number;
  job_title: string;
  business_name: string | null;
  saved_at: Date;
  job_slug: string;
  employment_type: string | null;
  city: string | null;
  state: string | null;
  status: string;
}

/**
 * GET /api/user/saved-jobs
 * Get all saved jobs for the authenticated user
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
    const result = await db.query<SavedJobRow>(
      `SELECT
         usj.id,
         usj.job_id,
         j.title as job_title,
         j.slug as job_slug,
         j.employment_type,
         j.city,
         j.state,
         j.status,
         COALESCE(l.name, 'Unknown Business') as business_name,
         usj.created_at as saved_at
       FROM user_saved_jobs usj
       JOIN job_postings j ON usj.job_id = j.id
       LEFT JOIN listings l ON j.business_id = l.id
       WHERE usj.user_id = ?
       ORDER BY usj.created_at DESC`,
      [user.id]
    );

    // Transform to expected format
    const savedJobs = result.rows.map(row => ({
      id: row.id,
      job_id: row.job_id,
      job_title: row.job_title,
      job_slug: row.job_slug,
      business_name: row.business_name || 'Unknown Business',
      employment_type: row.employment_type,
      location: row.city && row.state
        ? `${row.city}, ${row.state}`
        : row.city || row.state || null,
      status: row.status,
      saved_at: row.saved_at instanceof Date ? row.saved_at.toISOString() : row.saved_at
    }));

    return createSuccessResponse({
      saved_jobs: savedJobs,
      count: savedJobs.length
    });
  } catch (error) {
    console.error('[UserAPI] Failed to fetch saved jobs:', error);
    return createErrorResponse('Failed to fetch saved jobs', 500);
  }
});
