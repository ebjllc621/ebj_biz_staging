/**
 * Admin Media Directory API - Root Operations
 *
 * GET  /api/admin/media/directory - List root media directory
 * POST /api/admin/media/directory - Create a new folder
 *
 * @authority Build Map v2.1 ENHANCED - Admin API Route Standard
 * @phase Phase 3 - Admin Media Directory Service
 * @requires Admin authentication + admin:media RBAC
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getMediaDirectoryService } from '@features/media/directory/services/MediaDirectoryService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { listDirectory as routedListDirectory } from '@features/media/directory/services/DirectoryRouter';
import type { CreateFolderRequest } from '@features/media/directory/types/directory-types';

/**
 * GET /api/admin/media/directory
 * List the root media directory (hybrid: local + Cloudinary).
 */
export const GET = apiHandler(
  async (context: ApiContext) => {
    context.logger.info('Listing root media directory (hybrid)', {
      metadata: { userId: context.userId },
    });

    const listing = await routedListDirectory('');

    return createSuccessResponse({ listing }, 200);
  },
  {
    requireAuth: true,
    rbac: { action: 'read', resource: 'admin:media' },
  }
);

/**
 * POST /api/admin/media/directory
 * Create a new folder within the media sandbox.
 *
 * Body: { parentPath: string, name: string }
 */
export const POST = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const body = (await context.request.json()) as Partial<CreateFolderRequest>;

      const parentPath = typeof body.parentPath === 'string' ? body.parentPath : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';

      if (!name) {
        return createErrorResponse(new Error('Folder name is required.'), 400);
      }

      context.logger.info('Creating media folder', {
        metadata: { userId: context.userId, parentPath, name },
      });

      const service = getMediaDirectoryService();
      const folder = await service.createFolder(parentPath, name);

      getAdminActivityService().logActivity({
        adminUserId: parseInt(context.userId!),
        targetEntityType: 'media',
        targetEntityId: null,
        actionType: 'media_folder_created',
        actionCategory: 'creation',
        actionDescription: `Created media folder "${name}" in "${parentPath || '/'}"`,
        afterData: { parentPath, name },
        severity: 'normal',
        ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
        userAgent: context.request.headers.get('user-agent') || undefined,
        sessionId: context.request.cookies.get('bk_session')?.value,
      }).catch(() => {});

      return createSuccessResponse({ folder }, 201);
    },
    {
      requireAuth: true,
      rbac: { action: 'write', resource: 'admin:media' },
    }
  )
);
