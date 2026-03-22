/**
 * Listing Cover Image Update API Route
 * PUT /api/listings/[id]/cover - Update listing cover image URL
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - UMM integration: Accepts Cloudinary URL from /api/media/upload
 *
 * @authority CLAUDE.md - API Standards section
 * @authority universal-media-manager.mdc - UMM compliance
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { NextRequest } from 'next/server';

/**
 * PUT /api/listings/[id]/cover
 * Update listing cover image URL (after UMM upload)
 * Body:
 *   - cover_image_url: Cover image URL from Cloudinary (required)
 *
 * @authenticated User authentication required (listing owner or admin)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'cover')
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
  }

  // Get current user
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  // Parse request body
  const body = await context.request.json();
  const coverImageUrl = body.cover_image_url;

  if (!coverImageUrl) {
    throw BizError.badRequest('cover_image_url is required');
  }

  // Get listing service and update
  const listingService = getListingService();

  // Verify ownership (admin can update any listing)
  const listing = await listingService.getById(listingId);
  if (!listing) {
    throw BizError.notFound('Listing', listingId);
  }

  if (listing.user_id !== user.id && user.role !== 'admin') {
    throw BizError.forbidden('update listing cover image', 'listing');
  }

  // Update cover image URL
  await listingService.updateCoverImageUrl(listingId, coverImageUrl);

  return createSuccessResponse({
    message: 'Cover image updated successfully',
    cover_image_url: coverImageUrl
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PUT']
}));
