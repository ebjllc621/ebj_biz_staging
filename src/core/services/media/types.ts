/**
 * Universal Media Manager - Type Definitions
 *
 * Provider interface and type definitions for media storage operations.
 *
 * @authority universal-media-manager.mdc
 * @compliance E2.5 - Service Location Migration
 * @migrated-from src/services/media/IMediaProvider.ts
 */

export interface MediaUploadOptions {
  /** File to upload */
  file: File | Buffer;
  /** Original filename */
  filename: string;
  /** MIME type of the file */
  mimeType: string;
  /** Entity type (listing, user, etc.) */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Optional subfolder within entity folder */
  subfolder?: string;
  /** Whether to generate thumbnail for images */
  generateThumbnail?: boolean;
  /** Alt text for SEO (pushed to Cloudinary context metadata) */
  altText?: string | null;
  /** Title text for SEO (pushed to Cloudinary context metadata as caption) */
  titleText?: string | null;
}

export interface MediaFile {
  /** Unique identifier for the file */
  id: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Public URL for accessing the file */
  url: string;
  /** Thumbnail URL if available */
  thumbnailUrl?: string;
  /** Entity type this file belongs to */
  entityType: string;
  /** Entity ID this file belongs to */
  entityId: string;
  /** Subfolder within entity folder */
  subfolder?: string;
  /** File creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  updatedAt: Date;
  /** System of record - which provider has authoritative data */
  origin: 'local' | 'cloudinary';
  /** Cloudinary-specific metadata */
  cloudinary?: {
    public_id: string;
    url: string;
    thumb?: string;
  };
  /** Local storage metadata */
  local?: {
    path: string;
    url: string;
    thumb?: string;
  };
}

export interface MediaListOptions {
  /** Entity type to filter by */
  entityType: string;
  /** Entity ID to filter by */
  entityId: string;
  /** Optional subfolder filter */
  subfolder?: string;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface MediaDeleteOptions {
  /** File ID to delete */
  fileId: string;
  /** Whether to also delete thumbnail */
  deleteThumbnail?: boolean;
}

export interface IMediaProvider {
  /**
   * Upload a file to the media storage
   * @param options Upload configuration
   * @returns Promise resolving to uploaded file metadata
   */
  upload(options: MediaUploadOptions): Promise<MediaFile>;

  /**
   * List files for a specific entity
   * @param options List configuration
   * @returns Promise resolving to array of file metadata
   */
  list(options: MediaListOptions): Promise<MediaFile[]>;

  /**
   * Get a specific file by ID
   * @param fileId File identifier
   * @returns Promise resolving to file metadata or null if not found
   */
  get(fileId: string): Promise<MediaFile | null>;

  /**
   * Delete a file from storage
   * @param options Delete configuration
   * @returns Promise resolving to success boolean
   */
  delete(options: MediaDeleteOptions): Promise<boolean>;

  /**
   * Get file stream for serving
   * @param fileId File identifier
   * @returns Promise resolving to readable stream or null if not found
   */
  getStream(fileId: string): Promise<ReadableStream | null>;

  /**
   * Check if provider is properly configured and ready
   * @returns Promise resolving to health check result
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get provider-specific configuration info
   * @returns Configuration object for debugging
   */
  getConfig(): Record<string, unknown>;
}

export type MediaProviderType = 'local' | 'cloudinary' | 'aws' | 'gcp' | 'azure';

export interface MediaProviderConfig {
  /** Provider type */
  type: MediaProviderType;
  /** Provider-specific configuration */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
}

// ============================================================================
// Legacy Compatibility Types (E2.6 - API Bridge)
// These types maintain compatibility with existing consumers
// ============================================================================

/**
 * Entity media relationship for database-backed media management
 * @legacy Used by useUniversalMedia hook and admin routes
 */
export interface EntityMediaRelationship {
  id: number;
  entity_type: string;
  entity_id: number;
  media_file_id: number;
  media_type: 'logo' | 'cover' | 'gallery' | 'video' | 'document' | 'avatar' | 'banner' | 'audio';
  is_primary: boolean;
  display_order: number;
  created_at: Date;
}

/**
 * Legacy upload options for database-backed media upload
 * @legacy Used by useUniversalMedia hook and ListingService
 */
export interface LegacyUploadOptions {
  entityType: 'site' | 'user' | 'listing' | 'offer' | 'event' | 'temporary' | 'marketing' | 'document';
  entityId: number;
  mediaType: EntityMediaRelationship['media_type'];
  userTier?: 'visitor' | 'general' | 'essentials' | 'plus' | 'preferred' | 'premium';
  listingTier?: 'essentials' | 'plus' | 'preferred' | 'premium';
  file: Buffer;
  filename: string;
  mimeType: string;
}

/**
 * Legacy media file with database fields
 * @legacy Used by useUniversalMedia hook and admin routes
 */
export interface LegacyMediaFile {
  id: number;
  storage_type: 'local' | 'cloudinary';
  path: string;
  url: string;
  cloudinary_public_id: string | null;
  file_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown> | null;
  is_mock: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Media query options for legacy API
 * @legacy Used by useUniversalMedia hook
 */
export interface LegacyMediaQueryOptions {
  entityType: string;
  entityId: number;
  mediaType?: EntityMediaRelationship['media_type'];
  primaryOnly?: boolean;
}

/**
 * Storage statistics for admin dashboard
 * @legacy Used by admin media routes
 */
export interface MediaStatistics {
  total_files: number;
  total_size_mb: number;
  by_storage: {
    local: { count: number; size_mb: number };
    cloudinary: { count: number; size_mb: number };
  };
  by_entity_type: Record<string, number>;
  orphaned_count: number;
}

// Re-export legacy type aliases for backward compatibility
export type UploadOptions = LegacyUploadOptions;

/**
 * Combined media file with relationship data for hook consumers
 * Uses MediaFile.id (string) as the primary identifier, with relationship metadata
 * @legacy Used by useUniversalMedia hook for backward compatibility
 */
export type MediaFileWithRelationship = MediaFile & Omit<Partial<EntityMediaRelationship>, 'id'>;
