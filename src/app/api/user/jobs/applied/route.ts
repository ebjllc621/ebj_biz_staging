/**
 * User Applied Jobs API Route
 *
 * GET /api/user/jobs/applied - Get user's job applications
 *
 * @tier STANDARD
 * @phase Jobs Phase 3 - Dashboard Completion
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_3_PLAN.md
 *
 * Features:
 * - Session authentication required
 * - Paginated results with job details (title, slug, business name)
 * - Status filtering
 *
 * @see src/core/services/JobService.ts - getUserApplications method
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { ApplicationStatus } from '@features/jobs/types';

interface ApplicationRow {
  id: number;
  job_id: number;
  job_title: string;
  job_slug: string;
  business_name: string;
  status: string;
  created_at: Date;
}

/**
 * GET /api/user/jobs/applied
 * Get user's job applications with pagination and filtering
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const status = searchParams.get('status') as ApplicationStatus | null;

  // Validate pagination
  if (page < 1 || limit < 1 || limit > 100) {
    throw BizError.badRequest('Invalid pagination parameters');
  }

  const db = getDatabaseService();
  const offset = (page - 1) * limit;

  // Build WHERE clause
  let whereClause = 'WHERE ja.user_id = ?';
  const params: unknown[] = [user.id];

  if (status) {
    whereClause += ' AND ja.status = ?';
    params.push(status);
  }

  // Get total count
  const countResult = await db.query<{ total: bigint | number }>(
    `SELECT COUNT(*) as total FROM job_applications ja ${whereClause}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.total);

  // Get paginated applications with job details
  const result = await db.query<ApplicationRow>(
    `SELECT
       ja.id,
       ja.job_id,
       j.title as job_title,
       j.slug as job_slug,
       COALESCE(l.name, 'Unknown Business') as business_name,
       ja.status,
       ja.created_at
     FROM job_applications ja
     LEFT JOIN job_postings j ON ja.job_id = j.id
     LEFT JOIN listings l ON j.business_id = l.id
     ${whereClause}
     ORDER BY ja.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const applications = result.rows.map(row => ({
    id: row.id,
    job_id: row.job_id,
    job_title: row.job_title ?? 'Unknown Job',
    job_slug: row.job_slug ?? '',
    business_name: row.business_name ?? 'Unknown Business',
    status: row.status,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }));

  return createSuccessResponse({
    applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }, context.requestId);
});
