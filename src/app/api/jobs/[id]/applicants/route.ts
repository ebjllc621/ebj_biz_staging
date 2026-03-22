/**
 * Job Applicants API Route
 *
 * GET /api/jobs/[id]/applicants - Get applicants for a job (job owner only)
 *
 * @tier STANDARD
 * @phase Jobs Phase 2 - Native Applications
 * @generated Manual Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * Features:
 * - Session authentication required
 * - Ownership verification (job creator or business owner only)
 * - Paginated results
 * - Status filtering
 * - Returns applications with applicant details
 *
 * @see src/core/services/JobService.ts - getApplicationsByJobId method
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getJobService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { ApplicationStatus } from '@features/jobs/types';

/**
 * Extract job ID from URL path
 */
function extractJobId(url: string): number {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const jobIdStr = pathParts[pathParts.indexOf('jobs') + 1];
  if (!jobIdStr) throw BizError.badRequest('Job ID is required');
  const jobId = parseInt(jobIdStr, 10);
  if (isNaN(jobId)) throw BizError.badRequest('Invalid job ID');
  return jobId;
}

/**
 * GET /api/jobs/[id]/applicants
 * Get applicants for a job (authorized users only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Extract job ID from URL
  const jobId = extractJobId(request.url);

  // Get job service
  const jobService = getJobService();

  // Verify job exists and user has permission
  const job = await jobService.getById(jobId);
  if (!job) {
    throw BizError.notFound('Job not found');
  }

  // Check if user is job creator or admin
  const isJobCreator = job.creator_user_id === user.id;
  const isAdmin = user.account_type === 'admin';

  if (!isJobCreator && !isAdmin) {
    // For business owners, verify they own the business this job belongs to
    if (job.business_id) {
      // TODO: Add business ownership check when listing ownership service is available
      // For now, only allow job creator and admin
      throw BizError.forbidden('You do not have permission to view applicants for this job');
    } else {
      throw BizError.forbidden('You do not have permission to view applicants for this job');
    }
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

  // Fetch applications
  const result = await jobService.getApplicationsByJobId(jobId, {
    status: status || undefined,
    page,
    limit
  });

  return createSuccessResponse({
    job: {
      id: job.id,
      title: job.title,
      slug: job.slug,
      status: job.status
    },
    applications: result.data,
    pagination: result.pagination
  }, context.requestId);
});
