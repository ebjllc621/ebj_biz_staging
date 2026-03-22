/**
 * Admin Media File Update API
 *
 * PUT /api/admin/media/file/[id]/update
 *
 * Supports two operations differentiated by the request body:
 *
 * 1. Metadata update (no cropData):
 *    Body: { altText?: string, titleText?: string, seoFilename?: string }
 *
 * 2. Image re-crop (with cropData):
 *    Body: { cropData: string, filename?: string, altText?: string, titleText?: string }
 *
 * File ID extraction from URL:
 *   /api/admin/media/file/123/update → id = 123
 *
 * @authority Build Map v2.1 ENHANCED - Admin API Route Standard
 * @phase Phase 3 - Admin Media Directory Service
 * @requires Admin authentication + admin:media RBAC + CSRF
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getMediaDirectoryService } from '@features/media/directory/services/MediaDirectoryService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { UpdateFileMetadataRequest, ReCropRequest } from '@features/media/directory/types/directory-types';

/**
 * Extract the numeric file ID from the request URL.
 * Pattern: /api/admin/media/file/{id}/update
 *
 * @param context - ApiContext with NextRequest
 * @returns Numeric file ID or NaN if not parseable
 */
function extractFileId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const fileIndex = segments.indexOf('file');
  if (fileIndex === -1 || fileIndex + 1 >= segments.length) return NaN;
  const idSegment = segments[fileIndex + 1];
  if (!idSegment) return NaN;
  return parseInt(idSegment, 10);
}

/**
 * PUT /api/admin/media/file/[id]/update
 * Update file metadata or re-crop an image.
 */
export const PUT = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const fileId = extractFileId(context);

      if (isNaN(fileId) || fileId <= 0) {
        return createErrorResponse(new Error('Invalid file ID.'), 400);
      }

      const body = (await context.request.json()) as Partial<UpdateFileMetadataRequest & ReCropRequest>;

      const service = getMediaDirectoryService();

      // Route to re-crop if cropData is present
      if (typeof body.cropData === 'string' && body.cropData.length > 0) {
        context.logger.info('Re-cropping media image', {
          metadata: {
            userId: context.userId,
            fileId,
            hasFilename: !!body.filename,
          },
        });

        const file = await service.reCropImage(fileId, body.cropData, {
          filename: body.filename,
          altText: body.altText,
          titleText: body.titleText,
        });

        getAdminActivityService().logActivity({
          adminUserId: parseInt(context.userId!),
          targetEntityType: 'media',
          targetEntityId: fileId,
          actionType: 'media_file_recropped',
          actionCategory: 'update',
          actionDescription: `Re-cropped media image #${fileId}`,
          afterData: { fileId, hasFilename: !!body.filename },
          severity: 'normal',
          ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
          userAgent: context.request.headers.get('user-agent') || undefined,
          sessionId: context.request.cookies.get('bk_session')?.value,
        }).catch(() => {});

        return createSuccessResponse({ file }, 200);
      }

      // Otherwise treat as metadata-only update
      const metadataUpdate: UpdateFileMetadataRequest = {};

      if (body.altText !== undefined) metadataUpdate.altText = body.altText;
      if (body.titleText !== undefined) metadataUpdate.titleText = body.titleText;
      if (body.seoFilename !== undefined) metadataUpdate.seoFilename = body.seoFilename;

      if (Object.keys(metadataUpdate).length === 0) {
        return createErrorResponse(new Error('No update fields provided.'), 400);
      }

      context.logger.info('Updating media file metadata', {
        metadata: {
          userId: context.userId,
          fileId,
          fields: Object.keys(metadataUpdate),
        },
      });

      await service.updateFileMetadata(fileId, metadataUpdate);

      getAdminActivityService().logActivity({
        adminUserId: parseInt(context.userId!),
        targetEntityType: 'media',
        targetEntityId: fileId,
        actionType: 'media_file_metadata_updated',
        actionCategory: 'update',
        actionDescription: `Updated metadata for media file #${fileId}`,
        afterData: { fileId, fields: Object.keys(metadataUpdate) },
        severity: 'normal',
        ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
        userAgent: context.request.headers.get('user-agent') || undefined,
        sessionId: context.request.cookies.get('bk_session')?.value,
      }).catch(() => {});

      return createSuccessResponse({ updated: true, fileId }, 200);
    },
    {
      requireAuth: true,
      rbac: { action: 'write', resource: 'admin:media' },
    }
  )
);
