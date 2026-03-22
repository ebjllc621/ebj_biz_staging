/**
 * Platform Manual Sync Route
 * POST /api/dashboard/listings/[listingId]/creator-profiles/platform/sync
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY (state-changing)
 * - requireAuth: true
 * - Listing ownership validation: MANDATORY
 * - Rate limited: max 1 manual sync per 15 minutes per profile
 *
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9B_INTERNET_PERSONALITY_PLATFORM_SYNC.md
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9B-2
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
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

const RATE_LIMIT_MINUTES = 15;

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  await verifyListingOwnership(listingId, user.id);

  const body = await context.request.json() as Record<string, unknown>;
  const { profile_type, profile_id } = body;

  if (!profile_type || !['affiliate_marketer', 'internet_personality'].includes(profile_type as string)) {
    throw BizError.badRequest('profile_type must be affiliate_marketer or internet_personality');
  }
  if (!profile_id || typeof profile_id !== 'number') {
    throw BizError.badRequest('profile_id is required and must be a number');
  }

  const syncProfileType = profile_type as ProfileSyncType;
  const syncProfileId = profile_id as number;

  // Verify profile ownership
  const db = getDatabaseService();
  if (syncProfileType === 'affiliate_marketer') {
    const amService = new AffiliateMarketerService(db);
    const profile = await amService.getMarketerById(syncProfileId);
    if (!profile || profile.user_id !== user.id) throw BizError.forbidden('Profile does not belong to this user');
  } else {
    const ipService = new InternetPersonalityService(db);
    const profile = await ipService.getPersonalityById(syncProfileId);
    if (!profile || profile.user_id !== user.id) throw BizError.forbidden('Profile does not belong to this user');
  }

  // Rate limit check: max 1 sync per 15 minutes per profile
  const rateResult = await db.query<{ last_synced_at: Date | null }>(
    `SELECT MAX(last_synced_at) AS last_synced_at
     FROM platform_oauth_tokens
     WHERE profile_type = ? AND profile_id = ? AND is_active = 1`,
    [syncProfileType, syncProfileId]
  );
  const lastSynced = rateResult.rows[0]?.last_synced_at;
  if (lastSynced) {
    const minutesSinceSync = (Date.now() - new Date(lastSynced).getTime()) / 60000;
    if (minutesSinceSync < RATE_LIMIT_MINUTES) {
      const waitMinutes = Math.ceil(RATE_LIMIT_MINUTES - minutesSinceSync);
      throw BizError.badRequest(`Sync rate limit: please wait ${waitMinutes} more minute(s)`);
    }
  }

  // Run sync
  const syncService = getPlatformSyncService();
  const result = await syncService.syncProfile(syncProfileType, syncProfileId);

  return createSuccessResponse(result, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
