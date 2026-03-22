/**
 * Admin Media SEO API
 *
 * GET  /api/admin/media/seo - List files missing SEO metadata (alt_text IS NULL or empty)
 * PUT  /api/admin/media/seo - Bulk update SEO metadata for multiple files
 *
 * @authority Build Map v2.1 ENHANCED - Admin API Route Standard
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 * @requires Admin authentication + admin:media RBAC + CSRF (PUT)
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { getMediaDirectoryService } from '@features/media/directory/services/MediaDirectoryService';
import { getPolicyRouter } from '@core/services/media/PolicyRouter';
import type { BatchOperationResult } from '@features/media/directory/types/directory-types';

// DbResult import not needed - using db.query().rows pattern directly

// ============================================================================
// TYPES
// ============================================================================

interface SEOFileRow {
  id: number;
  filename: string;
  file_path: string;
  alt_text: string | null;
  title_text: string | null;
  seo_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface SEOUpdateItem {
  fileId?: number;
  filePath?: string;
  fileUrl?: string;
  altText?: string;
  titleText?: string;
}

interface SEOUpdateBody {
  updates: SEOUpdateItem[];
}

// ============================================================================
// GET - List files missing SEO metadata
// ============================================================================

export const GET = apiHandler(
  async (context: ApiContext) => {
    const url = new URL(context.request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;

    const db = getDatabaseService();

    // Count total files missing alt text
    const countResult = await db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) AS total FROM media_files WHERE alt_text IS NULL OR alt_text = ''`
    );
    const total = countResult.rows[0] ? bigIntToNumber(countResult.rows[0].total) : 0;

    // Fetch paginated files missing alt text
    const rowsResult = await db.query<SEOFileRow>(
      `SELECT id, filename, file_path, alt_text, title_text, seo_filename, mime_type, file_size, created_at
       FROM media_files
       WHERE alt_text IS NULL OR alt_text = ''
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Map to lightweight items for the SEO editor
    const items = rowsResult.rows.map((row) => ({
      mediaFileId: row.id,
      name: row.filename,
      path: row.file_path,
      type: 'file' as const,
      altText: row.alt_text ?? '',
      titleText: row.title_text ?? '',
      seoFilename: row.seo_filename ?? '',
      mimeType: row.mime_type ?? '',
      size: row.file_size ?? 0,
      modifiedAt: row.created_at,
    }));

    return createSuccessResponse(
      {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      200
    );
  },
  {
    requireAuth: true,
    rbac: { action: 'read', resource: 'admin:media' },
  }
);

// ============================================================================
// PUT - Bulk update SEO metadata
// ============================================================================

export const PUT = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const body = (await context.request.json()) as SEOUpdateBody;

      if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
        return createErrorResponse(new Error('updates is required and must be a non-empty array.'), 400);
      }

      const db = getDatabaseService();
      const service = getMediaDirectoryService();

      const result: BatchOperationResult = {
        total: body.updates.length,
        succeeded: 0,
        failed: 0,
        errors: [],
      };

      for (const update of body.updates) {
        let resolvedFileId = update.fileId;

        // Auto-register files without a DB record
        if (!resolvedFileId && update.filePath) {
          try {
            const existing = await db.query<{ id: number }>(
              `SELECT id FROM media_files WHERE path = ? OR url = ? LIMIT 1`,
              [update.filePath, update.fileUrl ?? update.filePath]
            );

            if (existing.rows[0]) {
              resolvedFileId = bigIntToNumber(existing.rows[0].id);
            } else {
              const entityType = update.filePath.split('/')[0] ?? '';
              const storageType = getPolicyRouter().routeProvider(entityType);
              // Infer proper MIME type from file extension
              const ext = (update.filePath.split('.').pop() ?? '').toLowerCase();
              const mimeMap: Record<string, string> = {
                jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
                bmp: 'image/bmp', ico: 'image/x-icon',
                mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
                pdf: 'application/pdf',
              };
              const fileType = mimeMap[ext] ?? 'application/octet-stream';
              // Cloudinary public_ids for images do NOT include the file extension
              // e.g. site/branding/logo-icon.png → public_id: site/branding/logo-icon
              let cloudinaryPublicId: string | null = null;
              if (storageType === 'cloudinary' && update.filePath) {
                const isImageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
                cloudinaryPublicId = isImageExt
                  ? update.filePath.replace(/\.[^.]+$/, '')
                  : update.filePath;
              }
              const insertResult = await db.query(
                `INSERT INTO media_files (storage_type, path, url, cloudinary_public_id, file_type, file_size)
                 VALUES (?, ?, ?, ?, ?, 0)`,
                [
                  storageType,
                  update.filePath,
                  update.fileUrl ?? '',
                  cloudinaryPublicId,
                  fileType,
                ]
              );
              resolvedFileId = bigIntToNumber(insertResult.insertId ?? 0);
            }
          } catch (regErr) {
            result.failed++;
            result.errors.push({
              fileId: 0,
              error: `Auto-register failed: ${regErr instanceof Error ? regErr.message : 'Unknown error'}`,
            });
            continue;
          }
        }

        if (!resolvedFileId || (typeof resolvedFileId === 'number' && resolvedFileId <= 0)) {
          result.failed++;
          result.errors.push({
            fileId: resolvedFileId ?? 0,
            error: 'Invalid fileId and no filePath provided for auto-registration',
          });
          continue;
        }

        try {
          const syncResult = await service.updateFileMetadata(resolvedFileId, {
            altText: update.altText,
            titleText: update.titleText,
          });
          result.succeeded++;
          // Surface Cloudinary sync failures so the user sees them
          if (syncResult.cloudinarySyncError) {
            result.errors.push({
              fileId: resolvedFileId,
              error: `DB saved but Cloudinary sync failed: ${syncResult.cloudinarySyncError}`,
            });
          }
        } catch (err) {
          result.failed++;
          result.errors.push({
            fileId: resolvedFileId,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      context.logger.info('Bulk SEO update completed', {
        metadata: {
          userId: context.userId,
          total: result.total,
          succeeded: result.succeeded,
          failed: result.failed,
        },
      });

      return createSuccessResponse({ result }, 200);
    },
    {
      requireAuth: true,
      rbac: { action: 'write', resource: 'admin:media' },
    }
  )
);
