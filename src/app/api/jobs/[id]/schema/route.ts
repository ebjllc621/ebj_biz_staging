/**
 * Job Schema.org API Route
 * Returns JobPosting JSON-LD for SEO
 *
 * GET /api/jobs/[id]/schema
 *
 * @phase Jobs Phase 3 - SEO & Analytics
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_3_BRAIN_PLAN.md
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getSEOService, getJobService, getListingService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../jobs/[id]/schema

  if (!id) {
    return createErrorResponse('Job ID is required', 400);
  }

  const jobId = parseInt(id);
  if (isNaN(jobId)) {
    return createErrorResponse('Invalid job ID', 400);
  }

  const seoService = getSEOService();
  const jobService = getJobService();

  // Get job to check tier (only Preferred/Premium get schema)
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Check tier through listing
  if (job.business_id) {
    const listingService = getListingService();
    const listing = await listingService.getById(job.business_id);
    if (listing && (listing.tier === 'essentials' || listing.tier === 'plus')) {
      return createErrorResponse('Schema.org is only available for Preferred and Premium tiers', 403);
    }
  }

  const schema = await seoService.generateJobPostingSchema(jobId);

  return createSuccessResponse(schema);
});
