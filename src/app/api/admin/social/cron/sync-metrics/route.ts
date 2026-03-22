/**
 * Social Media Metrics Sync CRON Endpoint
 *
 * POST /api/admin/social/cron/sync-metrics
 * Syncs platform metrics for all eligible posted content (every 6 hours)
 *
 * @phase Tier 5A Social Media Manager - Phase 9
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @reference src/app/api/admin/social/cron/process-scheduled/route.ts — Canon cron pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getSocialMediaService } from '@core/services/ServiceRegistry';
import { jsonMethodNotAllowed } from '@/lib/http/json';

async function syncMetricsHandler(context: ApiContext) {
  const socialService = getSocialMediaService();
  const result = await socialService.syncAllPostMetrics();

  // Fire-and-forget analytics
  try {
    const { getInternalAnalyticsService } = await import('@core/services/ServiceRegistry');
    const analytics = getInternalAnalyticsService();
    void analytics.trackEvent({
      eventName: 'social_metrics_sync_completed',
      eventData: { synced: result.synced, failed: result.failed, skipped: result.skipped },
    });
  } catch { /* fire-and-forget */ }

  return createSuccessResponse(
    {
      ...result,
    },
    context.requestId
  );
}

export const POST = apiHandler(syncMetricsHandler, {
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
