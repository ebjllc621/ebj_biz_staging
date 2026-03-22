import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import {
  ListingSectionLayout,
  DEFAULT_LISTING_SECTION_LAYOUT,
  mergeWithDefaultListingLayout
} from '@features/listings/types/listing-section-layout';
import { migrateLayout } from '@features/listings/utils/layoutMigration';

/**
 * GET /api/listings/[id]/layout
 * Fetch listing section layout preferences
 *
 * PUBLIC ACCESS: Layout data is not sensitive (display order only).
 * All visitors can see the owner's customized layout.
 * This ensures visitors see the same layout the owner configured.
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const pathSegments = url.pathname.split('/');
  const listingIdIndex = pathSegments.indexOf('listings') + 1;
  const listingId = pathSegments[listingIdIndex];

  if (!listingId || listingId === '[id]') {
    throw BizError.badRequest('Listing ID is required');
  }

  const db = getDatabaseService();

  // Fetch listing layout (no auth required - layout is public display config)
  const listingResult = await db.query<{ section_layout: string | ListingSectionLayout | null }>(
    'SELECT section_layout FROM listings WHERE id = ?',
    [parseInt(listingId, 10)]
  );

  if (listingResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const listing = listingResult.rows[0];
  if (!listing) {
    throw BizError.notFound('Listing not found');
  }

  // Parse layout - mariadb may auto-parse JSON or return as string
  let layout: ListingSectionLayout | null = null;
  if (listing.section_layout) {
    if (typeof listing.section_layout === 'string') {
      try {
        layout = JSON.parse(listing.section_layout);
      } catch (error) {
        // If parsing fails, use default layout
        layout = null;
      }
    } else {
      layout = listing.section_layout;
    }
  }

  // Phase 9: Migrate layout to current version (handles schema upgrades)
  const migratedLayout = migrateLayout(layout);

  return createSuccessResponse(
    { layout: migratedLayout },
    context.requestId
  );
}, { allowedMethods: ['GET'], requireAuth: false });

/**
 * PUT /api/listings/[id]/layout
 * Update or reset listing section layout preferences
 * Authorization: Owner OR Admin
 * CSRF Protection: Required
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const url = new URL(context.request.url);
  const pathSegments = url.pathname.split('/');
  const listingIdIndex = pathSegments.indexOf('listings') + 1;
  const listingId = pathSegments[listingIdIndex];

  if (!listingId || listingId === '[id]') {
    throw BizError.badRequest('Listing ID is required');
  }

  const db = getDatabaseService();

  // Fetch listing with user_id for ownership check
  const listingResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [parseInt(listingId, 10)]
  );

  if (listingResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const listing = listingResult.rows[0];
  if (!listing) {
    throw BizError.notFound('Listing not found');
  }

  const userId = parseInt(context.userId, 10);

  // Check if user is owner
  const isOwner = listing.user_id === userId;

  // Check if user is admin
  const userResult = await db.query<{ role: string }>(
    'SELECT role FROM users WHERE id = ?',
    [userId]
  );
  const isAdmin = userResult.rows[0]?.role === 'admin';

  // Authorization: Must be owner OR admin
  if (!isOwner && !isAdmin) {
    throw BizError.forbidden('Not authorized to modify this listing layout');
  }

  // Parse request body
  const body = await context.request.json() as { layout?: ListingSectionLayout; reset?: boolean };

  let updatedLayout: ListingSectionLayout;

  if (body.reset) {
    // Reset to default layout
    updatedLayout = {
      ...DEFAULT_LISTING_SECTION_LAYOUT,
      updatedAt: new Date().toISOString()
    };
  } else if (body.layout) {
    // Update with provided layout
    updatedLayout = {
      ...body.layout,
      updatedAt: new Date().toISOString()
    };
  } else {
    throw BizError.badRequest('Layout or reset flag required');
  }

  // Update database
  await db.query(
    'UPDATE listings SET section_layout = ? WHERE id = ?',
    [JSON.stringify(updatedLayout), parseInt(listingId, 10)]
  );

  return createSuccessResponse(
    {
      layout: updatedLayout,
      message: body.reset ? 'Layout reset to default' : 'Layout updated successfully'
    },
    context.requestId
  );
}, { allowedMethods: ['PUT'], requireAuth: true });
