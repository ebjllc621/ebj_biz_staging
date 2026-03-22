/**
 * Application Management API Route
 *
 * GET /api/jobs/applications/[applicationId] - Get single application
 * PUT /api/jobs/applications/[applicationId] - Update application status
 *
 * @tier STANDARD
 * @phase Jobs Phase 2 - Native Applications
 * @generated Manual Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * Features:
 * - Session authentication required
 * - Ownership verification (job creator or applicant only)
 * - Status updates with timestamps
 * - Employer notes support
 *
 * @see src/core/services/JobService.ts - getApplicationById, updateApplicationStatus methods
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getJobService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { ApplicationStatus } from '@features/jobs/types';

/**
 * Extract application ID from URL path
 */
function extractApplicationId(url: string): number {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const appIdStr = pathParts[pathParts.indexOf('applications') + 1];
  if (!appIdStr) throw BizError.badRequest('Application ID is required');
  const applicationId = parseInt(appIdStr, 10);
  if (isNaN(applicationId)) throw BizError.badRequest('Invalid application ID');
  return applicationId;
}

/**
 * GET /api/jobs/applications/[applicationId]
 * Get single application (authorized users only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Extract application ID from URL
  const applicationId = extractApplicationId(request.url);

  // Get job service
  const jobService = getJobService();

  // Fetch application
  const application = await jobService.getApplicationById(applicationId);
  if (!application) {
    throw BizError.notFound('Application not found');
  }

  // Verify user has permission to view this application
  const isApplicant = application.user_id === user.id;
  const isAdmin = user.account_type === 'admin';

  if (!isApplicant && !isAdmin) {
    // Check if user is job creator
    const job = await jobService.getById(application.job_id);
    if (!job || job.creator_user_id !== user.id) {
      throw BizError.forbidden('You do not have permission to view this application');
    }
  }

  return createSuccessResponse({
    application
  }, context.requestId);
});

/**
 * PUT /api/jobs/applications/[applicationId]
 * Update application status (job creator only)
 */
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Extract application ID from URL
  const applicationId = extractApplicationId(request.url);

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
  if (!requestBody.status || typeof requestBody.status !== 'string') {
    throw BizError.validation('status', requestBody.status, 'Status is required');
  }

  const validStatuses: ApplicationStatus[] = ['new', 'reviewed', 'contacted', 'interviewed', 'hired', 'declined'];
  if (!validStatuses.includes(requestBody.status as ApplicationStatus)) {
    throw BizError.validation('status', requestBody.status, 'Invalid status value');
  }

  // Get job service
  const jobService = getJobService();

  // Fetch application
  const application = await jobService.getApplicationById(applicationId);
  if (!application) {
    throw BizError.notFound('Application not found');
  }

  // Verify user is job creator or admin
  const job = await jobService.getById(application.job_id);
  if (!job) {
    throw BizError.notFound('Job not found');
  }

  const isJobCreator = job.creator_user_id === user.id;
  const isAdmin = user.account_type === 'admin';

  if (!isJobCreator && !isAdmin) {
    throw BizError.forbidden('You do not have permission to update this application');
  }

  // Update application status
  const updatedApplication = await jobService.updateApplicationStatus(
    applicationId,
    requestBody.status as ApplicationStatus,
    requestBody.notes as string | undefined
  );

  // TODO: Send notification to applicant when status changes
  // This would integrate with NotificationService
  // Example:
  // if (requestBody.status === 'contacted' || requestBody.status === 'interviewed') {
  //   const notificationService = getNotificationService();
  //   await notificationService.send({
  //     user_id: application.user_id,
  //     type: 'application_status_change',
  //     title: 'Application Status Update',
  //     message: `Your application for ${job.title} has been updated`,
  //     link: `/user/jobs/applied`
  //   });
  // }

  return createSuccessResponse({
    message: 'Application status updated successfully',
    application: updatedApplication
  }, context.requestId);
}));
