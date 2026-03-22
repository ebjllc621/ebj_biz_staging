/**
 * Job Share Recording API Route
 *
 * POST /api/jobs/[id]/shares - Record a share event
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Authentication: Optional (captures user_id if authenticated)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Analytics Dashboard
 */

import { getJobService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { ShareType, SharePlatform } from '@features/jobs/types';

interface ShareRequestBody {
  share_type: ShareType;
  platform: SharePlatform;
  share_url: string;
}

/**
 * POST /api/jobs/[id]/shares
 * Record a share event for analytics tracking
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../jobs/[id]/shares

  if (!id) {
    return createErrorResponse('Job ID is required', 400);
  }

  const jobId = parseInt(id);
  if (isNaN(jobId)) {
    return createErrorResponse('Invalid job ID', 400);
  }

  const jobService = getJobService();
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  let body: ShareRequestBody;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  if (!body.platform || !body.share_type || !body.share_url) {
    return createErrorResponse('platform, share_type, and share_url are required', 400);
  }

  const user = await getUserFromRequest(request);

  await jobService.recordShare({
    job_id: jobId,
    user_id: user?.id,
    share_type: body.share_type,
    platform: body.platform,
    share_url: body.share_url
  });

  return createSuccessResponse({ message: 'Share recorded' }, 201);
});
