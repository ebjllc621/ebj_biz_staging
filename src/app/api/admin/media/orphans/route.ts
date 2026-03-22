/**
 * Admin Media Orphans API Routes
 * GET /api/admin/media/orphans - Get orphaned media files (admin only)
 * DELETE /api/admin/media/orphans - Delete all orphaned media files (admin only)
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.1
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getMediaService } from '@core/services/media/MediaService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * GET /api/admin/media/orphans
 * Get orphaned media files
 * @admin Required
 */
export const GET = apiHandler(
  async () => {
    const mediaService = getMediaService();
    const orphans = await mediaService.getOrphanedMedia();

    return createSuccessResponse({ orphans }, 200);
  },
  {
    requireAuth: true,
    rbac: { action: 'read', resource: 'admin:media' },
  }
);

/**
 * DELETE /api/admin/media/orphans
 * Delete all orphaned media files
 * @admin Required
 */
export const DELETE = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const mediaService = getMediaService();
      const result = await mediaService.bulkDeleteOrphaned();

      const adminActivityService = getAdminActivityService();
      await adminActivityService.logActivity({
        adminUserId: parseInt(context.userId!),
        targetEntityType: 'media',
        targetEntityId: null,
        actionType: 'media_orphans_cleaned',
        actionCategory: 'deletion',
        actionDescription: `Cleaned orphaned media files`,
        afterData: { ...result },
        severity: 'high'
      });

      return createSuccessResponse(result, 200);
    },
    {
      requireAuth: true,
      rbac: { action: 'delete', resource: 'admin:media' },
    }
  )
);
