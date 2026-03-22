/**
 * Admin Media API Routes
 * GET /api/admin/media - Get all media files (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - MediaService boundary: ALL media operations through service
 * - Admin authentication: requireAuth + RBAC enforced via apiHandler options
 * - Response format: createSuccessResponse/createErrorResponse
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.1
 * @compliance E2.6 - API Bridge for provider-based MediaService
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getMediaService } from '@core/services/media/MediaService';

/**
 * GET /api/admin/media
 * Get all media files with entity relationships
 * @admin Required
 */
export const GET = apiHandler(
  async () => {
    // Admin-only access - using provider-based MediaService
    const mediaService = getMediaService();

    // Get storage statistics and provider configuration
    const statistics = await mediaService.getStorageStatistics();
    const providerConfig = mediaService.getProviderConfig();

    // Note: The provider-based MediaService doesn't have direct database access
    // For full media listing, a database query would be needed through DatabaseService
    // Currently returning statistics and config for admin dashboard
    return createSuccessResponse({
      statistics,
      providerConfig,
      note: 'Provider-based MediaService - for full media listing, use DatabaseService directly'
    });
  },
  {
    requireAuth: true,
    rbac: { action: 'read', resource: 'admin:media' },
  }
);
