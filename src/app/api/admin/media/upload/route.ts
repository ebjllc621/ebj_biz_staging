/**
 * Admin Media Upload API Route
 *
 * POST /api/admin/media/upload - Upload a file to a specific directory path
 *
 * Accepts multipart form data with:
 *   - file: The file to upload
 *   - directoryPath: Target directory path (e.g., "listings/10/images", "site/logos")
 *
 * Uses the existing MediaService upload pipeline (Cloudinary for most paths,
 * local for site/ and marketing/).
 *
 * @authority Build Map v2.1 ENHANCED - Admin API Route Standard
 * @phase Admin Media Manager - Upload Integration
 * @requires Admin authentication + admin:media RBAC
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getMediaService } from '@core/services/media';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';

/** Allowed MIME types for admin uploads */
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  // Documents
  'application/pdf', 'text/plain',
  // Archives
  'application/zip', 'application/x-zip-compressed',
  // Video
  'video/mp4', 'video/webm',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/admin/media/upload
 * Upload a file to a specific directory in the media system.
 */
export const POST = withCsrf(
  apiHandler(
    async (context: ApiContext) => {
      const formData = await context.request.formData();

      // Extract file
      const file = formData.get('file') as File | null;
      if (!file) {
        return createErrorResponse(new Error('No file provided'), 400);
      }

      // Extract directory path and SEO metadata
      const directoryPath = (formData.get('directoryPath') as string || '').trim();
      const altText = (formData.get('altText') as string || '').trim() || null;
      const titleText = (formData.get('titleText') as string || '').trim() || null;

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return createErrorResponse(
          new Error(`File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum 50MB`),
          400
        );
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return createErrorResponse(
          new Error(`File type "${file.type}" is not allowed`),
          400
        );
      }

      context.logger.info('Admin media upload', {
        metadata: {
          userId: context.userId,
          directoryPath,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });

      // Parse directory path into entityType/entityId/subfolder
      // e.g., "listings/10/images" → entityType=listings, entityId=10, subfolder=images
      // e.g., "site/logos" → entityType=sites, entityId=general, subfolder=logos
      // e.g., "" (root) → entityType=system, entityId=general, subfolder=undefined
      const segments = directoryPath ? directoryPath.split('/').filter(Boolean) : [];
      let entityType: string;
      let entityId: string;
      let subfolder: string | undefined;

      if (segments.length >= 3) {
        // Three+ segments like "listings/10/images/gallery"
        entityType = segments[0] as string;
        entityId = segments[1] as string;
        subfolder = segments.slice(2).join('/');
      } else if (segments.length === 2) {
        // Two segments like "listings/10" or "site/logos"
        entityType = segments[0] as string;
        entityId = segments[1] as string;
      } else if (segments.length === 1) {
        // Single segment like "site" or "Cloudstock"
        entityType = segments[0] as string;
        entityId = 'general';
      } else {
        // Root directory upload
        entityType = 'system';
        entityId = 'general';
      }

      // Upload through MediaService
      const mediaService = getMediaService();

      console.log('[UPLOAD-ROUTE] Starting upload via MediaService', {
        entityType,
        entityId,
        subfolder,
        filename: file.name,
        directoryPath,
      });

      const uploadedFile = await mediaService.upload({
        file,
        filename: file.name,
        mimeType: file.type,
        entityType,
        entityId,
        subfolder,
        generateThumbnail: file.type.startsWith('image/'),
        altText,
        titleText,
      });

      // Register file in media_files DB with SEO metadata from the upload form.
      // This runs for ALL uploads (local-primary AND Cloudinary-primary) so the
      // SEO health badge has a reliable data source regardless of Cloudinary
      // search index delays.
      try {
        const db = getDatabaseService();
        const localPath = uploadedFile.local?.path || '';
        let storageType: string;
        let relativePath: string;
        let publicUrl: string;
        let cloudinaryPublicId: string | null;

        if (localPath) {
          // Local-primary: path is relative to public/uploads/
          storageType = 'local';
          relativePath = localPath
            .replace(/\\/g, '/')
            .replace(/^.*?public\/uploads\//, '');
          publicUrl = `/uploads/${relativePath}`;
          const isImage = file.type.startsWith('image/');
          cloudinaryPublicId = uploadedFile.cloudinary?.public_id || (
            isImage ? relativePath.replace(/\.[^.]+$/, '') : relativePath
          );
        } else {
          // Cloudinary-primary: path is the Cloudinary folder path
          storageType = 'cloudinary';
          cloudinaryPublicId = uploadedFile.cloudinary?.public_id || null;
          // Use the directoryPath + filename as the path (e.g. "jobs/8/gallery/filename.jpg")
          relativePath = directoryPath
            ? `${directoryPath}/${file.name}`
            : file.name;
          publicUrl = uploadedFile.url || '';
        }

        await db.query(
          `INSERT INTO media_files (storage_type, path, url, cloudinary_public_id, file_type, file_size, alt_text, title_text)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [storageType, relativePath, publicUrl, cloudinaryPublicId, file.type, file.size, altText, titleText]
        );
      } catch (dbErr) {
        context.logger.warn('Failed to register uploaded file in DB', {
          metadata: { error: dbErr instanceof Error ? dbErr.message : 'Unknown' },
        });
      }

      // Check if Cloudinary backup was successful (indicated by cloudinary field on result)
      const hasCloudinaryBackup = !!uploadedFile.cloudinary?.url;
      const isLocalPrimary = ['site', 'sites', 'content', 'system'].some(
        p => entityType.startsWith(p)
      );
      const cloudinaryBackup = isLocalPrimary
        ? (hasCloudinaryBackup ? 'success' : 'failed')
        : 'not-applicable';

      console.log('[UPLOAD-ROUTE] Upload complete', {
        fileId: uploadedFile.id,
        hasCloudinaryBackup,
        isLocalPrimary,
        cloudinaryBackup,
        cloudinaryUrl: uploadedFile.cloudinary?.url || 'none',
      });

      const adminActivityService = getAdminActivityService();
      await adminActivityService.logActivity({
        adminUserId: parseInt(context.userId!),
        targetEntityType: 'media',
        targetEntityId: uploadedFile.id ? parseInt(String(uploadedFile.id)) : null,
        actionType: 'media_uploaded',
        actionCategory: 'creation',
        actionDescription: `Uploaded file "${file.name}" to ${directoryPath || 'root'}`,
        afterData: { filename: file.name, directoryPath, mimeType: file.type, size: file.size },
        severity: 'normal'
      });

      return createSuccessResponse({
        file: uploadedFile,
        message: 'File uploaded successfully',
        cloudinaryBackup,
      }, 201);
    },
    {
      requireAuth: true,
      rbac: { action: 'write', resource: 'admin:media' },
      timeout: 60000, // 60s for uploads
    }
  )
);
