/**
 * Dashboard Media Kit Generation API Route
 * POST /api/dashboard/listings/[listingId]/creator-profiles/media-kit
 *
 * Generates media kit PDF, uploads to Cloudinary, updates media_kit_url on profile.
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations (POST)
 * - getUserFromRequest: MANDATORY for auth
 * - DatabaseService boundary: All DB operations via service layer
 * - Listing ownership validation required
 * - Creator Suite add-on validation required
 *
 * @authority CLAUDE.md - API Standards section
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9C
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { v2 as cloudinary } from 'cloudinary';
import { getMediaKitBuffer } from '@core/utils/export/mediaKitPdfGenerator';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/creator-profiles/media-kit
  const creatorProfilesIndex = segments.indexOf('creator-profiles');
  if (creatorProfilesIndex < 2) {
    throw BizError.badRequest('Invalid URL structure');
  }
  const raw = segments[creatorProfilesIndex - 1];
  const id = parseInt(raw ?? '');
  if (!raw || isNaN(id)) {
    throw BizError.badRequest('Invalid listing ID');
  }
  return id;
}

// ============================================================================
// Helper: Verify user owns the listing
// ============================================================================

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

// ============================================================================
// Helper: Verify Creator Suite add-on is active
// ============================================================================

async function verifyCreatorSuite(listingId: number): Promise<void> {
  const db = getDatabaseService();
  const result = await db.query<{ id: number }>(
    `SELECT lsa.id
     FROM listing_subscription_addons lsa
     JOIN listing_subscriptions ls ON lsa.listing_subscription_id = ls.id
     JOIN addon_suites as2 ON lsa.addon_suite_id = as2.id
     WHERE ls.listing_id = ?
       AND as2.suite_name = 'creator'
       AND lsa.status = 'active'
     LIMIT 1`,
    [listingId]
  );
  if (!result.rows.length) {
    throw BizError.forbidden('Creator Suite add-on required to manage creator profiles');
  }
}

// ============================================================================
// POST — Generate and upload media kit PDF
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);
  await verifyCreatorSuite(listingId);

  const body = await context.request.json() as { profile_id?: number };
  const profileId = body.profile_id;
  if (!profileId || typeof profileId !== 'number') {
    throw BizError.badRequest('profile_id is required');
  }

  const db = getDatabaseService();
  const ipService = new InternetPersonalityService(db);

  // Verify profile ownership
  const profile = await ipService.getPersonalityById(profileId);
  if (!profile || profile.user_id !== user.id) {
    throw BizError.forbidden('Profile does not belong to this user');
  }

  // Assemble media kit data
  const mediaKitData = await ipService.getMediaKitData(profileId);

  // Generate PDF buffer
  const buffer = getMediaKitBuffer(mediaKitData);

  // Upload to Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const result = await cloudinary.uploader.upload(
    `data:application/pdf;base64,${Buffer.from(buffer).toString('base64')}`,
    {
      resource_type: 'raw',
      folder: 'media-kits',
      public_id: `${profile.slug || String(profileId)}-media-kit`,
      overwrite: true,
      format: 'pdf',
    }
  );

  // Update profile with media kit URL
  await ipService.updateMediaKitUrl(profileId, result.secure_url);

  return createSuccessResponse({ media_kit_url: result.secure_url }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
