/**
 * Admin Guide List API Route
 * GET /api/admin/guides — List guides with admin filters and enrichment
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse with explicit entity key (guides)
 * - DatabaseService boundary compliance
 * - bigIntToNumber: ALL COUNT(*) queries
 * - GuideService instantiated directly (not in ServiceRegistry)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 2 Content Types - Phase G7
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { GuideService } from '@core/services/GuideService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';
import type { GuideFilters } from '@core/types/guide';
import { GuideStatus, GuideDifficultyLevel } from '@core/types/guide';

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

interface SectionCountRow {
  count: bigint | number;
}

// ============================================================================
// GET /api/admin/guides
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin guides', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const status = searchParams.get('status');
  const is_featured = searchParams.get('is_featured');
  const difficulty_level = searchParams.get('difficulty_level');
  const q = searchParams.get('q');

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // Build GuideFilters
  const filters: GuideFilters = {};
  if (status) filters.status = status as GuideStatus;
  if (is_featured === '1') filters.is_featured = true;
  if (is_featured === '0') filters.is_featured = false;
  if (difficulty_level) filters.difficulty_level = difficulty_level as GuideDifficultyLevel;
  if (q) filters.searchQuery = q;

  const pagination = { page, pageSize: limit };

  // Instantiate services
  const db = getDatabaseService();
  const guideService = new GuideService(db);

  // Fetch guides
  const result = await guideService.getGuides(filters, pagination);

  const items = result.data;
  const total = result.pagination.total;

  // Enrich each item with category_name, listing_name, recommendation_count, section_count
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      let category_name: string | undefined;
      let listing_name: string | undefined;
      let recommendation_count = 0;
      let section_count = 0;

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
        ['guide', item.id]
      );
      recommendation_count = bigIntToNumber(refResult.rows?.[0]?.count ?? 0);

      // Fetch section count
      const sectionResult = await db.query<SectionCountRow>(
        'SELECT COUNT(*) as count FROM content_guide_sections WHERE guide_id = ?',
        [item.id]
      );
      section_count = bigIntToNumber(sectionResult.rows?.[0]?.count ?? 0);

      return {
        ...item,
        category_name,
        listing_name,
        recommendation_count,
        section_count,
      };
    })
  );

  return createSuccessResponse({
    guides: enrichedItems,
    pagination: {
      page,
      pageSize: limit,
      total,
    },
  });
});
