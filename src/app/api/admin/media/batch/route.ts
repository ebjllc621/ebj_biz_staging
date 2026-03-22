/**
 * Admin Media Batch Operations API
 *
 * POST /api/admin/media/batch - Execute batch operations on multiple files
 *
 * @authority Build Map v2.1 ENHANCED - Admin API Route Standard
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 * @requires Admin authentication + admin:media RBAC + CSRF
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getMediaDirectoryService } from '@features/media/directory/services/MediaDirectoryService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import type { BatchOperationRequest, BatchOperationResult } from '@features/media/directory/types/directory-types';

export const POST = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const body = (await context.request.json()) as BatchOperationRequest;

      // Validate fileIds
      if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
        return createErrorResponse(new Error('fileIds is required and must be a non-empty array.'), 400);
      }

      // Validate operation
      if (!['delete', 'move', 'copy'].includes(body.operation)) {
        return createErrorResponse(new Error('operation must be delete, move, or copy.'), 400);
      }

      // Validate destinationPath for move/copy
      if (
        (body.operation === 'move' || body.operation === 'copy') &&
        body.destinationPath === undefined
      ) {
        return createErrorResponse(new Error('destinationPath is required for move and copy operations.'), 400);
      }

      const service = getMediaDirectoryService();

      const result: BatchOperationResult = {
        total: body.fileIds.length,
        succeeded: 0,
        failed: 0,
        errors: [],
      };

      for (const fileId of body.fileIds) {
        try {
          switch (body.operation) {
            case 'delete':
              await service.deleteFile(fileId);
              break;
            case 'move':
              await service.moveFile(fileId, body.destinationPath!);
              break;
            case 'copy':
              await service.copyFile(fileId, body.destinationPath!);
              break;
          }
          result.succeeded++;
        } catch (err) {
          result.failed++;
          result.errors.push({
            fileId,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      context.logger.info('Batch operation completed', {
        metadata: {
          userId: context.userId,
          operation: body.operation,
          total: result.total,
          succeeded: result.succeeded,
          failed: result.failed,
        },
      });

      const actionCategory = body.operation === 'delete' ? 'deletion' : 'update';
      const severity = body.operation === 'delete' ? 'high' : 'normal';
      getAdminActivityService().logActivity({
        adminUserId: parseInt(context.userId!),
        targetEntityType: 'media',
        targetEntityId: null,
        actionType: `media_batch_${body.operation}`,
        actionCategory,
        actionDescription: `Batch ${body.operation} of ${result.total} media files (${result.succeeded} succeeded, ${result.failed} failed)`,
        afterData: { operation: body.operation, fileIds: body.fileIds, destinationPath: body.destinationPath, total: result.total, succeeded: result.succeeded, failed: result.failed },
        severity,
        ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
        userAgent: context.request.headers.get('user-agent') || undefined,
        sessionId: context.request.cookies.get('bk_session')?.value,
      }).catch(() => {});

      return createSuccessResponse({ result }, 200);
    },
    {
      requireAuth: true,
      rbac: { action: 'write', resource: 'admin:media' },
    }
  )
);
