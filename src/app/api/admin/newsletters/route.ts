/**
 * Admin Newsletter List API Route
 * GET /api/admin/newsletters — List newsletters with admin filters and enrichment
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse with explicit entity key (newsletters)
 * - DatabaseService boundary compliance
 * - bigIntToNumber: ALL COUNT(*) queries
 * - NewsletterService instantiated directly (not in ServiceRegistry)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 2 Content Types - Phase N6
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';
import type { NewsletterFilters } from '@core/types/newsletter';
import { NewsletterStatus } from '@core/types/newsletter';

// ============================================================================
// Types
// ============================================================================

interface CategoryRow {
  name: string;
}

interface ListingRow {
  name: string;
}

interface ReferralCountRow {
  count: bigint | number;
}

interface SubscriberCountRow {
  total: bigint | number;
}

// ============================================================================
// GET /api/admin/newsletters
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin newsletters', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const status = searchParams.get('status');
  const is_featured = searchParams.get('is_featured');
  const q = searchParams.get('q');

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // Build NewsletterFilters
  const filters: NewsletterFilters = {};
  if (status) filters.status = status as NewsletterStatus;
  if (is_featured === '1') filters.is_featured = true;
  if (is_featured === '0') filters.is_featured = false;
  if (q) filters.searchQuery = q;

  const pagination = { page, pageSize: limit };

  // Instantiate services
  const db = getDatabaseService();
  const newsletterService = new NewsletterService(db);

  // Fetch newsletters
  const result = await newsletterService.getNewsletters(filters, pagination);

  const items = result.data;
  const total = result.pagination.total;

  // Enrich each item with category_name, listing_name, recommendation_count, subscriber_count
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      let category_name: string | undefined;
      let listing_name: string | undefined;
      let recommendation_count = 0;
      let subscriber_count = 0;

      // Fetch category name
      if (item.category_id) {
        const catResult = await db.query<CategoryRow>(
          'SELECT name FROM categories WHERE id = ?',
          [item.category_id]
        );
        category_name = catResult.rows?.[0]?.name;
      }

      // Fetch listing name
      if (item.listing_id) {
        const listingResult = await db.query<ListingRow>(
          'SELECT name FROM listings WHERE id = ?',
          [item.listing_id]
        );
        listing_name = listingResult.rows?.[0]?.name;
      }

      // Fetch recommendation count
      const refResult = await db.query<ReferralCountRow>(
        'SELECT COUNT(*) as count FROM user_referrals WHERE entity_type = ? AND entity_id = ?',
        ['newsletter', item.id]
      );
      recommendation_count = bigIntToNumber(refResult.rows?.[0]?.count ?? 0);

      // Fetch active subscriber count for this newsletter's listing
      if (item.listing_id) {
        const subResult = await db.query<SubscriberCountRow>(
          'SELECT COUNT(*) as total FROM newsletter_subscribers WHERE listing_id = ? AND status = ?',
          [item.listing_id, 'active']
        );
        subscriber_count = bigIntToNumber(subResult.rows?.[0]?.total ?? 0);
      }

      return {
        ...item,
        category_name,
        listing_name,
        recommendation_count,
        subscriber_count,
      };
    })
  );

  return createSuccessResponse({
    newsletters: enrichedItems,
    pagination: {
      page,
      pageSize: limit,
      total,
    },
  });
});
