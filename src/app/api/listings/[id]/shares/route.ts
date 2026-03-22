/**
 * Listing Shares API Route - POST record share, GET analytics
 *
 * @tier STANDARD
 * @phase Phase 1A - Listing Social Sharing Infrastructure
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_1A_BRAIN_PLAN.md
 */

import { getSocialShareService } from '@core/services/SocialShareService';
import { getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';

// Share type: business owner sharing their own listing vs consumer sharing
type ListingShareType = 'business_owner' | 'consumer';

// Supported share platforms
type ListingSharePlatform =
  | 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'nextdoor'
  | 'whatsapp' | 'sms' | 'email' | 'copy_link';

// ============================================================================
// POST - Record a share action
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // pathSegments: ['', 'api', 'listings', '[id]', 'shares']
  const listingIdStr = pathSegments[pathSegments.length - 2] || '';
  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid listing ID'),
      400
    );
  }

  // Parse request body
  let body: { platform: ListingSharePlatform; share_type?: ListingShareType };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid JSON body'),
      400
    );
  }

  const { platform, share_type = 'consumer' } = body;

  // Validate platform
  const validPlatforms: ListingSharePlatform[] = [
    'facebook', 'instagram', 'twitter', 'linkedin', 'nextdoor',
    'whatsapp', 'sms', 'email', 'copy_link'
  ];

  if (!platform || !validPlatforms.includes(platform)) {
    return createErrorResponse(
      BizError.badRequest('Invalid share platform'),
      400
    );
  }

  // Validate share_type
  const validShareTypes: ListingShareType[] = ['business_owner', 'consumer'];
  if (!validShareTypes.includes(share_type)) {
    return createErrorResponse(
      BizError.badRequest('Invalid share type'),
      400
    );
  }

  // Verify listing exists
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);
  if (!listing) {
    return createErrorResponse(
      BizError.notFound('Listing', listingId),
      404
    );
  }

  // Use SocialShareService to generate share URL with UTM params
  const socialShareService = getSocialShareService();
  const { shareUrl, shortUrl } = await socialShareService.generateShortShareUrl({
    entityType: 'listing',
    entityId: listingId,
    slug: listing.slug,
    platform,
  });

  return createSuccessResponse({
    share: {
      listing_id: listingId,
      user_id: user.id,
      share_type,
      platform,
      share_url: shareUrl,
      short_url: shortUrl,
    }
  }, 201);
});

// ============================================================================
// GET - Get share analytics for a listing
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Auth required
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const listingIdStr = pathSegments[pathSegments.length - 2] || '';
  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid listing ID'),
      400
    );
  }

  // Get ListingService
  const listingService = getListingService();

  // Verify listing exists
  const listing = await listingService.getById(listingId);
  if (!listing) {
    return createErrorResponse(
      BizError.notFound('Listing', listingId),
      404
    );
  }

  // Authorization: Only listing owner or admin can view analytics
  if (user.role !== 'admin') {
    if (!listing.user_id || listing.user_id !== user.id) {
      return createErrorResponse(
        BizError.forbidden('You are not authorized to view this listing\'s analytics'),
        403
      );
    }
  }

  // Use SocialShareService for entity-agnostic analytics
  const socialShareService = getSocialShareService();
  const analytics = await socialShareService.getShareAnalytics('listing', listingId);

  return createSuccessResponse({ analytics }, 200);
});
