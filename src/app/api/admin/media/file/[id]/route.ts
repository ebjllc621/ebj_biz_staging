/**
 * Admin Media File API
 *
 * DELETE /api/admin/media/file/[id] - Delete individual file
 * PUT    /api/admin/media/file/[id] - Rename individual file
 *
 * File ID extraction from URL:
 *   /api/admin/media/file/123 → id = 123
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
import { extractFileId } from '../utils/extractFileId';

/**
 * DELETE /api/admin/media/file/[id]
 * Delete an individual media file from disk and database.
 */
export const DELETE = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const fileId = extractFileId(context);

      if (isNaN(fileId) || fileId <= 0) {
        return createErrorResponse(new Error('Invalid file ID.'), 400);
      }

      context.logger.info('Deleting media file', {
        metadata: {
          userId: context.userId,
          fileId,
        },
      });

      const service = getMediaDirectoryService();
      await service.deleteFile(fileId);

      const adminActivityService = getAdminActivityService();
      await adminActivityService.logActivity({
        adminUserId: parseInt(context.userId!),
        targetEntityType: 'media',
        targetEntityId: fileId,
        actionType: 'media_deleted',
        actionCategory: 'deletion',
        actionDescription: `Deleted media file #${fileId}`,
        afterData: { fileId },
        severity: 'normal'
      });

      return createSuccessResponse({ deleted: true, fileId }, 200);
    },
    {
      requireAuth: true,
      rbac: { action: 'delete', resource: 'admin:media' },
    }
  )
);

/**
 * PUT /api/admin/media/file/[id]
 * Rename an individual media file.
 * Body: { newFilename: string }
 */
export const PUT = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const fileId = extractFileId(context);

      if (isNaN(fileId) || fileId <= 0) {
        return createErrorResponse(new Error('Invalid file ID.'), 400);
      }

      const body = (await context.request.json()) as { newFilename?: string };

      if (!body.newFilename || typeof body.newFilename !== 'string') {
        return createErrorResponse(new Error('newFilename is required.'), 400);
      }

      context.logger.info('Renaming media file', {
        metadata: {
          userId: context.userId,
          fileId,
          newFilename: body.newFilename,
        },
      });

      const service = getMediaDirectoryService();
      const file = await service.renameFile(fileId, body.newFilename);

      const adminActivityService = getAdminActivityService();
      await adminActivityService.logActivity({
        adminUserId: parseInt(context.userId!),
        targetEntityType: 'media',
        targetEntityId: fileId,
        actionType: 'media_updated',
        actionCategory: 'update',
        actionDescription: `Renamed media file #${fileId} to "${body.newFilename}"`,
        afterData: { fileId, newFilename: body.newFilename },
        severity: 'normal'
      });

      return createSuccessResponse({ file }, 200);
    },
    {
      requireAuth: true,
      rbac: { action: 'write', resource: 'admin:media' },
    }
  )
);
