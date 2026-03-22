/**
 * Admin Media Statistics API Routes
 * GET /api/admin/media/statistics - Get media storage statistics (admin only)
 *
 * Supports two formats via query parameter:
 *   ?format=directory  → DirectoryStatistics (Phase 4A - new directory browser)
 *   (default)          → Legacy MediaStatistics (backward compatible)
 *
 * @authority Build Map v2.1 ENHANCED - Admin API Route Standard
 * @phase Phase 4A - Admin Media Manager Core (extended from Phase 5.2)
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { MediaService } from '@core/services/media/MediaService';
import { getStatistics as getHybridStatistics } from '@features/media/directory/services/DirectoryRouter';

/**
 * GET /api/admin/media/statistics
 *
 * Query params:
 *   format=directory  → returns DirectoryStatistics (hybrid: local + Cloudinary)
 *   (none/other)      → returns legacy MediaStatistics (backward compatible)
 */
export const GET = apiHandler(
  async (context: ApiContext) => {
    const url = new URL(context.request.url);
    const format = url.searchParams.get('format');

    if (format === 'directory') {
      // Hybrid: local + Cloudinary directory statistics
      const statistics = await getHybridStatistics();

      return createSuccessResponse({ statistics }, 200);
    }

    // Legacy: storage statistics from MediaService (backward compatible)
    const mediaService = new MediaService();
    const statistics = await mediaService.getStorageStatistics();

    return createSuccessResponse({ statistics }, 200);
  },
  {
    requireAuth: true,
    rbac: { action: 'read', resource: 'admin:media' },
  }
);
