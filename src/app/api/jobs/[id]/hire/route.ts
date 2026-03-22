/**
 * Job Hire Reporting API Route
 * Report successful hires for analytics
 *
 * POST /api/jobs/[id]/hire
 *
 * @phase Jobs Phase 3 - SEO & Analytics
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_3_BRAIN_PLAN.md
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getJobService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../jobs/[id]/hire

  if (!id) {
    return createErrorResponse('Job ID is required', 400);
  }

  const jobId = parseInt(id);
  if (isNaN(jobId)) {
    return createErrorResponse('Invalid job ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const jobService = getJobService();

  // Validate job exists and user owns the listing
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Verify ownership
  if (job.business_id) {
    const listingService = getListingService();
    const listing = await listingService.getById(job.business_id);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse('You do not have permission to report hires for this job', 403);
    }
  } else if (job.creator_user_id !== user.id) {
    return createErrorResponse('You do not have permission to report hires for this job', 403);
  }

  const hireReport = await jobService.reportHire(user.id, {
    job_id: jobId,
    application_id: body.application_id,
    hire_source: body.hire_source,
    hired_user_id: body.hired_user_id,
    hire_date: body.hire_date,
    salary_or_rate: body.salary_or_rate,
    notes: body.notes
  });

  return createSuccessResponse(hireReport);
});
