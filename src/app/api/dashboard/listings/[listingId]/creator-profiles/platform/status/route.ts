/**
 * Platform Connection Status Route
 * GET /api/dashboard/listings/[listingId]/creator-profiles/platform/status
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - requireAuth: true
 * - Listing ownership validation: MANDATORY
 * - NEVER returns tokens — only connection metadata and metrics
 *
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9B_INTERNET_PERSONALITY_PLATFORM_SYNC.md
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9B-2
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { getPlatformSyncService } from '@core/services/PlatformSyncService';
import type { ProfileSyncType } from '@core/types/platform-sync';

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  const listingsIndex = segments.indexOf('listings');
  if (listingsIndex < 0) throw BizError.badRequest('Invalid URL structure');
  const raw = segments[listingsIndex + 1];
  const id = parseInt(raw ?? '');
  if (!raw || isNaN(id)) throw BizError.badRequest('Invalid listing ID');
  return id;
}

async function verifyListingOwnership(listingId: number, userId: number): Promise<void> {
  const db = getDatabaseService();
  const result = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );
  const row = result.rows[0];
  if (!result.rows.length || !row || row.user_id !== userId) {
    throw BizError.forbidden('Not your listing');
  }
}

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  await verifyListingOwnership(listingId, user.id);

  const profileType = url.searchParams.get('profile_type') as ProfileSyncType | null;
  const profileIdRaw = url.searchParams.get('profile_id');
  const profileId = profileIdRaw ? parseInt(profileIdRaw) : null;

  if (!profileType || !['affiliate_marketer', 'internet_personality'].includes(profileType)) {
    throw BizError.badRequest('profile_type query param is required (affiliate_marketer | internet_personality)');
  }
  if (!profileId || isNaN(profileId)) {
    throw BizError.badRequest('profile_id query param is required and must be a number');
  }

  // Verify profile ownership
  const db = getDatabaseService();
  if (profileType === 'affiliate_marketer') {
    const amService = new AffiliateMarketerService(db);
    const profile = await amService.getMarketerById(profileId);
    if (!profile || profile.user_id !== user.id) throw BizError.forbidden('Profile does not belong to this user');
  } else {
    const ipService = new InternetPersonalityService(db);
    const profile = await ipService.getPersonalityById(profileId);
    if (!profile || profile.user_id !== user.id) throw BizError.forbidden('Profile does not belong to this user');
  }

  const syncService = getPlatformSyncService();
  const [connections, latestMetrics] = await Promise.all([
    syncService.getConnections(profileType, profileId),
    syncService.getLatestMetrics(profileType, profileId),
  ]);

  return createSuccessResponse({ connections, latestMetrics }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});
