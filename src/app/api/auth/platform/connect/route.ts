/**
 * Platform OAuth Connect Route
 * POST /api/auth/platform/connect — Initiates OAuth authorization flow
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY (state-changing)
 * - requireAuth: true
 * - Returns authorization_url — client redirects browser to this URL
 * - NEVER stores tokens — only generates authorization URL
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
import type { SyncPlatform, ProfileSyncType } from '@core/types/platform-sync';

const VALID_PLATFORMS: SyncPlatform[] = ['youtube', 'instagram', 'tiktok'];
const VALID_PROFILE_TYPES: ProfileSyncType[] = ['affiliate_marketer', 'internet_personality'];

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const body = await context.request.json() as Record<string, unknown>;
  const { platform, profile_type, profile_id } = body;

  // Validate platform
  if (!platform || !VALID_PLATFORMS.includes(platform as SyncPlatform)) {
    throw BizError.badRequest(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`);
  }

  // Validate profile_type
  if (!profile_type || !VALID_PROFILE_TYPES.includes(profile_type as ProfileSyncType)) {
    throw BizError.badRequest(`profile_type must be one of: ${VALID_PROFILE_TYPES.join(', ')}`);
  }

  // Validate profile_id
  if (!profile_id || typeof profile_id !== 'number') {
    throw BizError.badRequest('profile_id is required and must be a number');
  }

  const syncPlatform = platform as SyncPlatform;
  const syncProfileType = profile_type as ProfileSyncType;
  const syncProfileId = profile_id as number;

  // Verify user owns the profile
  const db = getDatabaseService();
  if (syncProfileType === 'affiliate_marketer') {
    const amService = new AffiliateMarketerService(db);
    const profile = await amService.getMarketerById(syncProfileId);
    if (!profile || profile.user_id !== user.id) {
      throw BizError.forbidden('Profile does not belong to this user');
    }
  } else {
    const ipService = new InternetPersonalityService(db);
    const profile = await ipService.getPersonalityById(syncProfileId);
    if (!profile || profile.user_id !== user.id) {
      throw BizError.forbidden('Profile does not belong to this user');
    }
  }

  // Generate authorization URL
  const syncService = getPlatformSyncService();
  const authorizationUrl = syncService.getAuthorizationUrl(
    syncPlatform,
    syncProfileType,
    syncProfileId,
    user.id
  );

  return createSuccessResponse({ authorization_url: authorizationUrl }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
