/**
 * Universal Media Manager Service
 *
 * Central service for media operations with provider abstraction.
 * Follows service layer architecture standards and supports multiple storage backends.
 *
 * @authority Service Architecture Standards v2.0
 * @compliance E2.5 - Service Location Migration
 * @see .cursor/rules/service-architecture-standards.mdc
 * @see .cursor/rules/universal-media-manager.mdc
 * @migrated-from src/services/media/MediaService.ts
 */

import { CoreService, ServiceConfig, ServiceHealth } from '@core/services/CoreService';
import {
  IMediaProvider,
  MediaUploadOptions,
  MediaFile,
  MediaListOptions,
  MediaDeleteOptions,
  MediaProviderType,
  MediaProviderConfig,
  LegacyUploadOptions,
  LegacyMediaFile,
  LegacyMediaQueryOptions,
  EntityMediaRelationship,
  MediaStatistics,
} from './types';
import { LocalMediaProvider, LocalMediaProviderConfig } from './providers/LocalMediaProvider';
import { CloudinaryMediaProvider, CloudinaryMediaProviderConfig } from './providers/CloudinaryMediaProvider';
import { PolicyRouter, getPolicyRouter } from './PolicyRouter';
import { MirrorService, getMirrorService } from './MirrorService';
import path from 'path';

export interface MediaServiceConfig extends ServiceConfig {
  /** Local provider configuration */
  localProvider: MediaProviderConfig;
  /** Cloudinary provider configuration */
  cloudinaryProvider?: MediaProviderConfig;
  /** Enable policy-based routing */
  policyRoutingEnabled: boolean;
}

export class MediaService extends CoreService {
  private localProvider: IMediaProvider;
  private cloudinaryProvider?: IMediaProvider;
  private mediaConfig: MediaServiceConfig;
  private policyRouter: PolicyRouter;
  private mirrorService: MirrorService;

  constructor() {
    const config = {
      name: 'MediaService',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
    super(config);
    this.mediaConfig = this.loadConfig();
    this.localProvider = this.createLocalProvider();
    this.cloudinaryProvider = this.createCloudinaryProvider();
    this.policyRouter = getPolicyRouter();
    this.mirrorService = getMirrorService();
  }

  /**
   * Upload a file to media storage with policy-based routing
   * @param options Upload configuration
   * @returns Promise resolving to uploaded file metadata
   */
  async upload(options: MediaUploadOptions): Promise<MediaFile> {
    try {
      this.logger.info('Uploading media file with policy routing', {
        operation: 'upload',
        metadata: {
          filename: options.filename,
          entityType: options.entityType,
          entityId: options.entityId,
          mimeType: options.mimeType,
          policyRoutingEnabled: this.mediaConfig.policyRoutingEnabled,
        },
      });

      let result: MediaFile;
      let targetProvider: MediaProviderType;

      if (this.mediaConfig.policyRoutingEnabled) {
        // Use PolicyRouter to determine the target provider
        targetProvider = this.policyRouter.routeProvider(options.entityType, options.entityId, options.subfolder);

        // Route to the appropriate provider
        if (targetProvider === 'cloudinary' && this.cloudinaryProvider) {
          // User-generated content → Cloudinary only (NO local mirror)
          result = await this.cloudinaryProvider.upload(options);
        } else {
          // Site assets → Local storage
          result = await this.localProvider.upload(options);
          targetProvider = 'local';

          // Push backup to Cloudinary for site/marketing uploads (awaited, not fire-and-forget).
          // In Next.js, fire-and-forget async work can be killed after the response is sent.
          // We await the backup but don't fail the upload if backup fails.
          if (this.policyRouter.shouldMirror(options.entityType, options.entityId, options.subfolder)) {
            try {
              await this.triggerAsyncBackup(result, { altText: options.altText, titleText: options.titleText });
            } catch (backupError) {
              this.logger.warn('Cloudinary backup failed (upload still succeeded locally)', {
                operation: 'backup',
                metadata: {
                  fileId: result.id,
                  error: backupError instanceof Error ? backupError.message : 'Unknown error',
                },
              });
            }
          }
        }
      } else {
        // Legacy mode: use local provider only
        result = await this.localProvider.upload(options);
        targetProvider = 'local';
      }

      this.logger.info('Media file uploaded successfully', {
        operation: 'upload',
        metadata: {
          fileId: result.id,
          url: result.url,
          size: result.size,
          provider: targetProvider,
          origin: result.origin,
        },
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to upload media file', error instanceof Error ? error : undefined, {
        operation: 'upload',
        metadata: {
          filename: options.filename,
          entityType: options.entityType,
          entityId: options.entityId,
        },
      });
      throw error;
    }
  }

  /**
   * List media files for an entity from the system of record
   * @param options List configuration
   * @returns Promise resolving to array of file metadata
   */
  async list(options: MediaListOptions): Promise<MediaFile[]> {
    try {
      this.logger.debug('Listing media files', {
        operation: 'list',
        metadata: {
          entityType: options.entityType,
          entityId: options.entityId,
          subfolder: options.subfolder,
          policyRoutingEnabled: this.mediaConfig.policyRoutingEnabled,
        },
      });

      let files: MediaFile[];

      if (this.mediaConfig.policyRoutingEnabled) {
        // Determine system of record based on policy
        const systemOfRecord = this.policyRouter.getSystemOfRecord(options.entityType, options.entityId, options.subfolder);

        if (systemOfRecord === 'cloudinary' && this.cloudinaryProvider) {
          files = await this.cloudinaryProvider.list(options);
        } else {
          files = await this.localProvider.list(options);
        }
      } else {
        // Legacy mode: use local provider only
        files = await this.localProvider.list(options);
      }

      this.logger.debug('Media files listed successfully', {
        operation: 'list',
        metadata: {
          count: files.length,
          entityType: options.entityType,
          entityId: options.entityId,
        },
      });

      return files;
    } catch (error) {
      this.logger.error('Failed to list media files', error instanceof Error ? error : undefined, {
        operation: 'list',
        metadata: {
          entityType: options.entityType,
          entityId: options.entityId,
        },
      });
      throw error;
    }
  }

  /**
   * Get a specific media file by ID
   * @param fileId File identifier
   * @returns Promise resolving to file metadata or null if not found
   */
  async get(fileId: string): Promise<MediaFile | null> {
    try {
      this.logger.debug('Getting media file', {
        operation: 'get',
        metadata: { fileId },
      });

      // Try to get file from local provider first, then cloudinary if configured
      let file = await this.localProvider.get(fileId);
      if (!file && this.cloudinaryProvider) {
        file = await this.cloudinaryProvider.get(fileId);
      }

      if (file) {
        this.logger.debug('Media file retrieved successfully', {
          operation: 'get',
          metadata: {
            fileId,
            filename: file.filename,
            size: file.size,
          },
        });
      } else {
        this.logger.debug('Media file not found', {
          operation: 'get',
          metadata: { fileId },
        });
      }

      return file;
    } catch (error) {
      this.logger.error('Failed to get media file', error instanceof Error ? error : undefined, {
        operation: 'get',
        metadata: {
          fileId,
        },
      });
      throw error;
    }
  }

  /**
   * Delete a media file
   * @param options Delete configuration
   * @returns Promise resolving to success boolean
   */
  async delete(options: MediaDeleteOptions): Promise<boolean> {
    try {
      this.logger.info('Deleting media file', {
        operation: 'delete',
        metadata: {
          fileId: options.fileId,
          deleteThumbnail: options.deleteThumbnail,
        },
      });

      // Try to delete from both providers
      let success = await this.localProvider.delete(options);
      if (this.cloudinaryProvider) {
        const cloudinarySuccess = await this.cloudinaryProvider.delete(options);
        success = success || cloudinarySuccess;
      }

      if (success) {
        this.logger.info('Media file deleted successfully', {
          operation: 'delete',
          metadata: { fileId: options.fileId },
        });
      } else {
        this.logger.warn('Failed to delete media file', {
          operation: 'delete',
          metadata: { fileId: options.fileId },
        });
      }

      return success;
    } catch (error) {
      this.logger.error('Error deleting media file', error instanceof Error ? error : undefined, {
        operation: 'delete',
        metadata: {
          fileId: options.fileId,
        },
      });
      throw error;
    }
  }

  /**
   * Get file stream for serving
   * @param fileId File identifier
   * @returns Promise resolving to readable stream or null if not found
   */
  async getStream(fileId: string): Promise<ReadableStream | null> {
    try {
      this.logger.debug('Getting media file stream', {
        operation: 'stream',
        metadata: { fileId },
      });

      // Try to get stream from local provider first, then cloudinary if configured
      let stream = await this.localProvider.getStream(fileId);
      if (!stream && this.cloudinaryProvider) {
        stream = await this.cloudinaryProvider.getStream(fileId);
      }

      if (stream) {
        this.logger.debug('Media file stream retrieved successfully', {
          operation: 'stream',
          metadata: { fileId },
        });
      } else {
        this.logger.debug('Media file stream not found', {
          operation: 'stream',
          metadata: { fileId },
        });
      }

      return stream;
    } catch (error) {
      this.logger.error('Failed to get media file stream', error instanceof Error ? error : undefined, {
        operation: 'stream',
        metadata: {
          fileId,
        },
      });
      throw error;
    }
  }

  /**
   * Get primary media file for an entity
   * Convenience method that returns the first (newest) media file
   * @param entityType Entity type
   * @param entityId Entity ID
   * @param subfolder Optional subfolder
   * @returns Promise resolving to primary file or null
   */
  async getPrimary(entityType: string, entityId: string, subfolder?: string): Promise<MediaFile | null> {
    try {
      const files = await this.list({
        entityType,
        entityId,
        subfolder,
        limit: 1,
      });

      return files.length > 0 ? (files[0] ?? null) : null;
    } catch (error) {
      this.logger.error('Failed to get primary media file', error instanceof Error ? error : undefined, {
        operation: 'getPrimary',
        metadata: {
          entityType,
          entityId,
          subfolder,
        },
      });
      throw error;
    }
  }

  /**
   * Check if media service is healthy
   * @returns Promise resolving to health status
   */
  async healthCheck(): Promise<ServiceHealth> {
    try {
      this.logger.debug('Performing media service health check', {
        operation: 'healthCheck',
      });

      // Check health of both providers
      const localHealthy = await this.localProvider.healthCheck();
      const cloudinaryHealthy = this.cloudinaryProvider ? await this.cloudinaryProvider.healthCheck() : true;
      const mirrorHealthResult = await this.mirrorService.healthCheck();
      const mirrorHealthy = mirrorHealthResult.status === 'healthy';

      const checks = {
        localProvider: localHealthy,
        cloudinaryProvider: cloudinaryHealthy,
        mirrorService: mirrorHealthy,
        policyRouter: true, // PolicyRouter is always healthy (no external dependencies)
      };

      const allHealthy = Object.values(checks).every(Boolean);
      const status = allHealthy ? 'healthy' : 'degraded';

      this.logger.debug('Media service health check completed', {
        operation: 'healthCheck',
        metadata: { status, checks },
      });

      return {
        status,
        timestamp: new Date(),
        checks,
        metrics: {
          uptime: this.getUptime(),
          policyRoutingEnabled: this.mediaConfig.policyRoutingEnabled ? 1 : 0,
          cloudinaryConfigured: this.cloudinaryProvider ? 1 : 0,
        },
      };
    } catch (error) {
      this.logger.error('Media service health check failed', error instanceof Error ? error : undefined, {
        operation: 'healthCheck',
      });

      return {
        status: 'unhealthy',
        timestamp: new Date(),
        checks: {
          error: false,
        },
      };
    }
  }

  /**
   * Get current provider configurations
   * @returns Configuration object
   */
  getProviderConfig(): Record<string, unknown> {
    return {
      local: this.localProvider.getConfig(),
      cloudinary: this.cloudinaryProvider?.getConfig() || null,
      policyRoutingEnabled: this.mediaConfig.policyRoutingEnabled,
      policyRouter: this.policyRouter.getConfig(),
    };
  }

  /**
   * Get media service configuration summary
   * @returns Service configuration summary
   */
  getServiceConfig(): MediaServiceConfig {
    return this.mediaConfig;
  }

  // ============================================================================
  // Legacy Compatibility Methods (E2.6 - API Bridge)
  // These methods maintain compatibility with existing consumers
  // ============================================================================

  /**
   * Upload media file using legacy options format
   * @legacy Used by ListingService and useUniversalMedia hook
   * @param options Legacy upload options
   * @returns Promise resolving to MediaFile (adapted from provider result)
   */
  async uploadMedia(options: LegacyUploadOptions): Promise<MediaFile> {
    // Convert legacy options to new format
    const uploadOptions: MediaUploadOptions = {
      file: options.file,
      filename: options.filename,
      mimeType: options.mimeType,
      entityType: options.entityType,
      entityId: String(options.entityId),
      subfolder: options.mediaType, // Use mediaType as subfolder
    };

    return this.upload(uploadOptions);
  }

  /**
   * Get media files for an entity using legacy query format
   * @legacy Used by useUniversalMedia hook
   * @param options Legacy query options
   * @returns Promise resolving to array of media with relationships
   */
  async getMediaForEntity(options: LegacyMediaQueryOptions): Promise<(MediaFile & Omit<Partial<EntityMediaRelationship>, 'id'>)[]> {
    const files = await this.list({
      entityType: options.entityType,
      entityId: String(options.entityId),
      subfolder: options.mediaType,
    });

    // Adapt to include relationship-like fields
    return files.map((file, index) => ({
      ...file,
      entity_type: options.entityType,
      entity_id: options.entityId,
      media_file_id: parseInt(file.id) || index,
      media_type: (options.mediaType || 'gallery') as EntityMediaRelationship['media_type'],
      is_primary: index === 0,
      display_order: index,
      created_at: file.createdAt,
    }));
  }

  /**
   * Delete media file by numeric ID
   * @legacy Used by useUniversalMedia hook
   * @param mediaId Numeric media ID
   * @returns Promise resolving to success boolean
   */
  async deleteMedia(mediaId: number): Promise<boolean> {
    return this.delete({ fileId: String(mediaId) });
  }

  /**
   * Get primary media for an entity with specific media type
   * @legacy Used by useUniversalMedia hook
   * @param entityType Entity type
   * @param entityId Numeric entity ID
   * @param mediaType Media type filter
   * @returns Promise resolving to primary media or null
   */
  async getPrimaryMedia(
    entityType: string,
    entityId: number,
    mediaType: EntityMediaRelationship['media_type']
  ): Promise<(MediaFile & Omit<Partial<EntityMediaRelationship>, 'id'>) | null> {
    const file = await this.getPrimary(entityType, String(entityId), mediaType);

    if (!file) return null;

    // Adapt to include relationship-like fields
    return {
      ...file,
      entity_type: entityType,
      entity_id: entityId,
      media_file_id: parseInt(file.id) || 0,
      media_type: mediaType,
      is_primary: true,
      display_order: 0,
      created_at: file.createdAt,
    };
  }

  /**
   * Get orphaned media files (files without entity relationships)
   * @legacy Used by admin media routes
   * @returns Promise resolving to array of orphaned files
   */
  async getOrphanedMedia(): Promise<LegacyMediaFile[]> {
    // For the provider-based service, orphan detection is not directly available
    // Return empty array - this functionality would need database integration
    this.logger.warn('getOrphanedMedia called on provider-based MediaService - not implemented', {
      operation: 'getOrphanedMedia',
    });
    return [];
  }

  /**
   * Bulk delete orphaned media files
   * @legacy Used by admin media routes
   * @returns Promise resolving to deletion result
   */
  async bulkDeleteOrphaned(): Promise<{ deleted: number; errors: string[] }> {
    // For the provider-based service, bulk orphan deletion is not directly available
    this.logger.warn('bulkDeleteOrphaned called on provider-based MediaService - not implemented', {
      operation: 'bulkDeleteOrphaned',
    });
    return { deleted: 0, errors: ['Orphan detection not available in provider-based MediaService'] };
  }

  /**
   * Get storage statistics
   * @legacy Used by admin media routes
   * @returns Promise resolving to storage statistics
   */
  async getStorageStatistics(): Promise<MediaStatistics> {
    // For the provider-based service, return basic statistics
    this.logger.info('getStorageStatistics called - returning basic stats', {
      operation: 'getStorageStatistics',
    });

    return {
      total_files: 0,
      total_size_mb: 0,
      by_storage: {
        local: { count: 0, size_mb: 0 },
        cloudinary: { count: 0, size_mb: 0 },
      },
      by_entity_type: {},
      orphaned_count: 0,
    };
  }

  // Private methods

  /**
   * Trigger async backup of a local file TO Cloudinary
   * Used for site assets (branding, logos, system content) that should have CDN backup
   *
   * @param mediaFile The locally uploaded MediaFile to backup to Cloudinary
   */
  private async triggerAsyncBackup(
    mediaFile: MediaFile,
    seoMetadata?: { altText?: string | null; titleText?: string | null }
  ): Promise<void> {
    // Skip if mirror service is not configured with Cloudinary
    if (!this.mirrorService.isEnabled()) {
      this.logger.warn('Cloudinary backup SKIPPED - MirrorService not enabled (check CLOUDINARY_CLOUD_NAME env)', {
        operation: 'triggerAsyncBackup',
        metadata: { fileId: mediaFile.id },
      });
      return;
    }

    this.logger.info('Starting Cloudinary backup for site asset', {
      operation: 'triggerAsyncBackup',
      metadata: {
        fileId: mediaFile.id,
        filename: mediaFile.filename,
        localPath: mediaFile.local?.path,
      },
    });

    const backupResult = await this.mirrorService.mirrorMediaFile(mediaFile, seoMetadata);

    if (backupResult.success) {
      this.logger.info('Cloudinary backup completed successfully', {
        operation: 'triggerAsyncBackup',
        metadata: {
          fileId: mediaFile.id,
          cloudinaryUrl: backupResult.cloudinaryUrl,
          cloudinaryPublicId: backupResult.cloudinaryPublicId,
        },
      });

      // Update the MediaFile with Cloudinary backup information
      if (backupResult.cloudinaryUrl) {
        mediaFile.cloudinary = {
          public_id: backupResult.cloudinaryPublicId || '',
          url: backupResult.cloudinaryUrl,
          thumb: backupResult.thumbnailUrl,
        };
      }
    } else {
      // Throw so the caller's try/catch can surface this to the user
      throw new Error(`Cloudinary backup failed: ${backupResult.error || 'Unknown error'}`);
    }
  }

  private loadConfig(): MediaServiceConfig {
    return {
      name: 'MediaService',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      localProvider: {
        type: 'local',
        config: {
          rootPath: process.env.MEDIA_LOCAL_ROOT || path.resolve(process.cwd(), 'var', 'media'),
          baseUrl: process.env.MEDIA_PUBLIC_BASE_URL || 'http://localhost:3000/media',
          maxFileSize: process.env.MEDIA_MAX_FILE_SIZE ? parseInt(process.env.MEDIA_MAX_FILE_SIZE) : undefined,
        } as LocalMediaProviderConfig,
      },
      cloudinaryProvider: process.env.CLOUDINARY_CLOUD_NAME ? {
        type: 'cloudinary',
        config: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY!,
          apiSecret: process.env.CLOUDINARY_API_SECRET!,
          secure: true,
          maxFileSize: process.env.MEDIA_MAX_FILE_SIZE ? parseInt(process.env.MEDIA_MAX_FILE_SIZE) : undefined,
        } as CloudinaryMediaProviderConfig,
      } : undefined,
      policyRoutingEnabled: process.env.MEDIA_POLICY_ROUTING_ENABLED !== 'false', // Enabled by default
    };
  }

  private createLocalProvider(): IMediaProvider {
    const { config } = this.mediaConfig.localProvider;
    return new LocalMediaProvider(config as LocalMediaProviderConfig);
  }

  private createCloudinaryProvider(): IMediaProvider | undefined {
    if (!this.mediaConfig.cloudinaryProvider) {
      this.logger.info('Cloudinary provider not configured - missing environment variables', {
        operation: 'createCloudinaryProvider',
      });
      return undefined;
    }

    const { config } = this.mediaConfig.cloudinaryProvider;
    return new CloudinaryMediaProvider(config as CloudinaryMediaProviderConfig);
  }
}

// Singleton instance for consistent usage across the application
let mediaServiceInstance: MediaService | null = null;

/**
 * Get the singleton MediaService instance
 * @returns MediaService instance
 */
export function getMediaService(): MediaService {
  if (!mediaServiceInstance) {
    mediaServiceInstance = new MediaService();
  }
  return mediaServiceInstance;
}

export default MediaService;

// Re-export types for consumer convenience
export type {
  MediaFile,
  MediaUploadOptions,
  MediaListOptions,
  MediaDeleteOptions,
  IMediaProvider,
  MediaProviderType,
  MediaProviderConfig,
  LegacyUploadOptions,
  LegacyMediaFile,
  LegacyMediaQueryOptions,
  EntityMediaRelationship,
  MediaStatistics,
  UploadOptions,
  MediaFileWithRelationship,
} from './types';
