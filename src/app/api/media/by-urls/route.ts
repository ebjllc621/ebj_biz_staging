/**
 * Media By URLs API
 *
 * POST /api/media/by-urls - Look up media file metadata by Cloudinary URLs
 *
 * Auth: requireAuth. Returns SEO metadata for gallery images.
 * Used by GalleryManager to fetch alt/title for display and editing.
 *
 * @authority Build Map v2.1 ENHANCED - API Route Standard
 * @phase Gallery Grid Enhancement - Brain Plan 3-9-26
 * @requires User authentication + CSRF (POST)
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';

// ============================================================================
// TYPES
// ============================================================================

interface ByUrlsRequestBody {
  urls: string[];
}

interface MediaFileRow {
  id: number;
  url: string;
  alt_text: string | null;
  title_text: string | null;
  cloudinary_public_id: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract Cloudinary public_id from a full Cloudinary URL.
 * e.g. https://res.cloudinary.com/xxx/image/upload/v123/listings/8/gallery/file.png
 *   -> listings/8/gallery/file
 */
function extractPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match?.[1] ?? null;
}

/**
 * Detect file type from URL extension.
 */
function detectFileType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  // Detect video/audio providers by domain
  if (/youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|rumble\.com|tiktok\.com/i.test(url)) return 'video';
  if (/soundcloud\.com|spotify\.com/i.test(url)) return 'audio';
  return 'raw';
}

// ============================================================================
// POST - Look up media file metadata by Cloudinary URLs
// ============================================================================

export const POST = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const body = (await context.request.json()) as ByUrlsRequestBody;
      const { urls } = body;

      if (!Array.isArray(urls) || urls.length === 0) {
        return createErrorResponse(new Error('urls must be a non-empty array.'), 400);
      }

      if (urls.length > 100) {
        return createErrorResponse(new Error('Maximum 100 URLs per request.'), 400);
      }

      // Validate all entries are strings
      if (!urls.every((u) => typeof u === 'string')) {
        return createErrorResponse(new Error('All urls must be strings.'), 400);
      }

      const db = getDatabaseService();

      // Build parameterized placeholders: ?,?,?,...
      const placeholders = urls.map(() => '?').join(', ');
      const result = await db.query<MediaFileRow>(
        `SELECT id, url, alt_text, title_text, cloudinary_public_id
         FROM media_files
         WHERE url IN (${placeholders})`,
        urls
      );

      // Build url -> row map from existing results
      const foundByUrl = new Map<string, MediaFileRow>();
      for (const row of result.rows) {
        foundByUrl.set(row.url, row);
      }

      // Auto-register any Cloudinary URLs not yet in media_files
      const missingUrls = urls.filter((u) => !foundByUrl.has(u));

      for (const url of missingUrls) {
        const publicId = extractPublicId(url);

        try {
          const fileType = detectFileType(url);
          // Cloudinary URLs get storage_type 'cloudinary' with public_id
          // Embed URLs (YouTube, Rumble, etc.) get storage_type 'local' — SEO data lives in our DB
          const storageType = publicId ? 'cloudinary' : 'local';
          const storedPath = publicId || url;
          const insertResult = await db.query(
            `INSERT INTO media_files (storage_type, path, url, cloudinary_public_id, file_type, file_size)
             VALUES (?, ?, ?, ?, ?, 0)`,
            [storageType, storedPath, url, publicId, fileType]
          );
          const newId = insertResult.insertId ?? 0;
          if (newId > 0) {
            foundByUrl.set(url, {
              id: newId,
              url,
              alt_text: null,
              title_text: null,
              cloudinary_public_id: publicId,
            });
          }
        } catch (err) {
          console.error('[by-urls] Failed to auto-register:', url, err);
        }
      }

      const items = urls
        .map((url) => {
          const row = foundByUrl.get(url);
          if (!row) return null;
          return {
            url: row.url,
            fileId: row.id,
            altText: row.alt_text ?? '',
            titleText: row.title_text ?? '',
            cloudinaryPublicId: row.cloudinary_public_id ?? '',
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return createSuccessResponse({ items }, 200);
    },
    {
      requireAuth: true,
    }
  )
);
