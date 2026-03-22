/**
 * Local File System Media Provider
 *
 * Implements local file storage for the Universal Media Manager.
 * Stores files in ./var/media with proper folder structure and thumbnail generation.
 *
 * @authority Universal Media Manager compliance
 * @compliance E2.5 - Service Location Migration
 * @see .cursor/rules/universal-media-manager.mdc
 * @migrated-from src/services/media/providers/LocalMediaProvider.ts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import {
  IMediaProvider,
  MediaUploadOptions,
  MediaFile,
  MediaListOptions,
  MediaDeleteOptions,
} from '../types';

export interface LocalMediaProviderConfig {
  /** Root directory for media storage */
  rootPath: string;
  /** Base URL for serving media files */
  baseUrl: string;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Thumbnail configuration */
  thumbnail?: {
    width: number;
    height: number;
    quality: number;
  };
}

export class LocalMediaProvider implements IMediaProvider {
  private config: LocalMediaProviderConfig;
  private metadataDir: string;

  constructor(config: LocalMediaProviderConfig) {
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      thumbnail: {
        width: 300,
        height: 300,
        quality: 80,
      },
      ...config,
    };
    this.metadataDir = path.join(this.config.rootPath, '.metadata');
  }

  async upload(options: MediaUploadOptions): Promise<MediaFile> {
    try {
      // Validate file size
      const fileBuffer = Buffer.isBuffer(options.file) ? options.file : await this.fileToBuffer(options.file);
      if (this.config.maxFileSize && fileBuffer.length > this.config.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
      }

      // Generate unique file ID
      const fileId = randomUUID();
      const extension = path.extname(options.filename);
      const baseName = path.basename(options.filename, extension);
      const sanitizedFilename = this.sanitizeFilename(`${baseName}_${fileId}${extension}`);

      // Create directory structure
      const entityDir = path.join(this.config.rootPath, options.entityType, options.entityId);
      const targetDir = options.subfolder ? path.join(entityDir, options.subfolder) : entityDir;
      await this.ensureDirectory(targetDir);
      await this.ensureDirectory(this.metadataDir);

      // Write main file
      const filePath = path.join(targetDir, sanitizedFilename);
      await fs.writeFile(filePath, fileBuffer);

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (options.generateThumbnail !== false && this.isImageMimeType(options.mimeType)) {
        const thumbnailPath = await this.generateThumbnail(filePath, targetDir, baseName, fileId);
        if (thumbnailPath) {
          thumbnailUrl = this.getPublicUrl(thumbnailPath);
        }
      }

      // Create metadata
      const mediaFile: MediaFile = {
        id: fileId,
        filename: options.filename,
        mimeType: options.mimeType,
        size: fileBuffer.length,
        url: this.getPublicUrl(filePath),
        thumbnailUrl,
        entityType: options.entityType,
        entityId: options.entityId,
        subfolder: options.subfolder,
        createdAt: new Date(),
        updatedAt: new Date(),
        origin: 'local',
        local: {
          path: filePath,
          url: this.getPublicUrl(filePath),
          thumb: thumbnailUrl,
        },
      };

      // Save metadata
      await this.saveMetadata(fileId, mediaFile);
      return mediaFile;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(options: MediaListOptions): Promise<MediaFile[]> {
    try {
      const files: MediaFile[] = [];
      const entityDir = path.join(this.config.rootPath, options.entityType, options.entityId);
      const targetDir = options.subfolder ? path.join(entityDir, options.subfolder) : entityDir;

      // Check if directory exists
      try {
        await fs.access(targetDir);
      } catch {
        return files; // Directory doesn't exist, return empty array
      }

      // Read all metadata files
      const metadataFiles = await this.getMetadataFiles();
      for (const metadataFile of metadataFiles) {
        if (
          metadataFile.entityType === options.entityType &&
          metadataFile.entityId === options.entityId &&
          (!options.subfolder || metadataFile.subfolder === options.subfolder)
        ) {
          files.push(metadataFile);
        }
      }

      // Sort by creation date (newest first)
      files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 100;
      return files.slice(offset, offset + limit);
    } catch (error) {
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async get(fileId: string): Promise<MediaFile | null> {
    try {
      return await this.loadMetadata(fileId);
    } catch (error) {
      return null;
    }
  }

  async delete(options: MediaDeleteOptions): Promise<boolean> {
    try {
      const mediaFile = await this.loadMetadata(options.fileId);
      if (!mediaFile) {
        return false;
      }

      // Delete main file
      const filePath = this.getLocalPath(mediaFile.url);
      try {
        await fs.unlink(filePath);
      } catch (error) {
      }

      // Delete thumbnail if exists and requested
      if (options.deleteThumbnail !== false && mediaFile.thumbnailUrl) {
        const thumbnailPath = this.getLocalPath(mediaFile.thumbnailUrl);
        try {
          await fs.unlink(thumbnailPath);
        } catch (error) {
        }
      }

      // Delete metadata
      await this.deleteMetadata(options.fileId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStream(fileId: string): Promise<ReadableStream | null> {
    try {
      const mediaFile = await this.loadMetadata(fileId);
      if (!mediaFile) {
        return null;
      }

      const filePath = this.getLocalPath(mediaFile.url);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return null;
      }

      // Create readable stream
      const { createReadStream } = await import('fs');
      const nodeStream = createReadStream(filePath);

      // Convert Node.js stream to Web ReadableStream
      return new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk) => {
            const uint8Array = Buffer.isBuffer(chunk) ? new Uint8Array(chunk) : new Uint8Array(Buffer.from(chunk));
            controller.enqueue(uint8Array);
          });

          nodeStream.on('end', () => {
            controller.close();
          });

          nodeStream.on('error', (error) => {
            controller.error(error);
          });
        },
      });
    } catch (error) {
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if root directory exists and is writable
      await this.ensureDirectory(this.config.rootPath);
      await this.ensureDirectory(this.metadataDir);

      // Test write permission
      const testFile = path.join(this.config.rootPath, '.health-check');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      return true;
    } catch (error) {
      return false;
    }
  }

  getConfig(): Record<string, unknown> {
    return {
      type: 'local',
      rootPath: this.config.rootPath,
      baseUrl: this.config.baseUrl,
      maxFileSize: this.config.maxFileSize,
      thumbnail: this.config.thumbnail,
    };
  }

  // Private helper methods

  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private isImageMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/') && !mimeType.includes('svg');
  }

  private async generateThumbnail(
    originalPath: string,
    targetDir: string,
    baseName: string,
    fileId: string
  ): Promise<string | null> {
    try {
      const thumbnailFilename = `${baseName}_${fileId}_thumb.webp`;
      const thumbnailPath = path.join(targetDir, thumbnailFilename);

      await sharp(originalPath)
        .resize(this.config.thumbnail!.width, this.config.thumbnail!.height, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: this.config.thumbnail!.quality })
        .toFile(thumbnailPath);
      return thumbnailPath;
    } catch (error) {
      return null;
    }
  }

  private getPublicUrl(filePath: string): string {
    const relativePath = path.relative(this.config.rootPath, filePath);
    return `${this.config.baseUrl}/${relativePath.replace(/\\/g, '/')}`;
  }

  private getLocalPath(url: string): string {
    const relativePath = url.replace(this.config.baseUrl + '/', '');
    return path.join(this.config.rootPath, relativePath.replace(/\//g, path.sep));
  }

  private async saveMetadata(fileId: string, mediaFile: MediaFile): Promise<void> {
    const metadataPath = path.join(this.metadataDir, `${fileId}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(mediaFile, null, 2), 'utf8');
  }

  private async loadMetadata(fileId: string): Promise<MediaFile | null> {
    try {
      const metadataPath = path.join(this.metadataDir, `${fileId}.json`);
      const content = await fs.readFile(metadataPath, 'utf8');
      const data = JSON.parse(content);

      // Convert date strings back to Date objects
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    } catch {
      return null;
    }
  }

  private async deleteMetadata(fileId: string): Promise<void> {
    try {
      const metadataPath = path.join(this.metadataDir, `${fileId}.json`);
      await fs.unlink(metadataPath);
    } catch {
      // Metadata file might not exist
    }
  }

  private async getMetadataFiles(): Promise<MediaFile[]> {
    try {
      const files = await fs.readdir(this.metadataDir);
      const metadataFiles: MediaFile[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const fileId = path.basename(file, '.json');
          const mediaFile = await this.loadMetadata(fileId);
          if (mediaFile) {
            metadataFiles.push(mediaFile);
          }
        }
      }

      return metadataFiles;
    } catch {
      return [];
    }
  }
}
