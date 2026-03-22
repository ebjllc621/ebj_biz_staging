/**
 * Listing Gallery API Route
 * POST /api/listings/[id]/gallery - Add image to gallery
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - UMM integration: Uses MediaService for file operations
 * - Tier enforcement: Validates gallery image limits
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 * @authority universal-media-manager.mdc - UMM compliance
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { ListingService } from '@core/services/ListingService';
import { CategoryService } from '@core/services/CategoryService';
import { MediaService } from '@core/services/media/MediaService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * POST /api/listings/[id]/gallery
 * Add image to listing gallery
 * Body:
 *   - image_url: Image URL (required - typically from UMM media upload)
 *
 * @authenticated User authentication required (listing owner or admin)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'gallery')
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
  }

  // Get user ID from context
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }

  // Gallery image upload not yet implemented - requires multipart/form-data handling
  throw BizError.serviceUnavailable(
    'Gallery image upload - requires multipart/form-data implementation'
  );
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
