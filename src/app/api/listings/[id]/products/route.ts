/**
 * Products API Routes - GET /api/listings/[id]/products
 *
 * @authority Phase 4 Brain Plan - Products API
 * @governance Public access (returns visible products only)
 * @pattern Exact replication of /api/listings/[id]/team pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/listings/[id]/products
 * Get all products for a listing
 *
 * @public No authentication required (returns visible products only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Extract listing ID from URL
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const listingIdStr = segments[segments.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required', {});
  }

  const listingId = parseInt(listingIdStr);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: listingIdStr });
  }

  const db = getDatabaseService();

  // Get visible products ordered by display_order and created_at
  const result = await db.query(
    `SELECT
      id, listing_id, name, description, price, price_display,
      image_url, category, sku, is_featured, is_visible, display_order,
      created_at, updated_at
    FROM listing_products
    WHERE listing_id = ? AND is_visible = TRUE
    ORDER BY is_featured DESC, display_order ASC, created_at DESC`,
    [listingId]
  );

  return createSuccessResponse({ products: result.rows }, context.requestId);
}, {
  allowedMethods: ['GET']
});
