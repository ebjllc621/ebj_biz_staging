/**
 * Admin Listings API Routes
 * GET /api/admin/listings - List all listings with admin filters
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse/createErrorResponse
 * - DatabaseService boundary compliance
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 0 - Admin Realignment
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { safeJsonParse } from '@core/utils/bigint';

/**
 * GET /api/admin/listings
 * Get all listings with optional filters and pagination for admin management
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin listings', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse basic filters
  const tier = searchParams.get('tier');
  const status = searchParams.get('status');
  const searchQuery = searchParams.get('q');

  // Parse advanced filters
  const filterId = searchParams.get('filterId');
  const filterName = searchParams.get('filterName');
  const filterType = searchParams.get('filterType');
  const filterOwner = searchParams.get('filterOwner');
  const filterTier = searchParams.get('filterTier');
  const filterStatus = searchParams.get('filterStatus');
  const filterApproved = searchParams.get('filterApproved');
  const matchMode = searchParams.get('matchMode') || 'all';  // 'all' = AND, 'any' = OR

  // Parse sorting parameters - server-side sorting for full database ordering
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

  // Build filters object for ListingService
  const filters: Record<string, unknown> = {};
  if (tier) filters.tier = tier;
  if (status) {
    // Map frontend status to service approved field
    filters.approved = status;
  }

  // Advanced filters for direct SQL WHERE clause building
  if (filterId) filters.id = parseInt(filterId);
  if (filterName) filters.name = filterName;
  if (filterType) filters.type = filterType;
  if (filterOwner) filters.owner = filterOwner;
  if (filterTier) filters.tier = filterTier;
  if (filterStatus) filters.status = filterStatus;
  if (filterApproved) filters.approved = filterApproved;
  if (searchQuery) filters.searchQuery = searchQuery;
  filters.matchMode = matchMode;

  // Server-side sorting - passed to ListingService for ORDER BY
  if (sortBy) filters.sortBy = sortBy;
  if (sortOrder) filters.sortOrder = sortOrder;

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const pagination = { page, limit };

  // Initialize services
  const db = getDatabaseService();
  const listingService = getListingService();

  // Get listings with filters
  const result = await listingService.getAll(filters, pagination);

  // Transform listings to include user info and category info for admin display
  const listingsWithUserInfo = await Promise.all(
    result.data.map(async (listing) => {
      let userName = 'Unknown';
      let userEmail = 'Unknown';

      if (listing.user_id) {
        const userResult = await db.query<{ display_name: string | null; first_name: string | null; last_name: string | null; email: string }>(
          'SELECT display_name, first_name, last_name, email FROM users WHERE id = ?',
          [listing.user_id]
        );
        if (userResult.rows && userResult.rows.length > 0) {
          const userData = userResult.rows[0];
          // Build name from display_name or first_name + last_name
          userName = userData?.display_name
            || [userData?.first_name, userData?.last_name].filter(Boolean).join(' ')
            || 'Unknown';
          userEmail = userData?.email || 'Unknown';
        }
      }

      // Fetch category name if category_id exists
      let categoryName: string | null = null;

      if (listing.category_id) {
        const categoryResult = await db.query<{ name: string }>(
          'SELECT name FROM categories WHERE id = ?',
          [listing.category_id]
        );
        if (categoryResult.rows && categoryResult.rows.length > 0) {
          categoryName = categoryResult.rows[0]?.name ?? null;
        }
      }

      // Resolve active_categories to names
      let activeCategoryNames: string[] = [];
      const activeCategories: number[] = listing.active_categories
        ? safeJsonParse(listing.active_categories, [])
        : [];

      if (activeCategories.length > 0) {
        const placeholders = activeCategories.map(() => '?').join(',');
        const catResult = await db.query<{ id: number; name: string }>(
          `SELECT id, name FROM categories WHERE id IN (${placeholders})`,
          activeCategories
        );
        activeCategoryNames = catResult.rows?.map(r => r.name) || [];
      }

      // Resolve bank_categories to names
      let bankCategoryNames: string[] = [];
      const bankCategories: number[] = listing.bank_categories
        ? safeJsonParse(listing.bank_categories, [])
        : [];

      if (bankCategories.length > 0) {
        const placeholders = bankCategories.map(() => '?').join(',');
        const catResult = await db.query<{ id: number; name: string }>(
          `SELECT id, name FROM categories WHERE id IN (${placeholders})`,
          bankCategories
        );
        bankCategoryNames = catResult.rows?.map(r => r.name) || [];
      }

      return {
        // Primary Identity
        id: listing.id,
        name: listing.name,
        slug: listing.slug,
        type: listing.type,

        // Tier & Status - NO TRANSFORMATION
        tier: listing.tier,           // Return actual value: essentials/plus/preferred/premium
        status: listing.status,       // Actual status: active/inactive/pending/suspended
        approved: listing.approved,   // Actual approved: pending/approved/rejected

        // Owner & Claiming
        user_id: listing.user_id,
        user_email: userEmail,
        user_name: userName,
        claimed: Boolean(listing.claimed),  // Convert TINYINT to boolean

        // Media
        logo_url: listing.logo_url,

        // Categorization - normalize add_ons to string[] (DB may store objects with {id, name, status, activated_at})
        add_ons: listing.add_ons
          ? (safeJsonParse(listing.add_ons, []) as unknown[]).map((item: unknown) =>
              typeof item === 'object' && item !== null && 'name' in item
                ? String((item as { name: string }).name)
                : String(item)
            )
          : null,
        category_id: listing.category_id,
        category_name: categoryName,
        active_categories: activeCategories,
        bank_categories: bankCategories,
        active_category_names: activeCategoryNames,
        bank_category_names: bankCategoryNames,

        // Data Flags
        mock: Boolean(listing.mock),        // Convert TINYINT to boolean

        // Timestamps
        last_update: listing.last_update,
        created_at: listing.created_at
      };
    })
  );

  return createSuccessResponse({
    listings: listingsWithUserInfo,
    pagination: {
      page,
      pageSize: limit,
      total: result.pagination?.total || 0
    }
  }, 200);
});
