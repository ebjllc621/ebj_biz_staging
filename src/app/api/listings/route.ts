/**
 * Listings API Routes (User-Facing)
 *
 * GET /api/listings - Get all listings (public)
 * POST /api/listings - Create listing (any authenticated user)
 *
 * @authority PHASE_5.4_BRAIN_PLAN.md
 * @tier ADVANCED
 * @governance Tier enforcement (SERVER-SIDE)
 * @governance Authentication required for POST
 * @governance General users create pending listings, auto-upgraded on approval
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * GET /api/listings - Get all listings (public)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const city = searchParams.get('city');
  const state = searchParams.get('state');

  // Get ListingService singleton
  const listingService = getListingService();

  try {
    const filters: Record<string, unknown> = {};
    // Public API defaults to active listings only — paused and draft are excluded
    if (status) {
      filters.status = status;
    } else {
      filters.status = 'active';
    }
    if (type) filters.type = type;
    if (city) filters.city = city;
    if (state) filters.state = state;

    const result = await listingService.getAll(filters);

    return createSuccessResponse(
      { listings: result.data, pagination: result.pagination },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('ListingService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
}, { trackPerformance: true });

/**
 * POST /api/listings - Create new listing (user-facing)
 *
 * @governance Authentication required (any authenticated user)
 * @governance General users create pending listings, auto-upgraded on approval
 * @governance Tier limits enforced (categories: 6-20)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // GOVERNANCE: Extract user session
  const user = await getUserFromRequest(request);

  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  // Any authenticated user can create listings
  // General users' listings go to pending approval
  // Users are auto-upgraded to listing_member when first listing is approved

  const body = await request.json();

  // Get ListingService singleton
  const listingService = getListingService();

  try {
    // GOVERNANCE: Tier limit validation (SERVER-SIDE)
    const tier = (body.tier || 'essentials') as 'essentials' | 'plus' | 'preferred' | 'premium';

    // Tier limits table (from Phase 4)
    const TIER_LIMITS: Record<string, { categories: number }> = {
      essentials: { categories: 6 },
      plus: { categories: 12 },
      preferred: { categories: 20 },
      premium: { categories: 999999 }
    };

    const tierLimits = TIER_LIMITS[tier] || TIER_LIMITS.essentials;

    if (body.category_ids && tierLimits && body.category_ids.length > tierLimits.categories) {
      return createErrorResponse(
        BizError.badRequest(
          `${tier} tier allows maximum ${tierLimits.categories} categories`,
          { tier, limit: tierLimits.categories, requested: body.category_ids.length }
        ),
        context.requestId
      );
    }

    // ADMIN FEATURE: Check if admin is assigning listing to a specific user
    const isAdmin = user.role === 'admin';
    const assignedUserId = body.assigned_user_id;
    const ownerUserId = (isAdmin && assignedUserId) ? assignedUserId : user.id;
    const isAdminAssigned = isAdmin && assignedUserId;

    // Create listing with appropriate owner
    // Admin-assigned listings are auto-claimed and approved
    const listing = await listingService.create(ownerUserId, {
      name: body.name,
      type: body.type,
      slug: body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: body.description,
      year_established: body.year_established,
      employee_count: body.employee_count,
      annual_revenue: body.annual_revenue,
      email: body.email,
      phone: body.phone,
      website: body.website,
      address: body.address,
      city: body.city,
      state: body.state,
      zip_code: body.zip_code,
      country: body.country || 'US',
      latitude: body.latitude,
      longitude: body.longitude,
      category_id: body.category_ids && body.category_ids.length > 0 ? body.category_ids[0] : (body.category_id || undefined),
      // active_categories stores ALL active category IDs for multi-category search
      active_categories: body.category_ids && body.category_ids.length > 0 ? body.category_ids : undefined,
      // bank_categories stores ONLY the bank/reserve categories for edit retrieval
      bank_categories: body.bank_categories && body.bank_categories.length > 0 ? body.bank_categories : undefined,
      business_hours: body.business_hours,
      social_media: body.social_media,
      tier: tier,
      contact_name: body.contact_name,
      contact_email: body.contact_email,
      contact_phone: body.contact_phone,
      is_mock: body.mock,
      // SEO and content fields
      slogan: body.slogan,
      keywords: body.keywords,
      meta_title: body.meta_title,
      meta_description: body.meta_description,
      meta_keywords: body.meta_keywords,
      // Admin-assigned listings skip verification
      claimed: isAdminAssigned ? true : undefined,
      approved: isAdminAssigned ? 'approved' : undefined
    });

    return createSuccessResponse(
      {
        id: listing.id,
        slug: listing.slug,
        message: isAdminAssigned
          ? 'Listing created and assigned to user successfully'
          : 'Listing created successfully'
      },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('ListingService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
}));
