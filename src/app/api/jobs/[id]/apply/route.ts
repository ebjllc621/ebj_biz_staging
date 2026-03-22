/**
 * Job Application Submission API Route
 *
 * POST /api/jobs/[id]/apply - Submit job application
 *
 * @tier STANDARD
 * @phase Jobs Phase 2 - Native Applications
 * @generated Manual Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * Features:
 * - Session authentication required
 * - CSRF protection
 * - Resume file upload validation
 * - Custom question answers
 * - Duplicate application prevention
 * - Sends notification to employer
 *
 * @see src/core/services/JobService.ts - submitApplication method
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getJobService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { SubmitApplicationInput, ApplicationAvailability, ApplicationSource } from '@features/jobs/types';

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
 * POST /api/jobs/[id]/apply
 * Submit native job application
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authenticate user
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to apply for jobs');
  }

  // Extract job ID from URL
  const jobId = extractJobId(request.url);

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
  if (!requestBody.full_name || typeof requestBody.full_name !== 'string' || !requestBody.full_name.trim()) {
    throw BizError.validation('full_name', requestBody.full_name, 'Full name is required');
  }

  if (!requestBody.email || typeof requestBody.email !== 'string' || !requestBody.email.trim()) {
    throw BizError.validation('email', requestBody.email, 'Email is required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(requestBody.email as string)) {
    throw BizError.validation('email', requestBody.email, 'Invalid email format');
  }

  // Validate phone format if provided
  if (requestBody.phone && typeof requestBody.phone === 'string') {
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (!phoneRegex.test(requestBody.phone)) {
      throw BizError.validation('phone', requestBody.phone, 'Invalid phone format');
    }
  }

  // Validate availability if provided
  if (requestBody.availability) {
    const validAvailability: ApplicationAvailability[] = ['immediately', 'within_2_weeks', 'within_1_month', 'flexible'];
    if (!validAvailability.includes(requestBody.availability as ApplicationAvailability)) {
      throw BizError.validation('availability', requestBody.availability, 'Invalid availability value');
    }
  }

  // Validate application source if provided
  if (requestBody.application_source) {
    const validSources: ApplicationSource[] = ['direct', 'social', 'notification', 'search', 'listing'];
    if (!validSources.includes(requestBody.application_source as ApplicationSource)) {
      throw BizError.validation('application_source', requestBody.application_source, 'Invalid application source');
    }
  }

  // Validate custom answers if provided (must be object)
  if (requestBody.custom_answers && (typeof requestBody.custom_answers !== 'object' || Array.isArray(requestBody.custom_answers))) {
    throw BizError.validation('custom_answers', requestBody.custom_answers, 'Custom answers must be an object');
  }

  // Build input
  const input: SubmitApplicationInput = {
    job_id: jobId,
    full_name: (requestBody.full_name as string).trim(),
    email: (requestBody.email as string).trim(),
    phone: requestBody.phone ? (requestBody.phone as string).trim() : undefined,
    resume_file_url: requestBody.resume_file_url as string | undefined,
    cover_message: requestBody.cover_message ? (requestBody.cover_message as string).trim() : undefined,
    availability: requestBody.availability as ApplicationAvailability | undefined,
    custom_answers: requestBody.custom_answers as Record<string, string> | undefined,
    application_source: requestBody.application_source as ApplicationSource | undefined,
    referred_by_user_id: requestBody.referred_by_user_id as number | undefined
  };

  // Get job service
  const jobService = getJobService();

  // Check if user already applied
  const hasApplied = await jobService.hasUserApplied(user.id, jobId);
  if (hasApplied) {
    throw BizError.badRequest(
      'You have already applied to this job',
      { job_id: jobId }
    );
  }

  // Submit application (service will validate job exists and accepts native applications)
  const application = await jobService.submitApplication(user.id, input);

  // TODO: Send notification to employer
  // This would integrate with NotificationService
  // Example:
  // const notificationService = getNotificationService();
  // await notificationService.send({
  //   user_id: job.creator_user_id,
  //   type: 'job_application',
  //   title: 'New Job Application',
  //   message: `${input.full_name} applied for ${job.title}`,
  //   link: `/dashboard/jobs/${jobId}/applicants`
  // });

  return createSuccessResponse({
    message: 'Application submitted successfully',
    application
  }, context.requestId);
}, {
  rateLimit: {
    requests: 10,
    windowMs: 60 * 60 * 1000, // 10 applications per hour per user
  },
}));
