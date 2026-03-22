/**
 * Admin Media File Move API
 *
 * POST /api/admin/media/file/[id]/move - Move file to destination directory
 *
 * @authority Build Map v2.1 ENHANCED - Admin API Route Standard
 * @phase Phase 4A - Admin Media Manager Core
 * @requires Admin authentication + admin:media RBAC + CSRF
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getMediaDirectoryService } from '@features/media/directory/services/MediaDirectoryService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { extractFileId } from '../../utils/extractFileId';

/**
 * POST /api/admin/media/file/[id]/move
 * Move a media file to a new directory.
 * Body: { destinationPath: string }
 */
export const POST = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const fileId = extractFileId(context);

      if (isNaN(fileId) || fileId <= 0) {
        return createErrorResponse(new Error('Invalid file ID.'), 400);
      }

      const body = (await context.request.json()) as { destinationPath?: string };

      if (body.destinationPath === undefined || typeof body.destinationPath !== 'string') {
        return createErrorResponse(new Error('destinationPath is required.'), 400);
      }

      context.logger.info('Moving media file', {
        metadata: {
          userId: context.userId,
          fileId,
          destinationPath: body.destinationPath,
        },
      });

      const service = getMediaDirectoryService();
      const file = await service.moveFile(fileId, body.destinationPath);

      getAdminActivityService().logActivity({
        adminUserId: parseInt(context.userId!),
        targetEntityType: 'media',
        targetEntityId: fileId,
        actionType: 'media_file_moved',
        actionCategory: 'update',
        actionDescription: `Moved media file #${fileId} to ${body.destinationPath}`,
        afterData: { fileId, destinationPath: body.destinationPath },
        severity: 'normal',
        ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
        userAgent: context.request.headers.get('user-agent') || undefined,
        sessionId: context.request.cookies.get('bk_session')?.value,
      }).catch(() => {});

      return createSuccessResponse({ file }, 200);
    },
    {
      requireAuth: true,
      rbac: { action: 'write', resource: 'admin:media' },
    }
  )
);
