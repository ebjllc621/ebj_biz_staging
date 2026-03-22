/**
 * Listing Jobs API Route
 *
 * GET /api/listings/[id]/jobs - Get all jobs for a listing
 * POST /api/listings/[id]/jobs - Create new job for listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: POST requires listing owner auth
 * - Response format: createSuccessResponse/createErrorResponse
 * - Service boundary: JobService
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */

import { getJobService, getListingService, getDatabaseService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { CreateJobInput } from '@features/jobs/types';

/**
 * GET /api/listings/[id]/jobs
 * Get all jobs for a specific listing
 */
export const GET = apiHandler(async (context) => {
  // Extract listing ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingId = pathParts[pathParts.length - 2]; // .../listings/[id]/jobs

  if (!listingId) {
    return createErrorResponse('Listing ID is required', 400);
  }

  const listingIdNum = parseInt(listingId);
  if (isNaN(listingIdNum)) {
    return createErrorResponse('Invalid listing ID', 400);
  }

  // Verify listing exists
  const listingService = getListingService();
  const listing = await listingService.getById(listingIdNum);
  if (!listing) {
    return createErrorResponse('Listing not found', 404);
  }

  // Get all jobs for the listing
  const jobService = getJobService();
  const jobs = await jobService.getByListingId(listingIdNum);

  // Fetch real-time analytics counts for accurate display
  // This ensures job cards show the same data as the analytics modal
  const db = getDatabaseService();
  const jobIds = jobs.map(j => j.id);

  if (jobIds.length > 0) {
    // Get view counts from job_analytics table
    const viewCounts = await db.query<{ job_id: number; count: bigint }>(
      `SELECT job_id, COUNT(*) as count FROM job_analytics
       WHERE job_id IN (${jobIds.map(() => '?').join(',')}) AND event_type = 'page_view'
       GROUP BY job_id`,
      jobIds
    );

    // Get application counts from job_applications table (actual submissions)
    const appCounts = await db.query<{ job_id: number; count: bigint }>(
      `SELECT job_id, COUNT(*) as count FROM job_applications
       WHERE job_id IN (${jobIds.map(() => '?').join(',')})
       GROUP BY job_id`,
      jobIds
    );

    // Get share counts from job_shares table
    const shareCounts = await db.query<{ job_id: number; count: bigint }>(
      `SELECT job_id, COUNT(*) as count FROM job_shares
       WHERE job_id IN (${jobIds.map(() => '?').join(',')})
       GROUP BY job_id`,
      jobIds
    );

    // Get referral counts from user_referrals table (job-specific referrals via entity_type/entity_id)
    // Note: Recommendation system stores job_id in entity_id (string) when entity_type = 'job_posting'
    const referralCounts = await db.query<{ job_id: string; count: bigint }>(
      `SELECT entity_id AS job_id, COUNT(*) as count FROM user_referrals
       WHERE entity_type = 'job_posting' AND entity_id IN (${jobIds.map(() => '?').join(',')})
       GROUP BY entity_id`,
      jobIds.map(id => String(id))
    );

    // Build lookup maps
    const viewMap = new Map(viewCounts.rows.map(r => [r.job_id, bigIntToNumber(r.count)]));
    const appMap = new Map(appCounts.rows.map(r => [r.job_id, bigIntToNumber(r.count)]));
    const shareMap = new Map(shareCounts.rows.map(r => [r.job_id, bigIntToNumber(r.count)]));
    // entity_id is varchar, so convert to number for lookup
    const referralMap = new Map(referralCounts.rows.map(r => [parseInt(r.job_id), bigIntToNumber(r.count)]));

    // Augment jobs with real-time counts
    const jobsWithCounts = jobs.map(job => ({
      ...job,
      view_count: viewMap.get(job.id) || 0,
      application_count: appMap.get(job.id) || 0,
      share_count: shareMap.get(job.id) || 0,
      referral_count: referralMap.get(job.id) || 0
    }));

    return createSuccessResponse({
      jobs: jobsWithCounts,
      listing_id: listingIdNum,
      count: jobsWithCounts.length
    }, 200);
  }

  return createSuccessResponse({
    jobs,
    listing_id: listingIdNum,
    count: jobs.length
  }, 200);
});

/**
 * POST /api/listings/[id]/jobs
 * Create a new job for a listing
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract listing ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const listingId = pathParts[pathParts.length - 2]; // .../listings/[id]/jobs

  if (!listingId) {
    return createErrorResponse('Listing ID is required', 400);
  }

  const listingIdNum = parseInt(listingId);
  if (isNaN(listingIdNum)) {
    return createErrorResponse('Invalid listing ID', 400);
  }

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Verify listing exists and user owns it
  const listingService = getListingService();
  const listing = await listingService.getById(listingIdNum);
  if (!listing) {
    return createErrorResponse('Listing not found', 404);
  }

  if (listing.user_id !== user.id && user.role !== 'admin') {
    throw BizError.forbidden('create job', 'listing owner');
  }

  // Parse request body
  let jobData: CreateJobInput;
  try {
    jobData = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  // Validate required fields
  if (!jobData.title || !jobData.employment_type || !jobData.description ||
      !jobData.compensation_type || !jobData.work_location_type || !jobData.application_method) {
    return createErrorResponse(
      'Missing required fields: title, employment_type, description, compensation_type, work_location_type, application_method',
      400
    );
  }

  // Create job
  const jobService = getJobService();
  try {
    let job;

    // Agency posting: post on behalf of another business
    if (jobData.agency_posting_for_business_id) {
      job = await jobService.createAgencyPosting(
        listingIdNum,
        jobData.agency_posting_for_business_id,
        jobData
      );
    } else {
      job = await jobService.create(listingIdNum, jobData);
    }

    return createSuccessResponse({
      message: 'Job created successfully',
      job
    }, 201);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error.userMessage || error.message, 400);
    }
    console.error('[JobAPI] Failed to create job:', error);
    return createErrorResponse('Failed to create job', 500);
  }
});
