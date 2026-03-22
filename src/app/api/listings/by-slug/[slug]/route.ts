/**
 * GET /api/listings/by-slug/[slug] - Get listing by slug
 *
 * @route API Route Handler
 * @tier STANDARD
 * @phase Phase 1 - Hero & Action Bar
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/admin-api-route-standard.mdc
 *
 * Fetches listing by URL slug.
 * Returns 404 if not found or not active.
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_1_BRAIN_PLAN.md
 * @see docs/dna/api-auth-standards.md
 */

import { NextRequest } from 'next/server';
import { apiHandler, createSuccessResponse, type ApiContext } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import type { DbResult } from '@core/types/db';
import type { ListingRow } from '@core/types/db-rows';
import { safeJsonParse } from '@core/utils/bigint';

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

interface ListingWithCategory extends ListingRow {
  category_name?: string;
  category_slug?: string;
}

interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
}

/**
 * GET handler - Fetch listing by slug
 *
 * Returns categories array from active_categories (multi-category support).
 * Falls back to category_id (single category) if active_categories is null/empty.
 */
async function getHandler(context: ApiContext, routeContext: RouteContext) {
  const { slug } = await routeContext.params;
  const db = getDatabaseService();

  context.logger.info('Fetching listing by slug', {
    metadata: { slug }
  });

  // Query listing by slug with fallback category JOIN
  const result: DbResult<ListingWithCategory> = await db.query<ListingWithCategory>(
    `SELECT l.*, c.name as category_name, c.slug as category_slug
     FROM listings l
     LEFT JOIN categories c ON l.category_id = c.id
     WHERE l.slug = ? AND l.status = ?`,
    [slug, 'active']
  );

  // Check if listing exists
  if (result.rows.length === 0) {
    throw BizError.notFound('Listing', slug);
  }

  const row = result.rows[0];
  if (!row) {
    throw BizError.notFound('Listing', slug);
  }

  // Map row to Listing interface
  const listing = {
    id: row.id,
    user_id: row.user_id || null,
    name: row.name,
    slug: row.slug,
    description: row.description || null,
    type: row.type,
    year_established: row.year_established || null,
    employee_count: row.employee_count || null,
    email: row.email || null,
    phone: row.phone || null,
    website: row.website || null,
    address: row.address || null,
    city: row.city || null,
    state: row.state || null,
    zip_code: row.zip_code || null,
    country: row.country || 'US',
    latitude: row.latitude || null,
    longitude: row.longitude || null,
    category_id: row.category_id || null,
    logo_url: row.logo_url || null,
    cover_image_url: row.cover_image_url || null,
    gallery_images: safeJsonParse(row.gallery_images, []),
    video_url: row.video_url || null,
    audio_url: row.audio_url || null,
    business_hours: safeJsonParse(row.business_hours, null),
    social_media: safeJsonParse(row.social_media, null),
    features: safeJsonParse(row.features, null),
    amenities: safeJsonParse(row.amenities, null),
    tier: row.tier,
    add_ons: safeJsonParse(row.add_ons, null),
    claimed: Boolean(row.claimed),
    status: row.status,
    approved: row.approved,
    meta_title: row.meta_title || null,
    meta_description: row.meta_description || null,
    meta_keywords: row.meta_keywords || null,
    custom_fields: safeJsonParse(row.custom_fields, null),
    metadata: safeJsonParse(row.metadata, null),
    contact_name: row.contact_name || null,
    contact_email: row.contact_email || null,
    contact_phone: row.contact_phone || null,
    annual_revenue: row.annual_revenue || null,
    certifications: safeJsonParse(row.certifications, null),
    languages_spoken: safeJsonParse(row.languages_spoken, null),
    payment_methods: safeJsonParse(row.payment_methods, null),
    view_count: row.view_count || 0,
    click_count: row.click_count || 0,
    favorite_count: row.favorite_count || 0,
    import_source: row.import_source || null,
    import_date: row.import_date ? new Date(row.import_date) : null,
    import_batch_id: row.import_batch_id || null,
    mock: Boolean(row.mock),
    keywords: safeJsonParse(row.keywords, null),
    slogan: row.slogan || null,
    video_gallery: safeJsonParse(row.video_gallery, []),
    active_categories: safeJsonParse(row.active_categories, null),
    bank_categories: safeJsonParse(row.bank_categories, null),
    section_layout: safeJsonParse(row.section_layout, null),
    gallery_layout: row.gallery_layout ?? null,
    video_gallery_layout: row.video_gallery_layout ?? null,
    combine_video_gallery: Boolean(row.combine_video_gallery),
    date_created: new Date(row.date_created),
    last_update: new Date(row.last_update),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };

  // Resolve categories: prefer active_categories array, fallback to category_id
  let categories: CategoryInfo[] = [];

  // Parse active_categories from listing row
  const activeCategories = safeJsonParse<number[] | null>(row.active_categories, null);

  if (activeCategories && Array.isArray(activeCategories) && activeCategories.length > 0) {
    // Multi-category: resolve all category IDs to names/slugs
    const placeholders = activeCategories.map(() => '?').join(',');
    const catResult: DbResult<CategoryInfo> = await db.query<CategoryInfo>(
      `SELECT id, name, slug FROM categories WHERE id IN (${placeholders}) AND is_active = 1`,
      activeCategories
    );
    categories = catResult.rows;

    context.logger.info('Resolved active_categories', {
      metadata: { listingId: listing.id, categoryCount: categories.length }
    });
  } else if (row.category_name && row.category_slug && listing.category_id) {
    // Fallback: single category from category_id JOIN
    categories = [{
      id: listing.category_id,
      name: row.category_name,
      slug: row.category_slug
    }];

    context.logger.info('Using fallback category_id', {
      metadata: { listingId: listing.id, categoryId: listing.category_id }
    });
  }

  context.logger.info('Listing fetched successfully', {
    metadata: { listingId: listing.id, slug: listing.slug, categoryCount: categories.length }
  });

  // Return listing with categories array (for multi-category support)
  // Also return legacy category_name/category_slug for backwards compatibility
  return createSuccessResponse(
    {
      listing,
      categories, // New: array of {id, name, slug}
      // Legacy fields (backwards compatibility) - use first category or null
      category_name: categories[0]?.name || null,
      category_slug: categories[0]?.slug || null,
    },
    context.requestId
  );
}

/**
 * Export GET handler wrapped with apiHandler
 */
export async function GET(request: NextRequest, context: RouteContext) {
  return apiHandler(
    (apiContext) => getHandler(apiContext, context),
    {
      allowedMethods: ['GET'],
      requireAuth: false, // Public endpoint
    }
  )(request);
}
