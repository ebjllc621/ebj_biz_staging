/**
 * Projects API Routes - GET /api/listings/[id]/projects
 *
 * @authority Phase 4 Brain Plan - Projects API
 * @governance Public access (returns visible projects only)
 * @pattern Exact replication of /api/listings/[id]/team pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { safeJsonParse } from '@core/utils/bigint';

/**
 * GET /api/listings/[id]/projects
 * Get all projects for a listing
 *
 * @public No authentication required (returns visible projects only)
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

  // Get visible projects ordered by display_order and created_at
  const result = await db.query(
    `SELECT
      id, listing_id, title, description, image_url, gallery_images,
      project_date, client_name, category, tags, is_featured, is_visible,
      display_order, created_at, updated_at
    FROM listing_projects
    WHERE listing_id = ? AND is_visible = TRUE
    ORDER BY is_featured DESC, display_order ASC, created_at DESC`,
    [listingId]
  );

  // Parse JSON fields
  const projects = result.rows.map((row: any) => ({
    ...row,
    gallery_images: safeJsonParse(row.gallery_images, []),
    tags: safeJsonParse(row.tags, [])
  }));

  return createSuccessResponse({ projects }, context.requestId);
}, {
  allowedMethods: ['GET']
});
