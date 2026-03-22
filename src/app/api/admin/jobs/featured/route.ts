/**
 * Admin Featured Jobs API Route
 *
 * GET /api/admin/jobs/featured - Get featured jobs
 * PUT /api/admin/jobs/featured - Set featured status
 *
 * @tier STANDARD
 * @phase Jobs Phase 2 - Native Applications
 * @generated Manual Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * Features:
 * - Admin authentication required
 * - Featured status management
 * - Featured expiration dates
 *
 * @see src/core/services/JobService.ts - setFeatured, getFeaturedJobs methods
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getJobService } from '@core/services/ServiceRegistry';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * GET /api/admin/jobs/featured
 * Get all featured jobs (admin only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate admin
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.account_type !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Get job service
  const jobService = getJobService();

  // Fetch featured jobs
  const jobs = await jobService.getFeaturedJobs();

  return createSuccessResponse({
    jobs,
    total: jobs.length
  }, context.requestId);
});

/**
 * PUT /api/admin/jobs/featured
 * Set featured status for job (admin only)
 */
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate admin
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.account_type !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields
  if (!requestBody.job_id || typeof requestBody.job_id !== 'number') {
    throw BizError.validation('job_id', requestBody.job_id, 'Job ID is required');
  }

  if (typeof requestBody.featured !== 'boolean') {
    throw BizError.validation('featured', requestBody.featured, 'Featured status is required');
  }

  // Get job service
  const jobService = getJobService();

  // Verify job exists
  const job = await jobService.getById(requestBody.job_id as number);
  if (!job) {
    throw BizError.notFound('Job not found');
  }

  // Parse featured_until date if provided
  let featuredUntil: Date | undefined;
  if (requestBody.featured_until && typeof requestBody.featured_until === 'string') {
    featuredUntil = new Date(requestBody.featured_until as string);
    if (isNaN(featuredUntil.getTime())) {
      throw BizError.validation('featured_until', requestBody.featured_until, 'Invalid date format');
    }
  }

  // Set featured status
  await jobService.setFeatured(
    requestBody.job_id as number,
    requestBody.featured as boolean,
    featuredUntil
  );

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'job',
    targetEntityId: requestBody.job_id as number,
    actionType: 'job_featured_updated',
    actionCategory: 'update',
    actionDescription: `${requestBody.featured ? 'Featured' : 'Unfeatured'} job ID ${requestBody.job_id}`,
    afterData: { job_id: requestBody.job_id, featured: requestBody.featured, featured_until: featuredUntil?.toISOString() || null },
    severity: 'normal'
  });

  return createSuccessResponse({
    message: 'Featured status updated successfully',
    job_id: requestBody.job_id,
    featured: requestBody.featured,
    featured_until: featuredUntil?.toISOString() || null
  }, context.requestId);
}));
