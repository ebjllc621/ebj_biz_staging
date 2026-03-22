/**
 * Public Media Kit Download Route
 * GET /api/content/internet-personalities/[slug]/media-kit
 *
 * Redirects to the Cloudinary-hosted media kit PDF for the given profile.
 * Returns 404 if no media kit has been generated yet.
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - Public route: no auth required
 * - Only active profiles are accessible
 *
 * @authority CLAUDE.md - API Standards section
 * @tier STANDARD
 * @phase Tier 3 Creator Profiles - Phase 9C
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { NextResponse } from 'next/server';

// ============================================================================
// Helper: Extract slug from URL
// ============================================================================

function extractSlug(url: URL): string {
  const segments = url.pathname.split('/');
  // /api/content/internet-personalities/[slug]/media-kit
  const mediaKitIndex = segments.indexOf('media-kit');
  if (mediaKitIndex < 1) {
    throw BizError.badRequest('Invalid URL');
  }
  const slug = segments[mediaKitIndex - 1];
  if (!slug) {
    throw BizError.badRequest('Missing slug');
  }
  return slug;
}

// ============================================================================
// GET — Redirect to media kit PDF
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const slug = extractSlug(url);

  const db = getDatabaseService();
  const ipService = new InternetPersonalityService(db);
  const profile = await ipService.getPersonalityBySlug(slug);

  if (!profile || profile.status !== 'active') {
    throw BizError.notFound('Profile not found');
  }

  if (!profile.media_kit_url) {
    throw BizError.notFound('Media kit not yet generated');
  }

  return NextResponse.redirect(profile.media_kit_url, 302);
}, {
  allowedMethods: ['GET'],
  requireAuth: false,
});
