/**
 * Job Media API Routes
 *
 * GET /api/jobs/[id]/media - Get all media for a job
 * POST /api/jobs/[id]/media - Add media to a job (requires auth)
 * PATCH /api/jobs/[id]/media - Reorder media (requires auth)
 * DELETE /api/jobs/[id]/media?mediaId=X - Delete specific media (requires auth)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Service boundary: JobService
 * - CSRF protection: withCsrf for mutations
 * - Auth: getUserFromRequest for authenticated routes
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Media Upload
 */

import { getJobService } from '@core/services/ServiceRegistry';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * Extract job ID from URL path
 */
function extractJobIdFromUrl(url: URL): number | null {
  const pathParts = url.pathname.split('/');
  // Path is /api/jobs/[id]/media, so id is at index -2 from end
  const idIndex = pathParts.indexOf('media') - 1;
  if (idIndex < 0) return null;
  const idStr = pathParts[idIndex];
  if (!idStr) return null;
  const id = parseInt(idStr);
  return isNaN(id) ? null : id;
}

/**
 * GET /api/jobs/[id]/media
 * Get all media for a job
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const jobId = extractJobIdFromUrl(url);

  if (!jobId) {
    return createErrorResponse('Invalid job ID', 400);
  }

  const jobService = getJobService();

  // Verify job exists
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  const media = await jobService.getMedia(jobId);
  const limits = await jobService.getMediaLimits(jobId);

  return createSuccessResponse({
    media,
    limits
  }, 200);
});

/**
 * POST /api/jobs/[id]/media
 * Add media to a job (requires auth + job ownership)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(context.request.url);
  const jobId = extractJobIdFromUrl(url);

  if (!jobId) {
    return createErrorResponse('Invalid job ID', 400);
  }

  const body = await context.request.json();
  const { media_type, file_url, alt_text, embed_url, platform, source } = body;

  if (!media_type || !['image', 'video'].includes(media_type)) {
    return createErrorResponse('media_type must be "image" or "video"', 400);
  }

  if (!file_url) {
    return createErrorResponse('file_url is required', 400);
  }

  const jobService = getJobService();

  // Verify job exists
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Verify job ownership
  if (job.creator_user_id !== user.id) {
    return createErrorResponse('Not authorized to modify this job', 403);
  }

  const media = await jobService.addMedia(jobId, {
    media_type,
    file_url,
    alt_text,
    embed_url: embed_url ?? null,
    platform: platform ?? null,
    source: source ?? null,
  });

  return createSuccessResponse({
    media,
    message: 'Media added successfully'
  }, 201);
}));

/**
 * PATCH /api/jobs/[id]/media
 * Reorder media items (requires auth + job ownership)
 * Body: { mediaIds: number[] }
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(context.request.url);
  const jobId = extractJobIdFromUrl(url);

  if (!jobId) {
    return createErrorResponse('Invalid job ID', 400);
  }

  const body = await context.request.json();
  const { mediaIds } = body;

  if (!Array.isArray(mediaIds)) {
    return createErrorResponse('mediaIds array is required', 400);
  }

  const jobService = getJobService();

  // Verify job exists
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Verify job ownership
  if (job.creator_user_id !== user.id) {
    return createErrorResponse('Not authorized to modify this job', 403);
  }

  await jobService.reorderMedia(jobId, mediaIds);

  // Return updated media list
  const media = await jobService.getMedia(jobId);

  return createSuccessResponse({
    media,
    message: 'Media reordered successfully'
  }, 200);
}));

/**
 * DELETE /api/jobs/[id]/media?mediaId=X
 * Delete specific media (requires auth + job ownership)
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(context.request.url);
  const jobId = extractJobIdFromUrl(url);
  const mediaId = parseInt(url.searchParams.get('mediaId') || '');

  if (!jobId) {
    return createErrorResponse('Invalid job ID', 400);
  }

  if (isNaN(mediaId)) {
    return createErrorResponse('mediaId query parameter is required', 400);
  }

  const jobService = getJobService();

  // Verify job exists
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Verify job ownership
  if (job.creator_user_id !== user.id) {
    return createErrorResponse('Not authorized to modify this job', 403);
  }

  // Verify media belongs to this job
  const mediaItem = await jobService.getMediaById(mediaId);
  if (!mediaItem || mediaItem.job_id !== jobId) {
    return createErrorResponse('Media not found for this job', 404);
  }

  await jobService.deleteMedia(mediaId);

  return createSuccessResponse({
    message: 'Media deleted successfully'
  }, 200);
}));
