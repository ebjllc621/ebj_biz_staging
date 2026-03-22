/**
 * Single Job API Route
 *
 * GET /api/jobs/[id] - Get job by ID or slug
 * PUT /api/jobs/[id] - Update job
 * DELETE /api/jobs/[id] - Delete job
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Service boundary: JobService
 * - Public access for GET, auth required for PUT/DELETE
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */

import { getJobService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import type { UpdateJobInput } from '@features/jobs/types';

/**
 * GET /api/jobs/[id]
 * Get job by ID or slug with full details
 */
export const GET = apiHandler(async (context) => {
  // Extract job ID/slug from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    return createErrorResponse('Job ID or slug is required', 400);
  }

  const jobService = getJobService();

  // Try to parse as number (ID), otherwise treat as slug
  let job;
  if (/^\d+$/.test(id)) {
    job = await jobService.getById(parseInt(id));
  } else {
    job = await jobService.getBySlug(id);
  }

  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Increment view count asynchronously (fire-and-forget)
  jobService.incrementViewCount(job.id).catch((error) => {
    console.error('[JobAPI] Failed to increment view count:', error);
  });

  return createSuccessResponse({
    job
  }, 200);
});

/**
 * PUT /api/jobs/[id]
 * Update job details (requires ownership or admin)
 */
export const PUT = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || !/^\d+$/.test(id)) {
    return createErrorResponse('Valid job ID is required', 400);
  }

  const jobId = parseInt(id);

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const jobService = getJobService();

  // Verify job exists
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Verify ownership (user owns the listing or is admin)
  if (job.business_id) {
    const listingService = getListingService();
    const listing = await listingService.getById(job.business_id);
    if (!listing || (listing.user_id !== user.id && user.role !== 'admin')) {
      throw BizError.forbidden('update job', 'listing owner');
    }
  } else if (job.creator_user_id !== user.id && user.role !== 'admin') {
    throw BizError.forbidden('update job', 'job creator');
  }

  // Parse request body
  let updateData: UpdateJobInput;
  try {
    updateData = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  // Update job
  try {
    const updatedJob = await jobService.update(jobId, updateData);

    return createSuccessResponse({
      message: 'Job updated successfully',
      job: updatedJob
    }, 200);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error.userMessage || error.message, 400);
    }
    console.error('[JobAPI] Failed to update job:', error);
    return createErrorResponse('Failed to update job', 500);
  }
});

/**
 * DELETE /api/jobs/[id]
 * Delete job (requires ownership or admin)
 */
export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || !/^\d+$/.test(id)) {
    return createErrorResponse('Valid job ID is required', 400);
  }

  const jobId = parseInt(id);

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const jobService = getJobService();

  // Verify job exists
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Verify ownership (user owns the listing or is admin)
  if (job.business_id) {
    const listingService = getListingService();
    const listing = await listingService.getById(job.business_id);
    if (!listing || (listing.user_id !== user.id && user.role !== 'admin')) {
      throw BizError.forbidden('delete job', 'listing owner');
    }
  } else if (job.creator_user_id !== user.id && user.role !== 'admin') {
    throw BizError.forbidden('delete job', 'job creator');
  }

  // Delete job
  try {
    await jobService.delete(jobId);

    return createSuccessResponse({
      message: 'Job deleted successfully'
    }, 200);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error.userMessage || error.message, 400);
    }
    console.error('[JobAPI] Failed to delete job:', error);
    return createErrorResponse('Failed to delete job', 500);
  }
});
