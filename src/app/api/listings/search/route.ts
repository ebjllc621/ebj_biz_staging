/**
 * GET /api/listings/search - Search listings endpoint
 *
 * @fixed 2026-01-03 - SYSREP methodology gap fix v2
 * @fixed 2026-02-12 - Multi-category support for search indexing and SEO
 * @fixed 2026-02-12 - Visibility logic aligned with listing detail page (status only, not approved)
 * @enhanced 2026-02-12 - Advanced search (user, type, keywords) via SYSREP/FIXFLOW
 * @pattern Following exact HomePageService + apiHandler pattern
 * @canonical Uses DatabaseService → MariaDB (same as homepage)
 * @see docs/pages/layouts/listings/phases/post_imp_troubleshooting/DNA_METHODOLOGY_GAP_REPORT_2026-01-03.md
 *
 * VISIBILITY LOGIC:
 * - Filter by status = 'active' ONLY (matches listing detail page /api/listings/by-slug/[slug])
 * - approved field is for moderation workflow, NOT site visibility
 * - Principle: If a listing is viewable on the site, it must be searchable
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * Query parameters:
 * - page: number >= 1 (default 1) - Page number for pagination
 * - pageSize: number 1-50 (default 20) - Items per page
 * - sort: 'recent' | 'name' (default 'recent') - Sort order
 * - q: optional string - Search query for title/description/category names
 * - category: optional string - Category slug to filter by (supports multi-category via active_categories)
 * - userId: optional number - Filter by owner user ID
 * - userName: optional string - Search by owner name (fuzzy match on display_name, first_name, last_name)
 * - type: optional string - Filter by listing type
 * - keywords: optional string - Search in keywords JSON array
 * - fromListing: optional number - Source listing ID (clicked from listing details) to display first
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import type { DbResult } from '@core/types/db';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';

/**
 * Listing row type for search results
 */
interface ListingSearchRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  user_id: number | null;
  user_name: string | null; // From JOIN with users table
  category_id: number | null;
  category_name: string | null;
  active_categories: string | null; // JSON: number[]
  keywords: string | null; // JSON: string[]
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  latitude: number | null;
  longitude: number | null;
  view_count: number;
  favorite_count: number;
  claimed: number;
}

/** Category info for multi-category response */
interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
}

/**
 * Search result item (transformed for API response)
 */
interface ListingSearchItem {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: string;
  /** All active categories (multi-category support) */
  categories?: CategoryInfo[];
  /** Legacy: primary category ID */
  category_id?: number;
  /** Legacy: primary category name */
  category_name?: string;
  city?: string;
  state?: string;
  cover_image_url?: string;
  logo_url?: string;
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  latitude?: number;
  longitude?: number;
  view_count: number;
  favorite_count: number;
  claimed: boolean;
}

/**
 * Search response data structure
 */
interface ListingsSearchData {
  items: ListingSearchItem[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Parse and validate search parameters from request
 */
function parseSearchParams(request: Request): {
  page: number;
  pageSize: number;
  sort: 'recent' | 'name';
  q?: string;
  category?: string;
  userId?: number;
  userName?: string;
  type?: string;
  keywords?: string;
  userLat?: number;
  userLng?: number;
  fromListing?: number;
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

  // Parse sort (default: 'recent', allowed: 'recent' | 'name')
  let sort: 'recent' | 'name' = 'recent';
  const sortParam = searchParams.get('sort');
  if (sortParam !== null) {
    if (sortParam !== 'recent' && sortParam !== 'name') {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'Sort parameter must be either "recent" or "name"'
      });
    }
    sort = sortParam;
  }

  // Parse search query (optional)
  const q = searchParams.get('q') || undefined;

  // Parse category filter (optional) - supports multi-category search via slug
  const category = searchParams.get('category') || undefined;

  // Parse userId filter (optional) - filter by owner user ID
  let userId: number | undefined;
  const userIdParam = searchParams.get('userId');
  if (userIdParam !== null) {
    const parsed = parseInt(userIdParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      userId = parsed;
    }
  }

  // Parse userName search (optional) - fuzzy search by owner name
  const userName = searchParams.get('userName') || undefined;

  // Parse type filter (optional) - filter by listing type
  const type = searchParams.get('type') || undefined;

  // Parse keywords search (optional) - search in keywords JSON array
  const keywords = searchParams.get('keywords') || undefined;

  // Parse user location for silent claimed listing priority (optional)
  let userLat: number | undefined;
  let userLng: number | undefined;
  const userLatParam = searchParams.get('userLat');
  const userLngParam = searchParams.get('userLng');
  if (userLatParam !== null && userLngParam !== null) {
    const parsedLat = parseFloat(userLatParam);
    const parsedLng = parseFloat(userLngParam);
    // Validate coordinates are within valid ranges
    if (!isNaN(parsedLat) && !isNaN(parsedLng) &&
        parsedLat >= -90 && parsedLat <= 90 &&
        parsedLng >= -180 && parsedLng <= 180) {
      userLat = parsedLat;
      userLng = parsedLng;
    }
  }

  // Parse source listing ID (optional) - listing user clicked from, display first in results
  let fromListing: number | undefined;
  const fromListingParam = searchParams.get('fromListing');
  if (fromListingParam !== null) {
    const parsed = parseInt(fromListingParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      fromListing = parsed;
    }
  }

  return { page, pageSize, sort, q, category, userId, userName, type, keywords, userLat, userLng, fromListing };
}

/**
 * GET /api/listings/search
 * Search listings with pagination, sorting, and text search
 *
 * Following exact pattern from /api/homepage/public which WORKS:
 * - apiHandler wrapper for error handling
 * - DatabaseService for data access
 * - createSuccessResponse for response formatting
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Parse and validate query parameters
  const { page, pageSize, sort, q, category, userId, userName, type, keywords, userLat, userLng, fromListing } = parseSearchParams(context.request);

  // Get database service (canonical pattern)
  const db = getDatabaseService();

  // Build WHERE clause
  // Visibility: Only filter by status = 'active' to match listing detail page visibility
  // Note: approved field is for moderation workflow, not site visibility
  // If a listing is viewable on the site, it must be searchable
  const whereClauses = [`l.status = 'active'`];
  const params: (string | number)[] = [];

  // Text search (name, description, category names)
  // Searches: listing name, description, primary category name, and all active_categories names
  if (q) {
    whereClauses.push(`(
      l.name LIKE ?
      OR l.description LIKE ?
      OR c.name LIKE ?
      OR EXISTS (
        SELECT 1 FROM categories cat
        WHERE JSON_CONTAINS(l.active_categories, CAST(cat.id AS CHAR))
        AND cat.name LIKE ?
        AND cat.is_active = 1
      )
    )`);
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  // User ID filter (exact match)
  if (userId) {
    whereClauses.push(`l.user_id = ?`);
    params.push(userId);
  }

  // User name search (fuzzy match on display_name, first_name, last_name via JOIN)
  if (userName) {
    whereClauses.push(`(
      u.display_name LIKE ?
      OR u.first_name LIKE ?
      OR u.last_name LIKE ?
      OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE ?
    )`);
    const userNamePattern = `%${userName}%`;
    params.push(userNamePattern, userNamePattern, userNamePattern, userNamePattern);
  }

  // Type filter (exact match)
  if (type) {
    whereClauses.push(`l.type = ?`);
    params.push(type);
  }

  // Keywords search (JSON array contains)
  if (keywords) {
    // Search if keywords JSON array contains the search term
    // JSON_SEARCH returns NULL if not found, so we check for non-NULL
    whereClauses.push(`JSON_SEARCH(l.keywords, 'one', ?, NULL, '$[*]') IS NOT NULL`);
    params.push(`%${keywords}%`);
  }

  // Category filter (multi-category support)
  // Checks both active_categories JSON array AND category_id for backwards compatibility
  let filterCategoryId: number | null = null;
  if (category) {
    // Look up category ID by slug
    const catResult: DbResult<{ id: number }> = await db.query<{ id: number }>(
      'SELECT id FROM categories WHERE slug = ? AND is_active = 1 LIMIT 1',
      [category]
    );
    if (catResult.rows.length > 0 && catResult.rows[0]) {
      filterCategoryId = catResult.rows[0].id;
      // Multi-category filter: check active_categories JSON OR category_id (fallback)
      // JSON_CONTAINS checks if the category ID exists in the active_categories array
      whereClauses.push(`(
        JSON_CONTAINS(l.active_categories, CAST(? AS CHAR))
        OR (l.active_categories IS NULL AND l.category_id = ?)
      )`);
      params.push(String(filterCategoryId), filterCategoryId);
    }
  }

  const whereSQL = whereClauses.join(' AND ');

  // Build ORDER BY with source listing priority and claimed listing priority
  // Priority order: 1) Source listing first (fromListing), 2) Claimed within 200mi, 3) Base sort
  const baseOrderSQL = sort === 'name' ? 'l.name ASC' : 'l.created_at DESC';

  let orderSQL: string;
  const queryParams = [...params];

  // Build priority ordering layers
  const orderParts: string[] = [];

  // Priority 1: Source listing first (when navigating from a listing's category badge)
  if (fromListing !== undefined) {
    orderParts.push(`CASE WHEN l.id = ? THEN 0 ELSE 1 END ASC`);
    queryParams.push(fromListing);
  }

  // Priority 2: Claimed listings within 200 miles
  if (userLat !== undefined && userLng !== undefined) {
    // Haversine formula for distance in miles (3959 = Earth's radius in miles)
    // Priority: claimed=1 AND distance <= 200 miles gets priority 1, otherwise 0
    // Note: Only apply priority to listings with valid coordinates
    orderParts.push(`
      CASE
        WHEN l.claimed = 1
          AND l.latitude IS NOT NULL
          AND l.longitude IS NOT NULL
          AND (
            3959 * ACOS(
              LEAST(1, GREATEST(-1,
                COS(RADIANS(?)) * COS(RADIANS(l.latitude)) * COS(RADIANS(l.longitude) - RADIANS(?))
                + SIN(RADIANS(?)) * SIN(RADIANS(l.latitude))
              ))
            )
          ) <= 200
        THEN 0
        ELSE 1
      END ASC`);
    // Add user coordinates as parameters (lat, lng, lat for the formula)
    queryParams.push(userLat, userLng, userLat);
  }

  // Priority 3: Base sort (recent or name)
  orderParts.push(baseOrderSQL);

  orderSQL = orderParts.join(', ');

  // Calculate offset
  const offset = (page - 1) * pageSize;

  // Get total count (include categories and users JOINs for category name and userName search)
  const countResult: DbResult<{ total: bigint | number }> = await db.query<{ total: bigint | number }>(
    `SELECT COUNT(*) as total FROM listings l
     LEFT JOIN categories c ON l.category_id = c.id
     LEFT JOIN users u ON l.user_id = u.id
     WHERE ${whereSQL}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.total);

  // Build final params for paginated query
  const paginatedParams = [...queryParams, pageSize, offset];

  // Get paginated listings with priority sorting
  // Include active_categories for multi-category resolution
  // Include users JOIN for owner name display
  const listingsResult: DbResult<ListingSearchRow> = await db.query<ListingSearchRow>(
    `SELECT
      l.id,
      l.name,
      l.slug,
      l.description,
      l.type,
      l.user_id,
      COALESCE(u.display_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), '') as user_name,
      l.category_id,
      c.name as category_name,
      l.active_categories,
      l.keywords,
      l.city,
      l.state,
      l.cover_image_url,
      l.logo_url,
      l.tier,
      l.latitude,
      l.longitude,
      l.view_count,
      l.favorite_count,
      l.claimed
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE ${whereSQL}
    ORDER BY ${orderSQL}
    LIMIT ? OFFSET ?`,
    paginatedParams
  );

  // Collect all unique category IDs from active_categories and category_id for batch resolution
  const allCategoryIds = new Set<number>();
  listingsResult.rows.forEach((row: ListingSearchRow) => {
    const activeCategories = safeJsonParse<number[] | null>(row.active_categories, null);
    if (activeCategories && Array.isArray(activeCategories)) {
      activeCategories.forEach((id: number) => allCategoryIds.add(id));
    }
    if (row.category_id) {
      allCategoryIds.add(row.category_id);
    }
  });

  // Batch fetch all category info for efficiency
  const categoryMap = new Map<number, CategoryInfo>();
  if (allCategoryIds.size > 0) {
    const categoryIds = Array.from(allCategoryIds);
    const placeholders = categoryIds.map(() => '?').join(',');
    const catResult: DbResult<{ id: number; name: string; slug: string }> = await db.query<{ id: number; name: string; slug: string }>(
      `SELECT id, name, slug FROM categories WHERE id IN (${placeholders})`,
      categoryIds
    );
    catResult.rows.forEach(cat => {
      categoryMap.set(cat.id, { id: cat.id, name: cat.name, slug: cat.slug });
    });
  }

  // Transform results with multi-category resolution
  const items: ListingSearchItem[] = listingsResult.rows.map((row: ListingSearchRow) => {
    // Resolve categories: prefer active_categories, fallback to category_id
    let categories: CategoryInfo[] = [];
    const activeCategories = safeJsonParse<number[] | null>(row.active_categories, null);

    if (activeCategories && Array.isArray(activeCategories) && activeCategories.length > 0) {
      // Multi-category: resolve all category IDs from the map
      categories = activeCategories
        .map((id: number) => categoryMap.get(id))
        .filter((cat): cat is CategoryInfo => cat !== undefined);
    } else if (row.category_id && categoryMap.has(row.category_id)) {
      // Fallback: single category from category_id
      categories = [categoryMap.get(row.category_id)!];
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      type: row.type,
      // Multi-category support
      categories: categories.length > 0 ? categories : undefined,
      // Legacy fields for backwards compatibility
      category_id: row.category_id ?? undefined,
      category_name: categories[0]?.name ?? row.category_name ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      cover_image_url: row.cover_image_url ?? undefined,
      logo_url: row.logo_url ?? undefined,
      tier: row.tier,
      latitude: row.latitude !== null ? parseFloat(String(row.latitude)) : undefined,
      longitude: row.longitude !== null ? parseFloat(String(row.longitude)) : undefined,
      view_count: row.view_count,
      favorite_count: row.favorite_count,
      claimed: Boolean(row.claimed)
    };
  });

  // Build response data
  const data: ListingsSearchData = {
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
