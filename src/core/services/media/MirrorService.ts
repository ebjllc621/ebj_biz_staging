/**
 * Media Mirror Service
 *
 * Provides async mirroring FROM Local storage TO Cloudinary for site-owned assets.
 * Ensures content availability and CDN backup for branding, logos, and system media.
 *
 * DIRECTION: Local → Cloudinary (backup site assets to CDN)
 * NOT: Cloudinary → Local (user uploads stay on Cloudinary only)
 *
 * This service is used for:
 * - Site branding (logos, favicons)
 * - System content (static images, icons)
 * - Content assets that need CDN redundancy
 *
 * User-generated content (listings, events, users) uploads directly to Cloudinary
 * and is NEVER mirrored locally to avoid server storage bloat.
 *
 * @authority Universal Media Manager compliance
 * @compliance E2.5 - Service Location Migration
 * @see .cursor/rules/universal-media-manager.mdc
 * @migrated-from src/services/media/MirrorService.ts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { CoreService, ServiceConfig, ServiceHealth } from '@core/services/CoreService';
import { CloudinaryMediaProvider, CloudinaryMediaProviderConfig } from './providers/CloudinaryMediaProvider';
import { MediaFile } from './types';

export interface MirrorServiceConfig extends ServiceConfig {
  /** Local root directory for source files */
  localRootPath: string;
  /** Cloudinary configuration for backup uploads */
  cloudinary: CloudinaryMediaProviderConfig | null;
  /** Folder prefix for mirrored files in Cloudinary */
  backupFolderPrefix: string;
}

export interface MirrorResult {
  success: boolean;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  thumbnailUrl?: string;
  error?: string;
}

export class MirrorService extends CoreService {
  private mirrorConfig: MirrorServiceConfig;
  private cloudinaryProvider: CloudinaryMediaProvider | null = null;

  constructor() {
    const config = {
      name: 'MirrorService',
      version: '2.0.0', // Version bump for direction change
      environment: process.env.NODE_ENV || 'development',
    };
    super(config);
    this.mirrorConfig = this.loadConfig();
    this.initializeCloudinaryProvider();
  }

  /**
   * Initialize Cloudinary provider for backup uploads
   */
  private initializeCloudinaryProvider(): void {
    if (this.mirrorConfig.cloudinary) {
      this.cloudinaryProvider = new CloudinaryMediaProvider(this.mirrorConfig.cloudinary);
      this.logger.info('MirrorService initialized with Cloudinary backup', {
        operation: 'initialize',
        metadata: {
          cloudName: this.mirrorConfig.cloudinary.cloudName,
          backupPrefix: this.mirrorConfig.backupFolderPrefix,
        },
      });
    } else {
      this.logger.warn('MirrorService: Cloudinary not configured - backup mirroring disabled', {
        operation: 'initialize',
      });
    }
  }

  /**
   * Check if mirroring is available (Cloudinary configured)
   */
  isEnabled(): boolean {
    return this.cloudinaryProvider !== null;
  }

  /**
   * Mirror a local file TO Cloudinary as backup
   * @param localPath The local file path to backup
   * @param relativePath The relative path for organizing in Cloudinary (e.g., "site/branding/logo.png")
   * @param mimeType The file MIME type
   * @returns Promise resolving to mirror result with Cloudinary URLs
   */
  async mirrorToCloudinary(
    localPath: string,
    relativePath: string,
    mimeType: string,
    seoMetadata?: { altText?: string | null; titleText?: string | null }
  ): Promise<MirrorResult> {
    if (!this.cloudinaryProvider) {
      this.logger.debug('Mirror service: Cloudinary not configured, skipping backup', {
        operation: 'mirrorToCloudinary',
      });
      return { success: false, error: 'Cloudinary not configured for backup' };
    }

    try {
      this.logger.info('Starting mirror to Cloudinary backup', {
        operation: 'mirrorToCloudinary',
        metadata: {
          localPath,
          relativePath,
          mimeType,
        },
      });

      // Read local file
      const fileBuffer = await fs.readFile(localPath);
      const filename = path.basename(localPath);

      // Parse relative path for entity structure
      const pathParts = relativePath.split('/');
      const entityType = pathParts[0] || 'site';
      const entityId = pathParts[1] || 'assets';
      const subfolder = pathParts.slice(2, -1).join('/') || undefined;

      // Upload to Cloudinary using the same path structure as local storage
      const result = await this.cloudinaryProvider.upload({
        file: fileBuffer,
        filename,
        mimeType,
        entityType,
        entityId,
        subfolder,
        generateThumbnail: mimeType.startsWith('image/'),
        altText: seoMetadata?.altText,
        titleText: seoMetadata?.titleText,
      });

      this.logger.info('Mirror to Cloudinary completed successfully', {
        operation: 'mirrorToCloudinary',
        metadata: {
          localPath,
          cloudinaryUrl: result.url,
          cloudinaryPublicId: result.cloudinary?.public_id,
          size: result.size,
        },
      });

      return {
        success: true,
        cloudinaryUrl: result.url,
        cloudinaryPublicId: result.cloudinary?.public_id,
        thumbnailUrl: result.thumbnailUrl,
      };
    } catch (error) {
      this.logger.error('Mirror to Cloudinary failed', error instanceof Error ? error : undefined, {
        operation: 'mirrorToCloudinary',
        metadata: {
          localPath,
          relativePath,
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Mirror a MediaFile from local storage TO Cloudinary
   * @param mediaFile The MediaFile with local storage info
   * @returns Promise resolving to mirror result
   */
  async mirrorMediaFile(
    mediaFile: MediaFile,
    seoMetadata?: { altText?: string | null; titleText?: string | null }
  ): Promise<MirrorResult> {
    if (!mediaFile.local?.path) {
      return { success: false, error: 'No local path available for mirroring to Cloudinary' };
    }

    // Build relative path based on MediaFile structure
    const relativePath = this.buildRelativePath(mediaFile);

    return this.mirrorToCloudinary(mediaFile.local.path, relativePath, mediaFile.mimeType, seoMetadata);
  }

  /**
   * Batch mirror multiple local files to Cloudinary
   * @param mediaFiles Array of MediaFiles to mirror
   * @returns Promise resolving to array of mirror results
   */
  async batchMirror(mediaFiles: MediaFile[]): Promise<MirrorResult[]> {
    if (!this.cloudinaryProvider) {
      this.logger.debug('Mirror service: Cloudinary not configured, skipping batch backup', {
        operation: 'batchMirror',
      });
      return mediaFiles.map(() => ({ success: false, error: 'Cloudinary not configured' }));
    }

    this.logger.info('Starting batch mirror to Cloudinary', {
      operation: 'batchMirror',
      metadata: { count: mediaFiles.length },
    });

    const results: MirrorResult[] = [];

    for (const mediaFile of mediaFiles) {
      try {
        const result = await this.mirrorMediaFile(mediaFile);
        results.push(result);

        // Add small delay between uploads to avoid overwhelming Cloudinary
        await this.sleep(100);
      } catch (error) {
        this.logger.error('Batch mirror item failed', error instanceof Error ? error : undefined, {
          operation: 'batchMirror',
          metadata: {
            fileId: mediaFile.id,
          },
        });

        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.info('Batch mirror to Cloudinary completed', {
      operation: 'batchMirror',
      metadata: {
        total: mediaFiles.length,
        successful: successCount,
        failed: mediaFiles.length - successCount,
      },
    });

    return results;
  }

  /**
   * Check if a file exists in Cloudinary backup
   * @param publicId The Cloudinary public ID to check
   * @returns Promise resolving to true if file exists
   */
  async existsInBackup(publicId: string): Promise<boolean> {
    if (!this.cloudinaryProvider) {
      return false;
    }

    try {
      // Use Cloudinary get to check existence
      const file = await this.cloudinaryProvider.get(publicId);
      return file !== null;
    } catch {
      return false;
    }
  }

  /**
   * Health check for mirror service
   * @returns Promise resolving to health status
   */
  async healthCheck(): Promise<ServiceHealth> {
    try {
      const checks: Record<string, boolean> = {
        localDirectoryAccess: false,
        cloudinaryConfigured: this.cloudinaryProvider !== null,
        cloudinaryHealthy: false,
      };

      // Check local directory access
      try {
        await fs.access(this.mirrorConfig.localRootPath);
        checks.localDirectoryAccess = true;
      } catch {
        checks.localDirectoryAccess = false;
      }

      // Check Cloudinary health if configured
      if (this.cloudinaryProvider) {
        checks.cloudinaryHealthy = await this.cloudinaryProvider.healthCheck();
      }

      const isHealthy = checks.localDirectoryAccess &&
        (!this.cloudinaryProvider || checks.cloudinaryHealthy);

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date(),
        checks,
        metrics: {
          uptime: this.getUptime(),
          cloudinaryEnabled: this.cloudinaryProvider ? 1 : 0,
        },
      };
    } catch (error) {
      this.logger.error('Mirror service health check failed', error instanceof Error ? error : undefined, {
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
   * Get mirror service configuration
   * @returns Current configuration (without sensitive data)
   */
  getConfig(): Omit<MirrorServiceConfig, 'cloudinary'> & { cloudinaryConfigured: boolean } {
    return {
      name: this.mirrorConfig.name,
      version: this.mirrorConfig.version,
      environment: this.mirrorConfig.environment,
      localRootPath: this.mirrorConfig.localRootPath,
      backupFolderPrefix: this.mirrorConfig.backupFolderPrefix,
      cloudinaryConfigured: this.cloudinaryProvider !== null,
    };
  }

  // Private helper methods

  private loadConfig(): MirrorServiceConfig {
    const cloudinaryConfig: CloudinaryMediaProviderConfig | null =
      process.env.CLOUDINARY_CLOUD_NAME ? {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || '',
        secure: true,
      } : null;

    return {
      name: 'MirrorService',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      localRootPath: process.env.MEDIA_LOCAL_ROOT || path.resolve(process.cwd(), 'public', 'uploads'),
      cloudinary: cloudinaryConfig,
      backupFolderPrefix: process.env.MEDIA_BACKUP_PREFIX || 'site-backup',
    };
  }

  private buildRelativePath(mediaFile: MediaFile): string {
    const parts = [mediaFile.entityType, mediaFile.entityId];
    if (mediaFile.subfolder) {
      parts.push(mediaFile.subfolder);
    }
    parts.push(mediaFile.filename);
    return parts.join('/');
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for consistent usage across the application
let mirrorServiceInstance: MirrorService | null = null;

/**
 * Get the singleton MirrorService instance
 * @returns MirrorService instance
 */
export function getMirrorService(): MirrorService {
  if (!mirrorServiceInstance) {
    mirrorServiceInstance = new MirrorService();
  }
  return mirrorServiceInstance;
}

export default MirrorService;
