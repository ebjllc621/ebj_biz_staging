/**
 * Media Upload API Route
 *
 * Handles file uploads through the Universal Media Manager.
 * Supports multiple file types with automatic thumbnail generation.
 *
 * @authority Universal Media Manager compliance
 * @see .cursor/rules/universal-media-manager.mdc
 * @see .cursor/rules/admin-manager-api-standard.mdc
 */


import { apiHandler, ApiContext, ApiResponse } from '@/core/api/apiHandler';
import { BizError } from '@/core/errors/BizError';
import { getMediaService } from '@core/services/media';
import type { MediaFile } from '@core/services/media';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';

interface UploadResponse {
  file: MediaFile;
  message: string;
}

/**
 * Upload media file handler
 */
async function uploadHandler(context: ApiContext): Promise<ApiResponse<UploadResponse>> {
  try {
    const { request } = context;

    // Parse multipart form data
    const formData = await request.formData();

    // Extract file
    const file = formData.get('file') as File;
    if (!file) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'No file provided',
        context: { field: 'file' },
      });
    }

    // Extract metadata
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const mediaType = formData.get('mediaType') as string | undefined;
    const subfolder = formData.get('subfolder') as string | undefined;
    const generateThumbnailStr = formData.get('generateThumbnail') as string | undefined;

    // Use mediaType as subfolder if provided (organizes files by type: avatar/, cover/, etc.)
    const effectiveSubfolder = subfolder || mediaType;

    // Validate required fields
    if (!entityType || !entityId) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'entityType and entityId are required',
        context: {
          missingFields: [
            !entityType && 'entityType',
            !entityId && 'entityId'
          ].filter(Boolean)
        },
      });
    }

    // Validate entity type (must match PolicyRouter prefixes)
    const allowedEntityTypes = ['listings', 'users', 'sites', 'content', 'system', 'review', 'message', 'jobs', 'events', 'offers'];
    if (!allowedEntityTypes.includes(entityType)) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid entity type',
        context: {
          entityType,
          allowedTypes: allowedEntityTypes
        },
      });
    }

    // Validate file size — video/audio allow 100MB, others 50MB
    const isMediaFile = file.type.startsWith('video/') || file.type.startsWith('audio/');
    const maxFileSize = isMediaFile ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'File size exceeds maximum allowed size',
        context: {
          fileSize: file.size,
          maxFileSize,
          filename: file.name
        },
      });
    }

    // Validate file type
    const allowedMimeTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      // Video (routed to Cloudinary via PolicyRouter for listings/users)
      'video/mp4', 'video/webm', 'video/quicktime',
      // Audio (routed to Cloudinary via PolicyRouter for listings/users)
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/x-m4a',
      // Documents
      'application/pdf', 'text/plain',
      // Archives
      'application/zip', 'application/x-zip-compressed',
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'File type not allowed',
        context: {
          mimeType: file.type,
          filename: file.name,
          allowedTypes: allowedMimeTypes
        },
      });
    }

    // Parse generateThumbnail
    const generateThumbnail = generateThumbnailStr !== 'false';

    // Single-use media types should overwrite existing files (don't flood storage)
    const singleUseTypes = ['avatar', 'cover', 'logo'];
    const shouldOverwrite = mediaType && singleUseTypes.includes(mediaType);

    // Upload file using MediaService
    const mediaService = getMediaService();

    // For single-use types, delete existing files first to prevent storage flooding
    if (shouldOverwrite && effectiveSubfolder) {
      try {
        const existingFiles = await mediaService.list({
          entityType,
          entityId,
          subfolder: effectiveSubfolder,
        });

        // Delete all existing files in this subfolder
        for (const existingFile of existingFiles) {
          // Use cloudinary public_id if available (for Cloudinary files), otherwise use id
          const deleteId = existingFile.cloudinary?.public_id || existingFile.id;
          await mediaService.delete({ fileId: deleteId });
        }
      } catch {
        // Fail silently - continue with upload even if cleanup fails
      }
    }

    const uploadedFile = await mediaService.upload({
      file,
      filename: file.name,
      mimeType: file.type,
      entityType,
      entityId,
      subfolder: effectiveSubfolder || undefined,
      generateThumbnail,
    });

    return {
      success: true,
      data: {
        file: uploadedFile,
        message: 'File uploaded successfully',
      },
    };
  } catch (error) {
    // Re-throw BizErrors as-is
    if (error instanceof BizError) {
      throw error;
    }

    // Wrap other errors
    throw new BizError({
      code: 'UPLOAD_ERROR',
      message: 'Failed to upload file',
      cause: error instanceof Error ? error : undefined,
      context: {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * List media files handler
 */
async function listHandler(context: ApiContext): Promise<ApiResponse<{ files: MediaFile[] }>> {
  try {
    const { request } = context;
    const url = new URL(request.url);

    // Extract query parameters
    const entityType = url.searchParams.get('entityType');
    const entityId = url.searchParams.get('entityId');
    const subfolder = url.searchParams.get('subfolder') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0;

    // Validate required parameters
    if (!entityType || !entityId) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'entityType and entityId are required',
        context: {
          missingFields: [
            !entityType && 'entityType',
            !entityId && 'entityId'
          ].filter(Boolean)
        },
      });
    }

    // List files using MediaService
    const mediaService = getMediaService();
    const files = await mediaService.list({
      entityType,
      entityId,
      subfolder,
      limit,
      offset,
    });

    return {
      success: true,
      data: {
        files,
      },
    };
  } catch (error) {
    // Re-throw BizErrors as-is
    if (error instanceof BizError) {
      throw error;
    }

    // Wrap other errors
    throw new BizError({
      code: 'LIST_ERROR',
      message: 'Failed to list files',
      cause: error instanceof Error ? error : undefined,
      context: {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * Delete media file handler
 * Supports two modes:
 * 1. fileId - Delete a specific file by ID
 * 2. entityType + entityId + subfolder - Delete all files in a subfolder (for avatar/cover removal)
 */
async function deleteHandler(context: ApiContext): Promise<ApiResponse<{ message: string; deletedCount?: number }>> {
  try {
    const { request } = context;
    const url = new URL(request.url);

    // Extract parameters
    const fileId = url.searchParams.get('fileId');
    const entityType = url.searchParams.get('entityType');
    const entityId = url.searchParams.get('entityId');
    const subfolder = url.searchParams.get('subfolder');
    const deleteThumbnailStr = url.searchParams.get('deleteThumbnail');
    const deleteThumbnail = deleteThumbnailStr !== 'false';

    const mediaService = getMediaService();

    // Mode 1: Delete by fileId (cloudinary_public_id or numeric id)
    if (fileId) {
      const success = await mediaService.delete({
        fileId,
        deleteThumbnail,
      });

      if (!success) {
        throw new BizError({
          code: 'NOT_FOUND',
          message: 'File not found or could not be deleted',
          context: { fileId },
        });
      }

      // Also clean up the media_files DB row
      try {
        const db = getDatabaseService();
        await db.query(
          'DELETE FROM media_files WHERE cloudinary_public_id = ? OR id = ?',
          [fileId, fileId]
        );
      } catch {
        // Non-fatal: Cloudinary file is already deleted
      }

      return {
        success: true,
        data: {
          message: 'File deleted successfully',
        },
      };
    }

    // Mode 2: Delete all files in entity subfolder (for avatar/cover removal)
    if (entityType && entityId && subfolder) {
      // List all files in the subfolder
      const existingFiles = await mediaService.list({
        entityType,
        entityId,
        subfolder,
      });

      let deletedCount = 0;
      for (const file of existingFiles) {
        const deleteId = file.cloudinary?.public_id || file.id;
        const success = await mediaService.delete({ fileId: deleteId, deleteThumbnail });
        if (success) deletedCount++;
      }

      return {
        success: true,
        data: {
          message: `Deleted ${deletedCount} file(s) successfully`,
          deletedCount,
        },
      };
    }

    // Neither mode - missing parameters
    throw new BizError({
      code: 'VALIDATION_ERROR',
      message: 'Either fileId OR (entityType + entityId + subfolder) is required',
      context: {
        providedParams: { fileId, entityType, entityId, subfolder }
      },
    });
  } catch (error) {
    // Re-throw BizErrors as-is
    if (error instanceof BizError) {
      throw error;
    }

    // Wrap other errors
    throw new BizError({
      code: 'DELETE_ERROR',
      message: 'Failed to delete file',
      cause: error instanceof Error ? error : undefined,
      context: {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * Main route handler with method routing
 */
async function mediaHandler(context: ApiContext): Promise<ApiResponse<unknown>> {
  const { request } = context;

  switch (request.method) {
    case 'POST':
      return uploadHandler(context);
    case 'GET':
      return listHandler(context);
    case 'DELETE':
      return deleteHandler(context);
    default:
      throw new BizError({
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${request.method} not allowed`,
        context: { allowedMethods: ['POST', 'GET', 'DELETE'] },
      });
  }
}

// Export Next.js route handlers
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(mediaHandler, {
  allowedMethods: ['POST'],
  timeout: 60000, // 60 second timeout for uploads
}));

export const GET = apiHandler(mediaHandler, {
  allowedMethods: ['GET'],
});

// GOVERNANCE: CSRF protection for state-changing operations
export const DELETE = withCsrf(apiHandler(mediaHandler, {
  allowedMethods: ['DELETE'],
  requireAuth: true, // Require authentication for deletions
}));