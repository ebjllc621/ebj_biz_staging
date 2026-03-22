/**
 * Admin Media Directory API - Subdirectory Operations
 *
 * GET    /api/admin/media/directory/[...path] - List a subdirectory
 * PUT    /api/admin/media/directory/[...path] - Rename a folder
 * DELETE /api/admin/media/directory/[...path] - Delete a folder
 *
 * Path extraction: The catch-all [...path] segments are decoded from the URL.
 * Example: GET /api/admin/media/directory/listings/123 → relativePath = "listings/123"
 *
 * @authority Build Map v2.1 ENHANCED - Admin API Route Standard
 * @phase Phase 3 - Admin Media Directory Service
 * @requires Admin authentication + admin:media RBAC
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getMediaDirectoryService } from '@features/media/directory/services/MediaDirectoryService';
import { listDirectory as routedListDirectory, isLocalPath } from '@features/media/directory/services/DirectoryRouter';
import { getPolicyRouter } from '@core/services/media/PolicyRouter';
import type { DirectoryListing } from '@features/media/directory/types/directory-types';
import { RenameFolderRequest } from '@features/media/directory/types/directory-types';

/**
 * Extract the relative path from the request URL.
 * Strips the /api/admin/media/directory/ prefix and URL-decodes the remainder.
 *
 * @param context - ApiContext with a NextRequest
 * @returns Decoded relative path string
 */
function extractRelativePath(context: ApiContext): string {
  const url = new URL(context.request.url);
  const prefix = '/api/admin/media/directory/';
  const rawPath = url.pathname.startsWith(prefix)
    ? url.pathname.slice(prefix.length)
    : url.pathname;
  return decodeURIComponent(rawPath).replace(/\/+$/, ''); // strip trailing slashes
}

/**
 * Enrich Cloudinary directory entries with mediaFileId, altText, titleText
 * from the media_files DB table. Matches on url or cloudinary_public_id.
 */
interface MediaFileLookupRow {
  id: number;
  url: string;
  cloudinary_public_id: string | null;
  alt_text: string | null;
  title_text: string | null;
}

async function enrichWithMediaFileIds(listing: DirectoryListing): Promise<DirectoryListing> {
  const fileEntries = listing.entries.filter((e) => e.type === 'file');
  if (fileEntries.length === 0) return listing;

  const db = getDatabaseService();

  // Collect all URLs and paths (public_ids) for lookup
  const urls = fileEntries.map((e) => e.url).filter((u): u is string => !!u);
  const paths = fileEntries.map((e) => e.path).filter(Boolean);
  const lookupValues = [...new Set([...urls, ...paths])];

  // Build lookup maps from existing DB rows
  const byUrl = new Map<string, MediaFileLookupRow>();
  const byPublicId = new Map<string, MediaFileLookupRow>();

  if (lookupValues.length > 0) {
    const placeholders = lookupValues.map(() => '?').join(', ');
    const result = await db.query<MediaFileLookupRow>(
      `SELECT id, url, cloudinary_public_id, alt_text, title_text
       FROM media_files
       WHERE url IN (${placeholders}) OR cloudinary_public_id IN (${placeholders})`,
      [...lookupValues, ...lookupValues]
    );

    for (const row of result.rows) {
      if (row.url) byUrl.set(row.url, row);
      if (row.cloudinary_public_id) byPublicId.set(row.cloudinary_public_id, row);
    }
  }

  // Auto-register unmatched Cloudinary files in media_files
  const unmatched = fileEntries.filter((entry) => {
    if (!entry.url) return false;
    return !byUrl.has(entry.url) && !byPublicId.has(entry.path);
  });

  if (unmatched.length > 0) {
    for (const entry of unmatched) {
      try {
        const fileType = (entry.mimeType ?? 'application/octet-stream').split('/')[0] ?? 'raw';
        const entityType = entry.path.split('/')[0] ?? '';
        const storageType = getPolicyRouter().routeProvider(entityType);
        const insertResult = await db.query(
          `INSERT INTO media_files (storage_type, path, url, cloudinary_public_id, file_type, file_size)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [storageType, entry.path, entry.url ?? '', entry.path, fileType, entry.size ?? 0]
        );
        const newId = insertResult.insertId ?? 0;
        if (newId > 0) {
          const newRow: MediaFileLookupRow = {
            id: newId,
            url: entry.url ?? '',
            cloudinary_public_id: entry.path,
            alt_text: null,
            title_text: null,
          };
          byUrl.set(entry.url ?? '', newRow);
          byPublicId.set(entry.path, newRow);
        }
      } catch (err) {
        console.error('[enrichWithMediaFileIds] Failed to auto-register file:', entry.path, err);
      }
    }
  }

  // Enrich entries with DB data
  const enrichedEntries = listing.entries.map((entry) => {
    if (entry.type !== 'file') return entry;
    const match = (entry.url ? byUrl.get(entry.url) : undefined) ?? byPublicId.get(entry.path);
    if (!match) return entry;
    return {
      ...entry,
      mediaFileId: match.id,
      // Prefer Cloudinary context values (already on entry from search API)
      // over DB values, so SEO badge reflects actual Cloudinary state
      altText: entry.altText || match.alt_text || undefined,
      titleText: entry.titleText || match.title_text || undefined,
    };
  });

  return { ...listing, entries: enrichedEntries };
}

/**
 * GET /api/admin/media/directory/[...path]
 * List a subdirectory (routes to local or Cloudinary based on path).
 */
export const GET = apiHandler(
  async (context: ApiContext) => {
    const relativePath = extractRelativePath(context);
    const source = isLocalPath(relativePath) ? 'local' : 'cloudinary';

    context.logger.info('Listing media subdirectory', {
      metadata: { userId: context.userId, relativePath, source },
    });

    let listing = await routedListDirectory(relativePath);

    // Enrich Cloudinary entries with DB metadata (mediaFileId, altText, titleText)
    if (source === 'cloudinary') {
      listing = await enrichWithMediaFileIds(listing);
    }

    return createSuccessResponse({ listing }, 200);
  },
  {
    requireAuth: true,
    rbac: { action: 'read', resource: 'admin:media' },
  }
);

/**
 * PUT /api/admin/media/directory/[...path]
 * Rename a folder within the media sandbox.
 *
 * Body: { newName: string }
 */
export const PUT = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const relativePath = extractRelativePath(context);
      const body = (await context.request.json()) as Partial<RenameFolderRequest>;

      const newName = typeof body.newName === 'string' ? body.newName.trim() : '';

      if (!newName) {
        return createErrorResponse(new Error('newName is required.'), 400);
      }

      if (!relativePath) {
        return createErrorResponse(new Error('Cannot rename the media root directory.'), 400);
      }

      context.logger.info('Renaming media folder', {
        metadata: { userId: context.userId, relativePath, newName },
      });

      const service = getMediaDirectoryService();
      const folder = await service.renameFolder(relativePath, newName);

      return createSuccessResponse({ folder }, 200);
    },
    {
      requireAuth: true,
      rbac: { action: 'write', resource: 'admin:media' },
    }
  )
);

/**
 * DELETE /api/admin/media/directory/[...path]
 * Delete a folder and its contents from the media sandbox.
 *
 * WARNING: This is destructive and also removes media_files DB records.
 */
export const DELETE = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const relativePath = extractRelativePath(context);

      if (!relativePath) {
        return createErrorResponse(new Error('Cannot delete the media root directory.'), 400);
      }

      context.logger.info('Deleting media folder', {
        metadata: { userId: context.userId, relativePath },
      });

      const service = getMediaDirectoryService();
      await service.deleteFolder(relativePath);

      return createSuccessResponse({ deleted: true, path: relativePath }, 200);
    },
    {
      requireAuth: true,
      rbac: { action: 'delete', resource: 'admin:media' },
    }
  )
);
