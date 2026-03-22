/**
 * Social Media Scheduled Post Processor CRON Endpoint
 *
 * POST /api/admin/social/cron/process-scheduled
 * Processes all due scheduled posts by calling postToSocial() for each.
 *
 * @phase Tier 5A Social Media Manager - Phase 7
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getSocialMediaService } from '@core/services/ServiceRegistry';
import { jsonMethodNotAllowed } from '@/lib/http/json';

async function processScheduledHandler(context: ApiContext) {
  const socialService = getSocialMediaService();
  const result = await socialService.processScheduledPosts();

  return createSuccessResponse(
    {
      ...result,
    },
    context.requestId
  );
}

export const POST = apiHandler(processScheduledHandler, {
  requireAuth: true,
  rbac: { action: 'write', resource: 'notification_admin' },
});

// Method guards
const ALLOWED_METHODS = ['POST'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
