/**
 * Full Listing Data API Route
 *
 * GET /api/listings/[id]/full - Fetch complete listing data for editing
 *
 * @authority Phase 7 Brain Plan
 * @tier ADVANCED
 * @governance DatabaseService pattern, no direct SQL
 *
 * Returns:
 * - All listing columns
 * - Active categories (from category_id or relationships)
 * - Bank categories (from bank_categories JSON if implemented)
 * - User's role for this listing (from listing_users table)
 * - Business hours parsed from JSON
 * - Social media links parsed from JSON
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/json';
import {
  ListingSectionLayout,
  DEFAULT_LISTING_SECTION_LAYOUT,
  mergeWithDefaultListingLayout
} from '@features/listings/types/listing-section-layout';

/**
 * Parse a value that might be a JSON string or already parsed by MariaDB
 * MariaDB auto-parses JSON columns, so we need to handle both cases
 */
function parseJsonField<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  // If already an array/object (MariaDB auto-parsed), return as-is
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return value as T;
  }
  // If string, try to parse
  if (typeof value === 'string') {
    const parsed = safeJsonParse<T>(value);
    return parsed !== null ? parsed : defaultValue;
  }
  return defaultValue;
}

/**
 * GET /api/listings/[id]/full
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    const listingId = parseInt(params.id, 10);

  if (isNaN(listingId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid listing ID'),
      context.requestId
    );
  }

  // Get current user (optional - some listings may be public)
  const user = await getUserFromRequest(request);
  const db = getDatabaseService();

  try {
    // Fetch main listing data
    const listingResult = await db.query<any>(
      `SELECT * FROM listings WHERE id = ?`,
      [listingId]
    );

    if (!listingResult || !listingResult.rows || listingResult.rows.length === 0) {
      return createErrorResponse(
        BizError.notFound('Listing', listingId.toString()),
        context.requestId
      );
    }

    const listing = listingResult.rows[0];

    // Parse active_categories and bank_categories JSON columns
    const activeCategoryIds = parseJsonField<number[]>(listing.active_categories, []);
    const bankCategoryIds = parseJsonField<number[]>(listing.bank_categories, []);

    // Fetch active categories from active_categories JSON column
    // Falls back to category_id if active_categories is empty (legacy data)
    let activeCategories: any[] = [];
    const categoryIdsToFetch = activeCategoryIds.length > 0
      ? activeCategoryIds
      : (listing.category_id ? [listing.category_id] : []);

    if (categoryIdsToFetch.length > 0) {
      const placeholders = categoryIdsToFetch.map(() => '?').join(',');
      const categoryResult = await db.query<any>(
        `SELECT id, name, slug, parent_id as parentId, keywords FROM categories WHERE id IN (${placeholders}) AND is_active = 1`,
        categoryIdsToFetch
      );
      if (categoryResult && categoryResult.rows && categoryResult.rows.length > 0) {
        activeCategories = categoryResult.rows.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          parentId: cat.parentId,
          fullPath: cat.name, // Simplified - could build full path from parent chain
          keywords: parseJsonField<string[]>(cat.keywords, []),
        }));
      }
    }

    // Fetch bank categories from bank_categories JSON column
    let bankCategories: any[] = [];
    if (bankCategoryIds.length > 0) {
      const placeholders = bankCategoryIds.map(() => '?').join(',');
      const bankCategoryResult = await db.query<any>(
        `SELECT id, name, slug, parent_id as parentId, keywords FROM categories WHERE id IN (${placeholders}) AND is_active = 1`,
        bankCategoryIds
      );
      if (bankCategoryResult && bankCategoryResult.rows && bankCategoryResult.rows.length > 0) {
        bankCategories = bankCategoryResult.rows.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          parentId: cat.parentId,
          fullPath: cat.name,
          keywords: parseJsonField<string[]>(cat.keywords, []),
        }));
      }
    }

    // Fetch user's role for this listing (from listing_users table if exists)
    let userRole: 'owner' | 'manager' | 'user' | null = null;
    if (user) {
      // Check if listing_users table exists and query
      try {
        const roleResult = await db.query<any>(
          `SELECT role FROM listing_users WHERE listing_id = ? AND user_id = ?`,
          [listingId, user.id]
        );
        if (roleResult && roleResult.rows && roleResult.rows.length > 0) {
          userRole = roleResult.rows[0].role;
        } else if (listing.user_id === user.id) {
          // Fallback: if no listing_users entry but user owns listing
          userRole = 'owner';
        }
      } catch (err) {
        // listing_users table may not exist yet - fallback to owner check
        if (listing.user_id === user.id) {
          userRole = 'owner';
        }
      }
    }

    // Parse addons from add_ons JSON
    let addons: any[] = [];
    if (listing.add_ons) {
      try {
        addons = JSON.parse(listing.add_ons);
        if (!Array.isArray(addons)) addons = [];
      } catch {
        addons = [];
      }
    }

    // Subscription info (simplified - no subscription_plans table queried for now)
    const subscription = {
      tier: listing.tier || 'essentials',
      billingCycle: 'monthly' as const,
      status: 'active' as const,
    };

    // Parse keywords JSON (handles both string and already-parsed array)
    const parsedKeywords = parseJsonField<string[]>(listing.keywords, []);

    // Parse section_layout (may be JSON string or already parsed by MariaDB)
    const sectionLayout = parseJsonField<ListingSectionLayout | null>(
      listing.section_layout,
      null
    );

    // Merge with defaults for complete layout (handles newly added features)
    const mergedLayout = sectionLayout
      ? mergeWithDefaultListingLayout(sectionLayout)
      : DEFAULT_LISTING_SECTION_LAYOUT;

    // Return complete listing data
    return createSuccessResponse(
      {
        listing: {
          id: listing.id,
          user_id: listing.user_id,
          name: listing.name,
          slug: listing.slug,
          description: listing.description,
          type: listing.type,
          year_established: listing.year_established,
          slogan: listing.slogan,
          keywords: JSON.stringify(parsedKeywords), // Always return as JSON string for consistent parsing
          category_id: listing.category_id,
          business_hours: listing.business_hours,
          hours_status: listing.hours_status || 'timetable',
          timezone: listing.timezone || 'America/New_York',
          social_media: listing.social_media,
          address: listing.address,
          city: listing.city,
          state: listing.state,
          zip_code: listing.zip_code,
          country: listing.country,
          latitude: listing.latitude,
          longitude: listing.longitude,
          phone: listing.phone,
          email: listing.email,
          website: listing.website,
          logo_url: listing.logo_url,
          cover_image_url: listing.cover_image_url,
          video_url: listing.video_url,
          audio_url: listing.audio_url,
          meta_title: listing.meta_title,
          meta_description: listing.meta_description,
          meta_keywords: listing.meta_keywords,
          tier: listing.tier,
          add_ons: listing.add_ons,
          mock: listing.mock === 1 || listing.mock === true,
          contact_name: listing.contact_name,
          contact_email: listing.contact_email,
          contact_phone: listing.contact_phone,
          section_layout: mergedLayout, // Phase 9: Add layout to response
        },
        categories: {
          active: activeCategories,
          banked: bankCategories,
        },
        addons,
        userRole,
        subscription,
      },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError
        ? error
        : BizError.internalServerError('FullListingData', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
  })(request);
}
