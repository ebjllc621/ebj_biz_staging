/**
 * Admin Job Moderation API Route
 *
 * GET /api/admin/jobs/moderation - Get jobs pending moderation
 * PUT /api/admin/jobs/moderation - Approve or reject job
 *
 * @tier STANDARD
 * @phase Jobs Phase 2 - Native Applications
 * @generated Manual Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * Features:
 * - Admin authentication required
 * - Community gig moderation
 * - Approval/rejection workflow
 * - Moderation notes
 *
 * @see src/core/services/JobService.ts - getCommunityGigsPendingModeration, approveGig, rejectGig methods
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getJobService } from '@core/services/ServiceRegistry';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * GET /api/admin/jobs/moderation
 * Get community gigs pending moderation (admin only)
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

  // Fetch pending community gigs
  const jobs = await jobService.getCommunityGigsPendingModeration();

  return createSuccessResponse({
    jobs,
    total: jobs.length
  }, context.requestId);
});

/**
 * PUT /api/admin/jobs/moderation
 * Approve or reject community gig (admin only)
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

  if (!requestBody.action || typeof requestBody.action !== 'string') {
    throw BizError.validation('action', requestBody.action, 'Action is required');
  }

  if (!['approve', 'reject'].includes(requestBody.action as string)) {
    throw BizError.validation('action', requestBody.action, 'Action must be "approve" or "reject"');
  }

  // Get job service
  const jobService = getJobService();

  // Verify job exists
  const job = await jobService.getById(requestBody.job_id as number);
  if (!job) {
    throw BizError.notFound('Job not found');
  }

  // Verify job is a community gig pending moderation
  if (job.status !== 'pending_moderation') {
    throw BizError.badRequest('Job is not pending moderation');
  }

  // Perform action
  if (requestBody.action === 'approve') {
    await jobService.approveGig(requestBody.job_id as number);

    // TODO: Send notification to job creator
    // const notificationService = getNotificationService();
    // await notificationService.send({
    //   user_id: job.creator_user_id,
    //   type: 'job_approved',
    //   title: 'Community Gig Approved',
    //   message: `Your job posting "${job.title}" has been approved`,
    //   link: `/jobs/${job.slug}`
    // });

    // Log admin activity
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: user.id,
      targetEntityType: 'job',
      targetEntityId: requestBody.job_id as number,
      actionType: 'job_moderated',
      actionCategory: 'moderation',
      actionDescription: `Approved community gig ID ${requestBody.job_id}`,
      afterData: { job_id: requestBody.job_id, action: 'approve' },
      severity: 'normal'
    });

    return createSuccessResponse({
      message: 'Community gig approved successfully',
      job_id: requestBody.job_id
    }, context.requestId);
  } else {
    // Reject action
    if (!requestBody.notes || typeof requestBody.notes !== 'string' || !requestBody.notes.trim()) {
      throw BizError.validation('notes', requestBody.notes, 'Rejection reason is required');
    }

    await jobService.rejectGig(requestBody.job_id as number, requestBody.notes as string);

    // TODO: Send notification to job creator
    // const notificationService = getNotificationService();
    // await notificationService.send({
    //   user_id: job.creator_user_id,
    //   type: 'job_rejected',
    //   title: 'Community Gig Rejected',
    //   message: `Your job posting "${job.title}" was not approved`,
    //   link: `/dashboard/jobs`
    // });

    // Log admin activity
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: user.id,
      targetEntityType: 'job',
      targetEntityId: requestBody.job_id as number,
      actionType: 'job_moderated',
      actionCategory: 'moderation',
      actionDescription: `Rejected community gig ID ${requestBody.job_id}: ${requestBody.notes}`,
      afterData: { job_id: requestBody.job_id, action: 'reject', notes: requestBody.notes },
      severity: 'normal'
    });

    return createSuccessResponse({
      message: 'Community gig rejected successfully',
      job_id: requestBody.job_id
    }, context.requestId);
  }
}));
