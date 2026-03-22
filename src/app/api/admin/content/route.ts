/**
 * Admin Content List API Route
 * GET /api/admin/content — List content with admin filters
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse with explicit entity keys
 * - DatabaseService boundary compliance
 * - bigIntToNumber: ALL COUNT(*) queries
 *
 * @authority CLAUDE.md - API Standards
 * @phase Content Phase 4A
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { getContentService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';
import { ContentFilters, ContentStatus } from '@core/services/ContentService';

// ============================================================================
// Types
// ============================================================================

type ContentTab = 'articles' | 'podcasts' | 'videos';

interface CategoryRow {
  name: string;
}

interface ListingRow {
  name: string;
}

interface ReferralCountRow {
  count: bigint | number;
}

// ============================================================================
// GET /api/admin/content
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin content', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse type (required)
  const type = searchParams.get('type') as ContentTab | null;
  if (!type || !['articles', 'podcasts', 'videos'].includes(type)) {
    throw BizError.badRequest('type parameter is required and must be articles, podcasts, or videos');
  }

  // Parse filters
  const status = searchParams.get('status');
  const is_featured = searchParams.get('is_featured');
  const is_sponsored = searchParams.get('is_sponsored');
  const q = searchParams.get('q');

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // Parse sorting
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  // Build ContentFilters
  const filters: ContentFilters = {};
  if (status) filters.status = status as ContentStatus;
  if (is_featured === '1') filters.isFeatured = true;
  if (is_featured === '0') filters.isFeatured = false;
  if (is_sponsored === '1') filters.isSponsored = true;
  if (is_sponsored === '0') filters.isSponsored = false;
  if (q) filters.searchQuery = q;

  const pagination = { page, pageSize: limit };

  // Get content service
  const contentService = getContentService();
  const db = getDatabaseService();

  // Fetch content by type
  let result;
  if (type === 'articles') {
    result = await contentService.getArticles(filters, pagination);
  } else if (type === 'podcasts') {
    result = await contentService.getPodcasts(filters, pagination);
  } else {
    result = await contentService.getVideos(filters, pagination);
  }

  const items = result.data;
  const total = result.pagination.total;

  // Enrich each item with category_name, listing_name, recommendation_count
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      let category_name: string | undefined;
      let listing_name: string | undefined;
      let recommendation_count = 0;

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
      // Determine singular content type for entity_type column
      const entityType = type === 'articles' ? 'article' : type === 'podcasts' ? 'podcast' : 'video';
      const refResult = await db.query<ReferralCountRow>(
        'SELECT COUNT(*) as count FROM user_referrals WHERE entity_type = ? AND entity_id = ?',
        [entityType, item.id]
      );
      recommendation_count = bigIntToNumber(refResult.rows?.[0]?.count ?? 0);

      return {
        ...item,
        category_name,
        listing_name,
        recommendation_count,
      };
    })
  );

  return createSuccessResponse({
    [type]: enrichedItems,
    pagination: {
      page,
      pageSize: limit,
      total,
    },
  });
});
