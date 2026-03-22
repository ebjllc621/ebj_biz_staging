/**
 * User Media SEO API
 *
 * PUT /api/media/[id]/seo - Update SEO metadata for a media file
 *
 * Auth: requireAuth (no RBAC). Verifies listing ownership before update.
 * The authenticated user must own a listing that references this media file
 * via entity_media_relationships.
 *
 * @authority Build Map v2.1 ENHANCED - API Route Standard
 * @phase Phase 6 - Integration & Navigation Wiring
 * @requires User authentication + listing ownership + CSRF (PUT)
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getMediaDirectoryService } from '@features/media/directory/services/MediaDirectoryService';

// ============================================================================
// TYPES
// ============================================================================

interface SEOUpdateBody {
  altText?: string;
  titleText?: string;
}

interface EntityRelationshipRow {
  entity_type: string;
  entity_id: number;
}

interface ListingOwnershipRow {
  id: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract the [id] segment from path /api/media/[id]/seo
 * Finds 'media' in segments, then +1 is the file ID.
 */
function extractFileId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const mediaIndex = segments.indexOf('media');
  if (mediaIndex === -1 || mediaIndex + 1 >= segments.length) return NaN;
  const idSegment = segments[mediaIndex + 1];
  if (!idSegment) return NaN;
  return parseInt(idSegment, 10);
}

// ============================================================================
// PUT - Update SEO metadata for a single media file
// ============================================================================

export const PUT = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const fileId = extractFileId(context);

      // Validate file ID
      if (isNaN(fileId) || fileId <= 0) {
        return createErrorResponse(new Error('Invalid media file ID.'), 400);
      }

      // Parse and validate request body
      const body = (await context.request.json()) as SEOUpdateBody;
      const { altText, titleText } = body;

      if (altText !== undefined && typeof altText === 'string' && altText.length > 255) {
        return createErrorResponse(new Error('altText must be 255 characters or fewer.'), 400);
      }
      if (titleText !== undefined && typeof titleText === 'string' && titleText.length > 60) {
        return createErrorResponse(new Error('titleText must be 60 characters or fewer.'), 400);
      }

      const db = getDatabaseService();

      // Verify ownership: check entity_media_relationships first
      const relResult = await db.query<EntityRelationshipRow>(
        `SELECT entity_type, entity_id
         FROM entity_media_relationships
         WHERE media_file_id = ?
         LIMIT 1`,
        [fileId]
      );

      const relationship = relResult.rows[0];
      let ownershipVerified = false;

      if (relationship) {
        if (relationship.entity_type !== 'listing') {
          return createErrorResponse(new Error('Access denied: media file is not associated with a listing.'), 403);
        }

        const ownerResult = await db.query<ListingOwnershipRow>(
          `SELECT id FROM listings WHERE id = ? AND user_id = ?`,
          [relationship.entity_id, context.userId]
        );
        ownershipVerified = !!ownerResult.rows[0];
      }

      // Fallback: check if file URL exists in any listing media columns owned by user
      // Covers logo_url, cover_image_url, gallery_images, video_gallery (JSON), video_url, and audio_url
      if (!ownershipVerified) {
        const fileResult = await db.query<{ url: string }>(
          `SELECT url FROM media_files WHERE id = ? LIMIT 1`,
          [fileId]
        );
        const fileUrl = fileResult.rows[0]?.url;

        if (fileUrl) {
          const mediaOwnerResult = await db.query<ListingOwnershipRow>(
            `SELECT id FROM listings
             WHERE user_id = ? AND (
               logo_url = ?
               OR cover_image_url = ?
               OR gallery_images LIKE ?
               OR video_gallery LIKE ?
               OR video_url = ?
               OR audio_url = ?
             )
             LIMIT 1`,
            [context.userId, fileUrl, fileUrl, `%${fileUrl}%`, `%${fileUrl}%`, fileUrl, fileUrl]
          );
          ownershipVerified = !!mediaOwnerResult.rows[0];
        }
      }

      if (!ownershipVerified) {
        return createErrorResponse(new Error('Access denied: you do not own a listing with this media file.'), 403);
      }

      // Perform the SEO metadata update
      const service = getMediaDirectoryService();
      await service.updateFileMetadata(fileId, {
        altText: altText ?? undefined,
        titleText: titleText ?? undefined,
      });

      context.logger.info('User media SEO updated', {
        metadata: {
          userId: context.userId,
          fileId,
          listingId: relationship?.entity_id,
        },
      });

      return createSuccessResponse({ updated: true, fileId }, 200);
    },
    {
      requireAuth: true,
    }
  )
);
