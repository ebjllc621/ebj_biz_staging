/**
 * Job Save/Bookmark API Route
 *
 * POST /api/jobs/[id]/save - Save (bookmark) a job
 * DELETE /api/jobs/[id]/save - Remove saved job
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Required
 * - Response format: createSuccessResponse/createErrorResponse
 * - Direct database operations for user_saved_jobs junction table
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */

import { getDatabaseService, getJobService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/jobs/[id]/save
 * Check if the authenticated user has saved this job
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../jobs/[id]/save

  if (!id) {
    return createErrorResponse('Job ID is required', 400);
  }

  const jobId = parseInt(id);
  if (isNaN(jobId)) {
    return createErrorResponse('Invalid job ID', 400);
  }

  // Check authentication (optional - return false if not logged in)
  const user = await getUserFromRequest(request);
  if (!user) {
    return createSuccessResponse({ is_saved: false });
  }

  // Check if job is saved
  const db = getDatabaseService();
  const result = await db.query<{ count: bigint }>(
    'SELECT COUNT(*) as count FROM user_saved_jobs WHERE user_id = ? AND job_id = ?',
    [user.id, jobId]
  );

  const isSaved = Number(result.rows[0]?.count || 0) > 0;

  return createSuccessResponse({ is_saved: isSaved });
});

/**
 * POST /api/jobs/[id]/save
 * Save (bookmark) a job for the authenticated user
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../jobs/[id]/save

  if (!id) {
    return createErrorResponse('Job ID is required', 400);
  }

  const jobId = parseInt(id);
  if (isNaN(jobId)) {
    return createErrorResponse('Invalid job ID', 400);
  }

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Verify job exists
  const jobService = getJobService();
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Insert saved job (ignore duplicates)
  const db = getDatabaseService();
  try {
    await db.query(
      `INSERT INTO user_saved_jobs (user_id, job_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [user.id, jobId]
    );
  } catch (error) {
    console.error('[JobAPI] Failed to save job:', error);
    return createErrorResponse('Failed to save job', 500);
  }

  return createSuccessResponse({
    message: 'Job saved successfully',
    job_id: jobId
  }, 200);
});

/**
 * DELETE /api/jobs/[id]/save
 * Remove saved job for the authenticated user
 */
export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../jobs/[id]/save

  if (!id) {
    return createErrorResponse('Job ID is required', 400);
  }

  const jobId = parseInt(id);
  if (isNaN(jobId)) {
    return createErrorResponse('Invalid job ID', 400);
  }

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Delete saved job
  const db = getDatabaseService();
  try {
    await db.query(
      'DELETE FROM user_saved_jobs WHERE user_id = ? AND job_id = ?',
      [user.id, jobId]
    );
  } catch (error) {
    console.error('[JobAPI] Failed to remove saved job:', error);
    return createErrorResponse('Failed to remove saved job', 500);
  }

  return createSuccessResponse({
    message: 'Job removed from saved list',
    job_id: jobId
  }, 200);
});
