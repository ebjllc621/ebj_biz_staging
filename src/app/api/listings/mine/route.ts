/**
 * User's Listings API Route
 * GET /api/listings/mine - Get current user's listings with completeness
 *
 * @authority docs/pages/layouts/listings/details/claim/phases/PHASE_7_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Phase 7 - User Dashboard Integration
 */
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { calculateListingCompleteness } from '@features/listings/utils/calculateListingCompleteness';

interface UserListingResponse {
  id: number;
  name: string;
  slug: string;
  tier: string;
  status: string;
  approved: string;
  logo_url: string | null;
  last_update: string;
  completeness_percent: number;
  claimed: boolean;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const listingService = getListingService();
  const listings = await listingService.getByUserId(user.id);

  const listingsWithCompleteness: UserListingResponse[] = listings.map(listing => {
    const completion = calculateListingCompleteness(listing);
    return {
      id: listing.id,
      name: listing.name,
      slug: listing.slug,
      tier: listing.tier,
      status: listing.status,
      approved: listing.approved,
      logo_url: listing.logo_url,
      last_update: listing.last_update?.toISOString() || listing.updated_at?.toISOString() || '',
      completeness_percent: completion.percentage,
      claimed: listing.claimed
    };
  });

  return createSuccessResponse({
    listings: listingsWithCompleteness,
    pagination: {
      page: 1,
      limit: listingsWithCompleteness.length,
      total: listingsWithCompleteness.length,
      totalPages: 1
    }
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
