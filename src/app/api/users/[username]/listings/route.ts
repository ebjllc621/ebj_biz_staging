/**
 * User Listings API Route
 * GET /api/users/[username]/listings - Get associated listings for a user
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_4B_BRAIN_PLAN.md
 * @tier ADVANCED
 * @phase Phase 4B - Associated Listings Panel
 * @governance Build Map v2.1 ENHANCED
 */
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/bigint';

interface LatestReview {
  id: number;
  rating: number;
  title: string | null;
  review_text: string;
  created_at: string;
  user_display_name: string;
}

interface UserListingWithReviews {
  id: number;
  name: string;
  slug: string;
  type: string;
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  claimed: boolean;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  business_hours: Record<string, { openTime: string; closeTime: string }> | null;
  average_rating: number;
  review_count: number;
  latest_reviews: LatestReview[];
  user_role: 'owner' | 'manager' | 'user';
}

interface UserListingsResponse {
  listings: UserListingWithReviews[];
  total: number;
}

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Extract username from URL (Next.js 14 App Router pattern)
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const usernameIndex = pathParts.findIndex(part => part === 'users') + 1;
  const username = pathParts[usernameIndex];

  if (!username) {
    throw BizError.badRequest('Username is required');
  }

  const db = getDatabaseService();

  // Lookup user ID from username
  const userResult = await db.query<{ id: number }>(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [username]
  );

  if (userResult.rows.length === 0) {
    throw BizError.notFound('User not found');
  }

  const userId = userResult.rows[0]!.id;

  // Get listings via listing_users table (primary method)
  const listingUsersQuery = `
    SELECT
      l.id, l.name, l.slug, l.type, l.tier, l.claimed,
      l.city, l.state, l.latitude, l.longitude, l.address,
      l.logo_url, l.cover_image_url,
      l.phone, l.email, l.website, l.business_hours,
      lu.role as user_role
    FROM listings l
    INNER JOIN listing_users lu ON l.id = lu.listing_id
    WHERE lu.user_id = ? AND lu.status = 'active' AND l.status = 'active'
    ORDER BY CASE lu.role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, l.name ASC
  `;

  const listingUsersResults = await db.query<Omit<UserListingWithReviews, 'average_rating' | 'review_count' | 'latest_reviews'>>(listingUsersQuery, [userId]);

  // Get direct owner listings as fallback (legacy)
  const directOwnerQuery = `
    SELECT
      l.id, l.name, l.slug, l.type, l.tier, l.claimed,
      l.city, l.state, l.latitude, l.longitude, l.address,
      l.logo_url, l.cover_image_url,
      l.phone, l.email, l.website, l.business_hours,
      'owner' as user_role
    FROM listings l
    WHERE l.user_id = ? AND l.status = 'active'
    AND l.id NOT IN (SELECT listing_id FROM listing_users WHERE user_id = ?)
  `;

  const directOwnerResults = await db.query<Omit<UserListingWithReviews, 'average_rating' | 'review_count' | 'latest_reviews'>>(directOwnerQuery, [userId, userId]);

  // Combine results
  const allListings = [...listingUsersResults.rows, ...directOwnerResults.rows];

  if (allListings.length === 0) {
    return createSuccessResponse({ listings: [], total: 0 }, context.requestId);
  }

  // Get listing IDs for batch queries
  const listingIds = allListings.map(l => l.id);
  const placeholders = listingIds.map(() => '?').join(',');

  // Get review summaries
  const reviewSummaryQuery = `
    SELECT listing_id, AVG(rating) as average_rating, COUNT(*) as review_count
    FROM reviews
    WHERE listing_id IN (${placeholders}) AND status = 'approved'
    GROUP BY listing_id
  `;

  const reviewSummaries = await db.query<{
    listing_id: number;
    average_rating: number;
    review_count: bigint | number;
  }>(reviewSummaryQuery, listingIds);

  // Convert BigInt review counts
  const reviewSummaryMap = new Map(
    reviewSummaries.rows.map((rs: { listing_id: number; average_rating: number; review_count: bigint | number }) => [
      rs.listing_id,
      {
        average_rating: rs.average_rating,
        review_count: bigIntToNumber(rs.review_count)
      }
    ])
  );

  // Get latest reviews (max 3 per listing)
  const latestReviewsQuery = `
    SELECT
      r.id, r.listing_id, r.rating, r.title, r.review_text, r.created_at,
      COALESCE(u.display_name, u.username, 'Anonymous') as user_display_name
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.listing_id IN (${placeholders}) AND r.status = 'approved'
    ORDER BY r.rating DESC, r.created_at DESC
  `;

  const allReviews = await db.query<{
    id: number;
    listing_id: number;
    rating: number;
    title: string | null;
    review_text: string;
    created_at: Date;
    user_display_name: string;
  }>(latestReviewsQuery, listingIds);

  // Group reviews by listing (max 3 per listing)
  const reviewsByListing = new Map<number, LatestReview[]>();
  allReviews.rows.forEach((review: { id: number; listing_id: number; rating: number; title: string | null; review_text: string; created_at: Date; user_display_name: string }) => {
    if (!reviewsByListing.has(review.listing_id)) {
      reviewsByListing.set(review.listing_id, []);
    }
    const listingReviews = reviewsByListing.get(review.listing_id);
    if (listingReviews && listingReviews.length < 3) {
      listingReviews.push({
        id: review.id,
        rating: review.rating,
        title: review.title,
        review_text: review.review_text,
        created_at: review.created_at.toISOString(),
        user_display_name: review.user_display_name
      });
    }
  });

  // Assemble final listings with reviews
  const listings: UserListingWithReviews[] = allListings.map(listing => {
    const reviewSummary = reviewSummaryMap.get(listing.id) || { average_rating: 0, review_count: 0 };
    const latestReviews = reviewsByListing.get(listing.id) || [];

    return {
      id: listing.id,
      name: listing.name,
      slug: listing.slug,
      type: listing.type,
      tier: listing.tier,
      claimed: listing.claimed,
      city: listing.city,
      state: listing.state,
      latitude: listing.latitude,
      longitude: listing.longitude,
      address: listing.address,
      logo_url: listing.logo_url,
      cover_image_url: listing.cover_image_url,
      phone: listing.phone,
      email: listing.email,
      website: listing.website,
      business_hours: safeJsonParse(listing.business_hours, null),
      average_rating: reviewSummary.average_rating,
      review_count: reviewSummary.review_count,
      latest_reviews: latestReviews,
      user_role: listing.user_role
    };
  });

  return createSuccessResponse(
    {
      listings,
      total: listings.length
    } as UserListingsResponse,
    context.requestId
  );
}, {
  allowedMethods: ['GET']
});
