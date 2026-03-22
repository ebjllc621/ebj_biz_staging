/**
 * Job Seeker Profile API Route
 *
 * GET /api/jobs/profile - Get current user's job seeker profile
 * POST /api/jobs/profile - Create job seeker profile
 * PUT /api/jobs/profile - Update job seeker profile
 * DELETE /api/jobs/profile - Delete job seeker profile
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Service boundary: JobSeekerProfileService
 * - Authentication: REQUIRED
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getJobSeekerProfileService } from '@core/services/JobSeekerProfileService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { CreateJobSeekerProfileInput, UpdateJobSeekerProfileInput } from '@features/jobs/types';

/**
 * GET /api/jobs/profile
 * Get current user's job seeker profile
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const profileService = getJobSeekerProfileService();
  const profile = await profileService.getProfileByUserId(user.id);

  if (!profile) {
    return createErrorResponse('Job seeker profile not found', 404);
  }

  return createSuccessResponse({ profile }, 200);
});

/**
 * POST /api/jobs/profile
 * Create job seeker profile
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const body = await request.json() as CreateJobSeekerProfileInput;

  const profileService = getJobSeekerProfileService();
  const profile = await profileService.createProfile(user.id, body);

  return createSuccessResponse({ profile }, 201);
});

/**
 * PUT /api/jobs/profile
 * Update job seeker profile
 */
export const PUT = apiHandler(async (context) => {
  const { request } = context;

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const body = await request.json() as UpdateJobSeekerProfileInput;

  const profileService = getJobSeekerProfileService();
  const profile = await profileService.updateProfile(user.id, body);

  return createSuccessResponse({ profile }, 200);
});

/**
 * DELETE /api/jobs/profile
 * Delete job seeker profile
 */
export const DELETE = apiHandler(async (context) => {
  const { request } = context;

  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const profileService = getJobSeekerProfileService();
  await profileService.deleteProfile(user.id);

  return createSuccessResponse({ message: 'Job seeker profile deleted successfully' }, 200);
});
