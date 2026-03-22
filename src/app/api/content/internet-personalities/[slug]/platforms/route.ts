/**
 * Public Platform Status Route
 * GET /api/content/internet-personalities/[slug]/platforms
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Public (no auth) — returns only public connection metadata
 * - NEVER returns tokens, metrics details, or user IDs
 *
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9B_INTERNET_PERSONALITY_PLATFORM_SYNC.md
 * @tier STANDARD
 * @phase Tier 3 Creator Profiles - Phase 9B-3
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { getPlatformSyncService } from '@core/services/PlatformSyncService';

function extractSlug(url: URL): string {
  const segments = url.pathname.split('/');
  const platformsIndex = segments.indexOf('platforms');
  if (platformsIndex < 2) throw BizError.badRequest('Invalid URL structure');
  const slug = segments[platformsIndex - 1];
  if (!slug) throw BizError.badRequest('Invalid slug');
  return slug;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const slug = extractSlug(url);

  const db = getDatabaseService();
  const ipService = new InternetPersonalityService(db);
  const personality = await ipService.getPersonalityBySlug(slug);

  if (!personality) {
    throw BizError.notFound('Internet personality not found');
  }

  const syncService = getPlatformSyncService();
  const connections = await syncService.getConnections('internet_personality', personality.id);

  // Return only public info — no tokens, no metrics details, no user IDs
  const platforms = connections.map(conn => ({
    platform: conn.platform,
    is_connected: conn.is_active,
    platform_username: conn.platform_username,
    last_synced_at: conn.last_synced_at ? conn.last_synced_at.toISOString() : null,
  }));

  return createSuccessResponse({ platforms }, context.requestId);
}, {
  allowedMethods: ['GET'],
});
