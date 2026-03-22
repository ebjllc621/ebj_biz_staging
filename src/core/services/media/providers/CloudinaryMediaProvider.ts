/**
 * Cloudinary Media Provider
 *
 * Implements Cloudinary cloud storage for the Universal Media Manager.
 * Provides secure cloud-based media storage with auto-optimization and CDN delivery.
 *
 * @authority Universal Media Manager compliance
 * @compliance E2.5 - Service Location Migration
 * @see .cursor/rules/universal-media-manager.mdc
 * @migrated-from src/services/media/providers/CloudinaryMediaProvider.ts
 */

import { randomUUID } from 'crypto';
import { ErrorService } from '@core/services/ErrorService';
import {
  IMediaProvider,
  MediaUploadOptions,
  MediaFile,
  MediaListOptions,
  MediaDeleteOptions,
} from '../types';

export interface CloudinaryMediaProviderConfig {
  /** Cloudinary cloud name */
  cloudName: string;
  /** API key for authentication */
  apiKey: string;
  /** API secret for authentication */
  apiSecret: string;
  /** Use secure URLs (HTTPS) */
  secure?: boolean;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Folder prefix for all uploads */
  folderPrefix?: string;
  /** Thumbnail configuration */
  thumbnail?: {
    width: number;
    height: number;
    quality: number;
  };
}

export class CloudinaryMediaProvider implements IMediaProvider {
  private config: CloudinaryMediaProviderConfig;
  private baseUrl: string;
  private apiUrl: string;

  constructor(config: CloudinaryMediaProviderConfig) {
    this.config = {
      secure: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      folderPrefix: '',
      thumbnail: {
        width: 300,
        height: 300,
        quality: 80,
      },
      ...config,
    };

    const protocol = this.config.secure ? 'https' : 'http';
    this.baseUrl = `${protocol}://res.cloudinary.com/${this.config.cloudName}`;
    this.apiUrl = `https://api.cloudinary.com/v1_1/${this.config.cloudName}`;
  }

  async upload(options: MediaUploadOptions): Promise<MediaFile> {
    try {
      console.log('[CLOUDINARY] Upload starting:', {
        entityType: options.entityType,
        entityId: options.entityId,
        filename: options.filename,
        mimeType: options.mimeType,
        fileSize: Buffer.isBuffer(options.file) ? options.file.length : 'File object'
      });

      // Validate file size
      const fileBuffer = Buffer.isBuffer(options.file) ? options.file : await this.fileToBuffer(options.file);
      if (this.config.maxFileSize && fileBuffer.length > this.config.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
      }

      // Generate unique file ID and folder path
      const fileId = randomUUID();
      const folderPath = this.buildFolderPath(options.entityType, options.entityId, options.subfolder);
      // Use fileId ONLY as public_id — the 'folder' param places it in the right directory.
      // Previously, publicId included the folder path AND folder was sent separately,
      // causing Cloudinary to double the path: folder/folder/fileId
      const publicId = fileId;

      // Prepare upload data
      const formData = new FormData();
      const timestamp = Math.round(Date.now() / 1000);

      // Build signature params - MUST include ALL parameters sent to Cloudinary
      // If eager transformations are requested, include them in signature calculation
      const signatureParams: Record<string, unknown> = {
        public_id: publicId,
        timestamp: timestamp,
        folder: folderPath,
      };

      // Determine eager transformation string before signature generation
      const shouldGenerateThumbnail = options.generateThumbnail !== false && this.isImageMimeType(options.mimeType);
      const eagerTransformation = shouldGenerateThumbnail
        ? `c_fill,w_${this.config.thumbnail!.width},h_${this.config.thumbnail!.height},q_${this.config.thumbnail!.quality}`
        : null;

      // Include eager in signature if we're using it
      if (eagerTransformation) {
        signatureParams.eager = eagerTransformation;
      }

      // Build context metadata string for alt/caption (Cloudinary contextual metadata)
      const contextParts: string[] = [];
      if (options.altText) {
        contextParts.push(`alt=${options.altText.replace(/[|=]/g, ' ')}`);
      }
      if (options.titleText) {
        contextParts.push(`caption=${options.titleText.replace(/[|=]/g, ' ')}`);
      }
      const contextString = contextParts.length > 0 ? contextParts.join('|') : null;
      if (contextString) {
        signatureParams.context = contextString;
      }

      // Create signature for secure upload (includes ALL params that will be sent)
      const signature = await this.generateSignature(signatureParams);

      formData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: options.mimeType }), options.filename);
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('api_key', this.config.apiKey);
      formData.append('folder', folderPath);

      // Add transformation for images if thumbnail generation is enabled
      if (eagerTransformation) {
        formData.append('eager', eagerTransformation);
      }

      // Add context metadata (alt/caption) if provided
      if (contextString) {
        formData.append('context', contextString);
      }

      console.log('[CLOUDINARY] Calling Cloudinary API:', {
        url: `${this.apiUrl}/upload`,
        publicId,
        folder: folderPath
      });

      // Upload to Cloudinary
      const uploadResponse = await fetch(`${this.apiUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      console.log('[CLOUDINARY] Response received:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        ErrorService.capture('[CLOUDINARY] Upload failed:', errorData);
        throw new Error(`Cloudinary upload failed: ${errorData.error?.message || uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();

      // Generate thumbnail URL if available
      let thumbnailUrl: string | undefined;
      if (uploadResult.eager && uploadResult.eager.length > 0) {
        thumbnailUrl = uploadResult.eager[0].secure_url || uploadResult.eager[0].url;
      } else if (this.isImageMimeType(options.mimeType)) {
        // Generate thumbnail URL on-the-fly
        thumbnailUrl = this.generateTransformationUrl(uploadResult.public_id, {
          width: this.config.thumbnail!.width,
          height: this.config.thumbnail!.height,
          crop: 'fill',
          quality: this.config.thumbnail!.quality,
        });
      }

      // Create metadata
      const mediaFile: MediaFile = {
        id: fileId,
        filename: options.filename,
        mimeType: options.mimeType,
        size: uploadResult.bytes || fileBuffer.length,
        url: uploadResult.secure_url || uploadResult.url,
        thumbnailUrl,
        entityType: options.entityType,
        entityId: options.entityId,
        subfolder: options.subfolder,
        createdAt: new Date(uploadResult.created_at || Date.now()),
        updatedAt: new Date(),
        origin: 'cloudinary',
        cloudinary: {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url || uploadResult.url,
          thumb: thumbnailUrl,
        },
      };
      return mediaFile;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(options: MediaListOptions): Promise<MediaFile[]> {
    try {
      const folderPath = this.buildFolderPath(options.entityType, options.entityId, options.subfolder);

      // Search for resources in the specific folder
      const searchBody = {
        expression: `folder:"${folderPath}"`,
        sort_by: [{ created_at: 'desc' }],
        max_results: options.limit || 100,
      };

      const authHeader = this.getAuthHeader();
      const searchResponse = await fetch(`${this.apiUrl}/resources/search`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody),
      });

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json().catch(() => ({}));
        throw new Error(`Cloudinary search failed: ${errorData.error?.message || searchResponse.statusText}`);
      }

      const searchResult = await searchResponse.json();
      const resources = searchResult.resources || [];

      // Convert Cloudinary resources to MediaFile format
      const mediaFiles: MediaFile[] = resources.map((resource: { public_id: string; original_filename?: string; format: string; resource_type: string; bytes: number; secure_url?: string; url: string; created_at: string }) => {
        const fileId = this.extractFileIdFromPublicId(resource.public_id);
        const thumbnailUrl = this.isImageMimeType(resource.format)
          ? this.generateTransformationUrl(resource.public_id, {
              width: this.config.thumbnail!.width,
              height: this.config.thumbnail!.height,
              crop: 'fill',
              quality: this.config.thumbnail!.quality,
            })
          : undefined;

        return {
          id: fileId,
          filename: resource.original_filename || resource.public_id,
          mimeType: `${resource.resource_type}/${resource.format}`,
          size: resource.bytes,
          url: resource.secure_url || resource.url,
          thumbnailUrl,
          entityType: options.entityType,
          entityId: options.entityId,
          subfolder: options.subfolder,
          createdAt: new Date(resource.created_at),
          updatedAt: new Date(resource.created_at),
          origin: 'cloudinary',
          cloudinary: {
            public_id: resource.public_id,
            url: resource.secure_url || resource.url,
            thumb: thumbnailUrl,
          },
        };
      });

      // Apply offset if specified
      const offset = options.offset || 0;
      return mediaFiles.slice(offset);
    } catch (error) {
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async get(fileId: string): Promise<MediaFile | null> {
    try {
      // This is a simplified implementation - in a real scenario, we'd need to store
      // the mapping between fileId and public_id, or search for it
      return null;
    } catch (error) {
      return null;
    }
  }

  async delete(options: MediaDeleteOptions): Promise<boolean> {
    try {
      // The fileId for Cloudinary files is the UUID extracted from public_id
      // We need to search for the file to get the full public_id, or construct it
      // For files uploaded through our system, the public_id format is: {folderPrefix}/{entityType}/{entityId}/{fileId}

      console.log('[CLOUDINARY] Delete request:', { fileId: options.fileId });

      // Try to delete by public_id directly (fileId might be the public_id)
      // Cloudinary destroy API endpoint
      const timestamp = Math.round(Date.now() / 1000);

      // Generate signature for destroy operation
      const destroySignature = await this.generateSignature({
        public_id: options.fileId,
        timestamp: timestamp,
      });

      const formData = new FormData();
      formData.append('public_id', options.fileId);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', destroySignature);
      formData.append('api_key', this.config.apiKey);

      const destroyResponse = await fetch(`${this.apiUrl}/image/destroy`, {
        method: 'POST',
        body: formData,
      });

      if (destroyResponse.ok) {
        const result = await destroyResponse.json();
        console.log('[CLOUDINARY] Delete result:', result);
        // Cloudinary returns { result: 'ok' } on success, { result: 'not found' } otherwise
        return result.result === 'ok';
      }

      console.warn('[CLOUDINARY] Delete failed:', await destroyResponse.text());
      return false;
    } catch (error) {
      ErrorService.capture('[CLOUDINARY] Delete error:', error);
      return false;
    }
  }

  async getStream(fileId: string): Promise<ReadableStream | null> {
    try {
      // For Cloudinary, we don't typically stream files since they're served via CDN
      // This would require fetching the file from the CDN URL
      return null;
    } catch (error) {
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test authentication with a simple API call
      const authHeader = this.getAuthHeader();
      const response = await fetch(`${this.apiUrl}/usage`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getConfig(): Record<string, unknown> {
    return {
      type: 'cloudinary',
      cloudName: this.config.cloudName,
      secure: this.config.secure,
      maxFileSize: this.config.maxFileSize,
      folderPrefix: this.config.folderPrefix,
      thumbnail: this.config.thumbnail,
    };
  }

  // Private helper methods

  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private buildFolderPath(entityType: string, entityId: string, subfolder?: string): string {
    const parts = [this.config.folderPrefix, entityType, entityId];
    if (subfolder) {
      parts.push(subfolder);
    }
    return parts.filter(Boolean).join('/');
  }

  private isImageMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/') && !mimeType.includes('svg');
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');
  }

  private async generateSignature(params: Record<string, unknown>): Promise<string> {
    // Sort parameters and create query string
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    // Add API secret
    const stringToSign = `${sortedParams}${this.config.apiSecret}`;

    // Generate SHA-1 hash
    const crypto = await import('crypto');
    return crypto.createHash('sha1').update(stringToSign).digest('hex');
  }

  private generateTransformationUrl(publicId: string, transformations: Record<string, unknown>): string {
    const transformString = Object.entries(transformations)
      .map(([key, value]) => {
        switch (key) {
          case 'width': return `w_${value}`;
          case 'height': return `h_${value}`;
          case 'crop': return `c_${value}`;
          case 'quality': return `q_${value}`;
          default: return `${key}_${value}`;
        }
      })
      .join(',');

    return `${this.baseUrl}/image/upload/${transformString}/${publicId}`;
  }

  private extractFileIdFromPublicId(publicId: string): string {
    // Extract the UUID from the end of the public ID
    const parts = publicId.split('/');
    return parts[parts.length - 1] || '';
  }
}
