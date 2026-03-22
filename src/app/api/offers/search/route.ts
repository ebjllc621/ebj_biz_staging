/**
 * GET /api/offers/search - Search offers endpoint
 *
 * @phase Phase 3 - Offers Page API Route Implementation
 * @pattern Following exact events/search + apiHandler pattern
 * @canonical Uses DatabaseService -> MariaDB (same as events/search)
 * @see docs/pages/layouts/offers/phases/PHASE_3_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Direct SQL queries with parameterized values
 * - Error handling: BizError-based validation errors
 * - Response format: createSuccessResponse with pagination
 *
 * Query parameters:
 * - page: number >= 1 (default 1) - Page number for pagination
 * - pageSize: number 1-50 (default 20) - Items per page
 * - sort: 'priority' | 'price_low' | 'price_high' | 'ending_soon' | 'discount' (default 'priority')
 * - q: optional string - Search query for title/description
 * - offerType: optional string - Filter by offer type (discount, coupon, product, service)
 * - category: optional string - Filter by category
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { DbResult } from '@core/types/db';

/**
 * Offer row type for search results (from offers table joined with listings)
 *
 * @schema docs/audits/phase/P3A/db/schema.sql (CREATE TABLE offers)
 *
 * Column names from offers table:
 * - offer_type: enum('discount','coupon','product','service')
 * - original_price, sale_price, discount_percentage
 * - start_date, end_date
 * - quantity_remaining
 * - status: enum('draft','active','paused','expired','sold_out')
 * - is_featured, is_mock
 *
 * Coordinates from listings table (offers don't have their own coordinates)
 */
interface OfferSearchRow {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  offer_type: 'discount' | 'coupon' | 'product' | 'service';
  original_price: number | null;
  sale_price: number | null;
  discount_percentage: number | null;
  image: string | null;
  thumbnail: string | null;
  start_date: string;
  end_date: string;
  quantity_remaining: number | null;
  is_featured: number;
  // Joined from listings table
  listing_name: string;
  listing_slug: string;
  listing_tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  listing_claimed: number;
  // Coordinates from listings table
  latitude: number | null;
  longitude: number | null;
}

/**
 * Search result item (transformed for API response)
 * Matches OfferWithCoordinates from Phase 2 types
 */
interface OfferSearchItem {
  id: number;
  title: string;
  slug: string;
  listing_id: number;
  listing_name: string;
  listing_slug: string;
  description?: string;
  offer_type: 'discount' | 'coupon' | 'product' | 'service';
  original_price?: number;
  sale_price?: number;
  discount_percentage?: number;
  image?: string;
  thumbnail?: string;
  start_date: Date;
  end_date: Date;
  quantity_remaining?: number;
  is_featured: boolean;
  latitude: number | null;
  longitude: number | null;
  listing_tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  listing_claimed: boolean;
}

/**
 * Search response data structure
 */
interface OffersSearchData {
  items: OfferSearchItem[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Allowed sort options
 */
type OfferSortOption = 'priority' | 'price_low' | 'price_high' | 'ending_soon' | 'discount';

/**
 * Allowed offer types
 */
type OfferTypeOption = 'discount' | 'coupon' | 'product' | 'service';

/**
 * Parse and validate search parameters from request
 */
function parseSearchParams(request: Request): {
  page: number;
  pageSize: number;
  sort: OfferSortOption;
  q?: string;
  offerType?: OfferTypeOption;
  category?: string;
} {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse page (default: 1, min: 1)
  let page = 1;
  const pageParam = searchParams.get('page');
  if (pageParam !== null) {
    const parsed = parseInt(pageParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'Page parameter must be a positive integer'
      });
    }
    page = parsed;
  }

  // Parse pageSize (default: 20, range: 1-50)
  let pageSize = 20;
  const pageSizeParam = searchParams.get('pageSize');
  if (pageSizeParam !== null) {
    const parsed = parseInt(pageSizeParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'PageSize parameter must be an integer between 1 and 50'
      });
    }
    pageSize = parsed;
  }

  // Parse sort (default: 'priority')
  let sort: OfferSortOption = 'priority';
  const sortParam = searchParams.get('sort');
  if (sortParam !== null) {
    const validSorts = ['priority', 'price_low', 'price_high', 'ending_soon', 'discount'];
    if (!validSorts.includes(sortParam)) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'Sort parameter must be "priority", "price_low", "price_high", "ending_soon", or "discount"'
      });
    }
    sort = sortParam as OfferSortOption;
  }

  // Parse search query (optional)
  const q = searchParams.get('q') || undefined;

  // Parse offerType (optional, validate if provided)
  let offerType: OfferTypeOption | undefined;
  const offerTypeParam = searchParams.get('offerType');
  if (offerTypeParam !== null) {
    const validTypes = ['discount', 'coupon', 'product', 'service'];
    if (!validTypes.includes(offerTypeParam)) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'OfferType parameter must be "discount", "coupon", "product", or "service"'
      });
    }
    offerType = offerTypeParam as OfferTypeOption;
  }

  // Parse category (optional)
  const category = searchParams.get('category') || undefined;

  return { page, pageSize, sort, q, offerType, category };
}

/**
 * GET /api/offers/search
 * Search offers with pagination, sorting, and filtering
 *
 * Following exact pattern from /api/events/search which WORKS:
 * - apiHandler wrapper for error handling
 * - DatabaseService for data access
 * - createSuccessResponse for response formatting
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Parse and validate query parameters
  const { page, pageSize, sort, q, offerType, category } = parseSearchParams(context.request);

  // Get database service (canonical pattern)
  const db = getDatabaseService();

  // Build WHERE clause - only active, non-expired, non-mock offers
  const whereClauses = [
    `o.status = 'active'`,
    `o.end_date > NOW()`,
    `o.is_mock = 0`
  ];
  const params: (string | number)[] = [];

  // Search filter
  if (q) {
    whereClauses.push(`(o.title LIKE ? OR o.description LIKE ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }

  // Offer type filter
  if (offerType) {
    whereClauses.push(`o.offer_type = ?`);
    params.push(offerType);
  }

  // Category filter (if offers have category - via listing)
  if (category) {
    whereClauses.push(`l.category = ?`);
    params.push(category);
  }

  const whereSQL = whereClauses.join(' AND ');

  // Build ORDER BY based on sort option
  let orderSQL: string;
  switch (sort) {
    case 'price_low':
      // Sale price first, then original price (for offers without sale price)
      orderSQL = 'COALESCE(o.sale_price, o.original_price) ASC';
      break;
    case 'price_high':
      orderSQL = 'COALESCE(o.sale_price, o.original_price) DESC';
      break;
    case 'ending_soon':
      orderSQL = 'o.end_date ASC';
      break;
    case 'discount':
      // Highest discount first, then by featured
      orderSQL = 'o.discount_percentage DESC, o.is_featured DESC';
      break;
    case 'priority':
    default:
      // Priority: featured first, then by listing tier (premium > preferred > plus > essentials)
      orderSQL = `o.is_featured DESC,
        CASE l.tier
          WHEN 'premium' THEN 4
          WHEN 'preferred' THEN 3
          WHEN 'plus' THEN 2
          ELSE 1
        END DESC,
        o.created_at DESC`;
      break;
  }

  // Calculate offset
  const offset = (page - 1) * pageSize;

  // Get total count
  // GOVERNANCE: mariadb returns BigInt for COUNT(*) - must convert to Number for JSON serialization
  const countResult: DbResult<{ total: bigint | number }> = await db.query<{ total: bigint | number }>(
    `SELECT COUNT(*) as total FROM offers o
     INNER JOIN listings l ON o.listing_id = l.id
     WHERE ${whereSQL}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.total);

  // Get paginated offers with listing info
  // NOTE: Offers don't have their own coordinates - they inherit from listings
  const offersResult: DbResult<OfferSearchRow> = await db.query<OfferSearchRow>(
    `SELECT
      o.id,
      o.listing_id,
      o.title,
      o.slug,
      o.description,
      o.offer_type,
      o.original_price,
      o.sale_price,
      o.discount_percentage,
      o.image,
      o.thumbnail,
      o.start_date,
      o.end_date,
      o.quantity_remaining,
      o.is_featured,
      l.name as listing_name,
      l.slug as listing_slug,
      l.tier as listing_tier,
      l.claimed as listing_claimed,
      l.latitude,
      l.longitude
    FROM offers o
    INNER JOIN listings l ON o.listing_id = l.id
    WHERE ${whereSQL}
    ORDER BY ${orderSQL}
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  // Transform results to match OfferWithCoordinates interface
  const items: OfferSearchItem[] = offersResult.rows.map((row: OfferSearchRow) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    listing_id: row.listing_id,
    listing_name: row.listing_name,
    listing_slug: row.listing_slug,
    description: row.description ?? undefined,
    offer_type: row.offer_type,
    original_price: row.original_price ?? undefined,
    sale_price: row.sale_price ?? undefined,
    discount_percentage: row.discount_percentage ?? undefined,
    image: row.image ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    start_date: new Date(row.start_date),
    end_date: new Date(row.end_date),
    quantity_remaining: row.quantity_remaining ?? undefined,
    is_featured: Boolean(row.is_featured),
    latitude: row.latitude !== null ? parseFloat(String(row.latitude)) : null,
    longitude: row.longitude !== null ? parseFloat(String(row.longitude)) : null,
    listing_tier: row.listing_tier,
    listing_claimed: Boolean(row.listing_claimed)
  }));

  // Build response data
  const data: OffersSearchData = {
    items,
    page,
    pageSize,
    total,
    hasNext: (offset + pageSize) < total,
    hasPrev: page > 1
  };

  return createSuccessResponse(data, context.requestId);
}, {
  allowedMethods: ['GET']
});
