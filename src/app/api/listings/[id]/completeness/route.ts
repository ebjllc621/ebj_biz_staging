/**
 * Listing Completeness API Route
 *
 * GET /api/listings/[id]/completeness
 * Returns listing completion percentage and missing fields.
 *
 * @authority docs/pages/layouts/listings/details/claim/phases/PHASE_6_BRAIN_PLAN.md
 * @tier API_ROUTE
 * @phase Phase 6 - Listing Completeness Indicator
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingService } from '@core/services/ServiceRegistry';
import { calculateListingCompleteness } from '@features/listings/utils/calculateListingCompleteness';
import { BizError } from '@core/errors/BizError';

/**
 * GET handler - Get listing completeness
 * Public endpoint (no authentication required)
 */
export const GET = apiHandler(
  async (context: ApiContext) => {
    // Extract listing ID from URL pathname
    const url = new URL(context.request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 2]; // Get ID from path (before 'completeness')

    if (!id) {
      throw BizError.badRequest('Listing ID is required');
    }

    const listingId = parseInt(id, 10);

    if (isNaN(listingId)) {
      throw BizError.badRequest('Invalid listing ID', { id });
    }

    // Get listing service
    const listingService = getListingService();

    // Fetch listing data
    const listing = await listingService.getById(listingId);

    if (!listing) {
      throw BizError.notFound('Listing', listingId);
    }

    // Calculate completeness
    const completion = calculateListingCompleteness(listing);

    // Return completion data
    return createSuccessResponse({
      listingId,
      percentage: completion.percentage,
      missingRequired: completion.missingRequired.map(f => ({
        key: f.key,
        label: f.label,
        weight: f.weight
      })),
      missingOptional: completion.missingOptional.map(f => ({
        key: f.key,
        label: f.label,
        weight: f.weight
      })),
      completedRequired: completion.completedRequired,
      completedOptional: completion.completedOptional,
      totalRequired: completion.totalRequired,
      totalOptional: completion.totalOptional
    }, context.requestId);
  },
  {
    requireAuth: false // Public endpoint
  }
);
