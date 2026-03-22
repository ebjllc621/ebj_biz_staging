/**
 * Listing Duplicate API Route - POST create a draft copy of a listing
 *
 * @tier STANDARD
 * @phase Phase 4A - Listing Lifecycle (Pause/Resume, Draft, Duplicate)
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_4A_BRAIN_PLAN.md
 */

import { getListingDuplicateService } from '@core/services/ListingDuplicateService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { ListingNotFoundError, UnauthorizedAccessError } from '@core/services/ListingService';

// ============================================================================
// POST - Duplicate a listing as a draft copy (owner only)
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

  // Extract listing ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // pathSegments: ['', 'api', 'listings', '[id]', 'duplicate']
  const listingIdStr = pathSegments[pathSegments.length - 2] || '';
  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid listing ID'),
      400
    );
  }

  // Parse optional overrides from body
  const overrides: { name?: string; slug?: string } = {};
  try {
    const body = await request.json();
    if (body && typeof body === 'object') {
      if (typeof body.name === 'string') overrides.name = body.name;
      if (typeof body.slug === 'string') overrides.slug = body.slug;
    }
  } catch {
    // No body or invalid JSON — use defaults
  }

  const duplicateService = getListingDuplicateService();

  try {
    const result = await duplicateService.duplicateListing(listingId, user.id, overrides);
    return createSuccessResponse({ id: result.id, slug: result.slug }, 201);
  } catch (error) {
    if (error instanceof ListingNotFoundError) {
      return createErrorResponse(error, 404);
    }
    if (error instanceof UnauthorizedAccessError) {
      return createErrorResponse(error, 403);
    }
    throw error;
  }
});
