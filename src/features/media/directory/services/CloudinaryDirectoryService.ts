/**
 * CloudinaryDirectoryService - Admin Media Directory Browsing via Cloudinary API
 *
 * Provides directory listing for Cloudinary-stored media assets.
 * Used by the admin media manager for all non-local directories
 * (listings, users, events, offers, jobs, etc.).
 *
 * Storage routing:
 * - site/, marketing/ → LocalMediaDirectoryService (local-primary, Cloudinary mirror)
 * - Everything else   → THIS service (Cloudinary-primary)
 *
 * @module src/features/media/directory/services/CloudinaryDirectoryService.ts
 * @authority Build Map v2.1 ENHANCED - ADVANCED tier
 * @see src/core/services/media/providers/CloudinaryMediaProvider.ts
 * @see src/core/services/media/MirrorService.ts - Mirror pattern reference
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import type {
  DirectoryEntry,
  DirectoryListing,
  DirectoryStatistics,
} from '../types/directory-types';

// ============================================================================
// Types
// ============================================================================

interface CloudinaryFolder {
  name: string;
  path: string;
  external_id?: string;
}

interface CloudinaryResource {
  public_id: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  secure_url?: string;
  url: string;
  created_at: string;
  original_filename?: string;
  context?: {
    custom?: Record<string, string>;
  };
}

interface CloudinaryFoldersResponse {
  folders: CloudinaryFolder[];
  next_cursor?: string | null;
  total_count?: number;
}

interface CloudinarySearchResponse {
  resources: CloudinaryResource[];
  total_count: number;
  next_cursor?: string | null;
}

interface CloudinaryUsageResponse {
  resources?: number;
  derived_resources?: number;
  storage?: {
    usage?: number;
    allowed?: number;
  };
  bandwidth?: {
    usage?: number;
    allowed?: number;
  };
  transformations?: {
    usage?: number;
    allowed?: number;
  };
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  thumbnailQuality?: number;
}

// ============================================================================
// CloudinaryDirectoryService
// ============================================================================

export class CloudinaryDirectoryService {
  private config: Required<CloudinaryConfig>;
  private baseApiUrl: string;
  private baseResUrl: string;

  constructor(config?: Partial<CloudinaryConfig>) {
    this.config = {
      cloudName: config?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: config?.apiKey || process.env.CLOUDINARY_API_KEY || '',
      apiSecret: config?.apiSecret || process.env.CLOUDINARY_API_SECRET || '',
      thumbnailWidth: config?.thumbnailWidth ?? 300,
      thumbnailHeight: config?.thumbnailHeight ?? 300,
      thumbnailQuality: config?.thumbnailQuality ?? 80,
    };

    if (!this.config.cloudName || !this.config.apiKey || !this.config.apiSecret) {
      console.error('[CloudinaryDirectory] Missing Cloudinary credentials:', {
        hasCloudName: !!this.config.cloudName,
        hasApiKey: !!this.config.apiKey,
        hasApiSecret: !!this.config.apiSecret,
      });
    }

    this.baseApiUrl = `https://api.cloudinary.com/v1_1/${this.config.cloudName}`;
    this.baseResUrl = `https://res.cloudinary.com/${this.config.cloudName}`;
  }

  // --------------------------------------------------------------------------
  // Directory Listing
  // --------------------------------------------------------------------------

  /**
   * List the contents of a Cloudinary folder.
   *
   * @param relativePath - Folder path in Cloudinary (empty = root)
   * @returns DirectoryListing with folder and resource entries
   */
  async listDirectory(relativePath: string): Promise<DirectoryListing> {
    const normalizedPath = relativePath.replace(/^\/+|\/+$/g, '');

    // Fetch subfolders and resources in parallel
    const [subfolders, resources] = await Promise.all([
      this.listSubfolders(normalizedPath),
      this.listResources(normalizedPath),
    ]);

    // Fetch per-folder child counts with limited concurrency (3 at a time)
    // to avoid Cloudinary rate-limit failures that caused "0 items" display.
    const folderEntries: DirectoryEntry[] = await this.buildFolderEntriesWithCounts(subfolders);

    // Build file entries from Cloudinary resources
    const fileEntries: DirectoryEntry[] = resources.map((resource) =>
      this.buildEntryFromResource(resource)
    );

    // Enrich file entries with DB metadata (alt/title) for entries where
    // Cloudinary context is empty (e.g. search index delay after upload,
    // or files uploaded before context metadata was supported).
    await this.enrichEntriesFromDb(fileEntries);

    const entries = [...folderEntries, ...fileEntries];
    const totalSize = fileEntries.reduce((sum, e) => sum + (e.size ?? 0), 0);

    // Compute parent path
    let parentPath: string | null = null;
    if (normalizedPath) {
      const segments = normalizedPath.split('/');
      segments.pop();
      parentPath = segments.length > 0 ? segments.join('/') : '';
    }

    return {
      path: normalizedPath,
      parentPath,
      entries,
      totalFiles: fileEntries.length,
      totalFolders: folderEntries.length,
      totalSize,
    };
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  /**
   * Get aggregate statistics from Cloudinary.
   * Uses /usage endpoint for storage totals, and search API for per-type counts.
   * The /usage endpoint returns `resources` as a plain number (total count),
   * so we query per resource_type via search to get the breakdown.
   */
  async getStatistics(): Promise<DirectoryStatistics> {
    try {
      // Parallel: folders, usage (storage), per-type counts, and alt text coverage
      const [rootFolders, usage, imageSearch, videoSearch, rawSearch, imagesWithAlt] = await Promise.all([
        this.listSubfolders(''),
        this.getUsage(),
        this.cloudinarySearch('resource_type:image', 0).catch(() => ({ resources: [], total_count: 0 })),
        this.cloudinarySearch('resource_type:video', 0).catch(() => ({ resources: [], total_count: 0 })),
        this.cloudinarySearch('resource_type:raw', 0).catch(() => ({ resources: [], total_count: 0 })),
        // Count images that HAVE alt text set in context metadata
        this.cloudinarySearch('resource_type:image AND context.alt:*', 0).catch(() => ({ resources: [], total_count: 0 })),
      ]);

      const imageCount = imageSearch.total_count;
      const videoCount = videoSearch.total_count;
      const rawCount = rawSearch.total_count;
      const totalFiles = (typeof usage.resources === 'number' ? usage.resources : 0)
        || (imageCount + videoCount + rawCount);

      // Storage from /usage endpoint (bytes)
      const totalSizeBytes = usage.storage?.usage ?? 0;
      const totalSizeMB = Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100;

      // SEO health: images missing alt text
      const missingAltTextCount = imageCount - imagesWithAlt.total_count;
      const seoHealthPercent = imageCount > 0
        ? Math.round((imagesWithAlt.total_count / imageCount) * 100)
        : 100;

      return {
        totalFiles,
        totalFolders: rootFolders.length,
        totalSizeBytes,
        totalSizeMB,
        filesByType: {
          image: imageCount,
          video: videoCount,
          document: rawCount,
        },
        missingAltTextCount,
        seoHealthPercent,
      };
    } catch (error) {
      console.error('[CloudinaryDirectory] Failed to get statistics:', error);
      return {
        totalFiles: 0,
        totalFolders: 0,
        totalSizeBytes: 0,
        totalSizeMB: 0,
        filesByType: {},
        missingAltTextCount: 0,
        seoHealthPercent: 100,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Private: Cloudinary API calls
  // --------------------------------------------------------------------------

  /**
   * List subfolders of a given path via Cloudinary Admin API.
   */
  private async listSubfolders(folderPath: string): Promise<CloudinaryFolder[]> {
    try {
      // Cloudinary folders API expects path segments as-is, NOT url-encoded as a single segment.
      // e.g. /folders/listings/10 NOT /folders/listings%2F10
      const endpoint = folderPath
        ? `${this.baseApiUrl}/folders/${folderPath}`
        : `${this.baseApiUrl}/folders`;

      const response = await fetch(endpoint, {
        headers: { Authorization: this.getAuthHeader() },
      });

      if (!response.ok) {
        // 404 means no subfolders exist - not an error
        if (response.status === 404) return [];
        const body = await response.text().catch(() => '');
        console.error(`[CloudinaryDirectory] Folder list failed: ${response.status} for path="${folderPath}"`, body);
        return [];
      }

      const data: CloudinaryFoldersResponse = await response.json();
      return data.folders || [];
    } catch (error) {
      console.error('[CloudinaryDirectory] Failed to list subfolders:', error);
      return [];
    }
  }

  /**
   * List resources (files) in a specific folder via Cloudinary Search API.
   * Uses folder= (exact match for direct resources in this folder).
   * Cloudinary stores images in nested paths (e.g. listings/10/images/),
   * so direct resources at a top-level folder may be 0 - that's correct,
   * subfolders will be shown for navigation.
   */
  private async listResources(folderPath: string): Promise<CloudinaryResource[]> {
    if (!folderPath) {
      // Root level - don't list all resources, just folders
      return [];
    }

    try {
      const result = await this.cloudinarySearch(
        `folder="${folderPath}"`,
        500
      );
      return result.resources || [];
    } catch (error) {
      console.error('[CloudinaryDirectory] Failed to list resources:', error);
      return [];
    }
  }

  /**
   * Execute a Cloudinary search query.
   */
  private async cloudinarySearch(
    expression: string,
    maxResults: number
  ): Promise<CloudinarySearchResponse> {
    const response = await fetch(`${this.baseApiUrl}/resources/search`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expression,
        sort_by: [{ created_at: 'desc' }],
        max_results: maxResults,
        with_field: ['context'],
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloudinary search failed: ${response.status}`);
    }

    return response.json();
  }

  // --------------------------------------------------------------------------
  // Private: Folder child counts (rate-limit safe)
  // --------------------------------------------------------------------------

  /**
   * Build folder DirectoryEntries with childCount, fetched in batches of 3
   * to stay within Cloudinary rate limits. Each folder needs 2 API calls
   * (subfolders + resource count), so batching 3 = 6 concurrent calls max.
   */
  private async buildFolderEntriesWithCounts(
    subfolders: CloudinaryFolder[]
  ): Promise<DirectoryEntry[]> {
    const BATCH_SIZE = 3;
    const results: DirectoryEntry[] = [];

    for (let i = 0; i < subfolders.length; i += BATCH_SIZE) {
      const batch = subfolders.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (folder) => {
          let childCount = 0;
          try {
            const [childFolders, resourceResult] = await Promise.all([
              this.listSubfolders(folder.path),
              this.cloudinarySearch(`folder="${folder.path}"`, 0),
            ]);
            childCount = childFolders.length + resourceResult.total_count;
          } catch (err) {
            console.warn(`[CloudinaryDirectory] childCount failed for ${folder.path}:`, err);
          }
          return {
            name: folder.name,
            path: folder.path,
            type: 'folder' as const,
            childCount,
            modifiedAt: new Date().toISOString(),
          } satisfies DirectoryEntry;
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Should not happen since inner function catches errors, but safety net
          console.error('[CloudinaryDirectory] Unexpected batch failure:', result.reason);
        }
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // Private: Entry building
  // --------------------------------------------------------------------------

  /**
   * Build a DirectoryEntry from a Cloudinary resource.
   */
  private buildEntryFromResource(resource: CloudinaryResource): DirectoryEntry {
    const isImage = resource.resource_type === 'image';
    const isVideo = resource.resource_type === 'video';

    // Extract filename from public_id (last segment)
    const publicIdParts = resource.public_id.split('/');
    const baseName = publicIdParts[publicIdParts.length - 1] || resource.public_id;
    const filename = resource.format ? `${baseName}.${resource.format}` : baseName;

    // Build MIME type
    let mimeType = 'application/octet-stream';
    if (isImage) {
      mimeType = `image/${resource.format === 'jpg' ? 'jpeg' : resource.format}`;
    } else if (isVideo) {
      mimeType = `video/${resource.format}`;
    }

    // Build thumbnail URL using Cloudinary transformations
    let thumbnailUrl: string | undefined;
    if (isImage) {
      thumbnailUrl = `${this.baseResUrl}/image/upload/c_fill,w_${this.config.thumbnailWidth},h_${this.config.thumbnailHeight},q_${this.config.thumbnailQuality}/${resource.public_id}`;
    }

    // Extract Cloudinary context metadata (alt, caption) if present
    const context = resource.context?.custom;
    const altText = context?.alt || undefined;
    const titleText = context?.caption || undefined;

    return {
      name: resource.original_filename
        ? `${resource.original_filename}.${resource.format}`
        : filename,
      path: resource.public_id,
      type: 'file',
      size: resource.bytes,
      mimeType,
      thumbnailUrl,
      url: resource.secure_url || resource.url,
      altText,
      titleText,
      modifiedAt: resource.created_at,
      createdAt: resource.created_at,
    };
  }

  // --------------------------------------------------------------------------
  // Private: DB Metadata Enrichment
  // --------------------------------------------------------------------------

  /**
   * Enrich DirectoryEntry objects with alt/title from the media_files DB.
   * This covers cases where Cloudinary context metadata is empty (search index
   * delay, legacy uploads, or files uploaded via admin upload route which
   * registers metadata in DB immediately).
   *
   * Only queries for entries missing altText — entries already having it from
   * Cloudinary context are left untouched.
   */
  private async enrichEntriesFromDb(entries: DirectoryEntry[]): Promise<void> {
    const needsEnrichment = entries.filter(e => e.type === 'file' && !e.altText);
    if (needsEnrichment.length === 0) return;

    try {
      const db = getDatabaseService();
      // Collect cloudinary public_ids (stored in entry.path) for lookup
      const publicIds = needsEnrichment.map(e => e.path);
      if (publicIds.length === 0) return;

      // Batch query: match by cloudinary_public_id or path
      const placeholders = publicIds.map(() => '?').join(',');
      const result = await db.query<{
        cloudinary_public_id: string | null;
        path: string;
        alt_text: string | null;
        title_text: string | null;
      }>(
        `SELECT cloudinary_public_id, path, alt_text, title_text
         FROM media_files
         WHERE cloudinary_public_id IN (${placeholders})
            OR path IN (${placeholders})`,
        [...publicIds, ...publicIds]
      );

      // Build lookup map by cloudinary_public_id and path
      const metaMap = new Map<string, { alt: string | null; title: string | null }>();
      for (const row of result.rows) {
        if (row.cloudinary_public_id) {
          metaMap.set(row.cloudinary_public_id, { alt: row.alt_text, title: row.title_text });
        }
        if (row.path) {
          metaMap.set(row.path, { alt: row.alt_text, title: row.title_text });
        }
      }

      // Merge into entries
      for (const entry of needsEnrichment) {
        const meta = metaMap.get(entry.path);
        if (meta) {
          if (meta.alt) entry.altText = meta.alt;
          if (meta.title) entry.titleText = meta.title;
        }
      }
    } catch (err) {
      // Non-critical: if DB lookup fails, Cloudinary context is still the source
      console.warn('[CloudinaryDirectory] DB metadata enrichment failed:', err instanceof Error ? err.message : err);
    }
  }

  // --------------------------------------------------------------------------
  // Private: Usage / Statistics API
  // --------------------------------------------------------------------------

  /**
   * Fetch account usage from Cloudinary Admin API /usage endpoint.
   * Returns resource counts by type, storage usage, bandwidth, etc.
   */
  private async getUsage(): Promise<CloudinaryUsageResponse> {
    try {
      const response = await fetch(`${this.baseApiUrl}/usage`, {
        headers: { Authorization: this.getAuthHeader() },
      });

      if (!response.ok) {
        console.error(`[CloudinaryDirectory] Usage API failed: ${response.status}`);
        return {};
      }

      return response.json();
    } catch (error) {
      console.error('[CloudinaryDirectory] Failed to fetch usage:', error);
      return {};
    }
  }

  // --------------------------------------------------------------------------
  // Metadata Sync
  // --------------------------------------------------------------------------

  /**
   * Push SEO context metadata (alt, caption) to Cloudinary for a resource.
   * Uses the Cloudinary Admin API `explicit` endpoint with context.
   *
   * Cloudinary stores these as contextual metadata accessible via:
   * - context.alt  → alt text (used in SEO / img alt attribute)
   * - context.caption → title / caption text
   *
   * @param publicId - Cloudinary public_id of the resource
   * @param metadata - alt and/or caption text to set
   * @param resourceType - 'image' | 'video' | 'raw' (defaults to 'image')
   */
  async updateContextMetadata(
    publicId: string,
    metadata: { alt?: string; caption?: string },
    resourceType: string = 'image'
  ): Promise<void> {
    const contextParts: string[] = [];
    if (metadata.alt !== undefined) {
      contextParts.push(`alt=${metadata.alt.replace(/[|=]/g, ' ')}`);
    }
    if (metadata.caption !== undefined) {
      contextParts.push(`caption=${metadata.caption.replace(/[|=]/g, ' ')}`);
    }
    if (contextParts.length === 0) return;

    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('type', 'upload');
    formData.append('context', contextParts.join('|'));

    const response = await fetch(
      `${this.baseApiUrl}/${resourceType}/explicit`,
      {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(
        `[CloudinaryDirectory] Context metadata update failed: ${response.status} for public_id="${publicId}"`,
        body
      );
      throw new Error(`Cloudinary context update failed (${response.status})`);
    }
  }

  /**
   * Update the display_name of a Cloudinary resource.
   * Uses POST /resources/{type}/upload/{publicId} with { display_name }.
   * Pattern: identical to renameResource() step 2 (lines 652-666).
   */
  async updateDisplayName(
    publicId: string,
    displayName: string,
    resourceType: string = 'image'
  ): Promise<void> {
    if (!displayName) return;

    const encodedPublicId = encodeURIComponent(publicId);
    const response = await fetch(
      `${this.baseApiUrl}/resources/${resourceType}/upload/${encodedPublicId}`,
      {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ display_name: displayName }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(
        `[CloudinaryDirectory] display_name update failed: ${response.status} for "${publicId}"`,
        body
      );
      // Non-fatal: context metadata was already saved
    }
  }

  // --------------------------------------------------------------------------
  // Resource Move / Rename
  // --------------------------------------------------------------------------

  /**
   * Move a Cloudinary resource to a new folder.
   *
   * Cloudinary has TWO independent concepts for file location:
   * - `public_id`: The path used in URLs (changed via `/rename` endpoint)
   * - `asset_folder`: The display folder in Cloudinary's Media Library UI
   *   (changed via Admin API resource update)
   *
   * This method updates BOTH to ensure the file truly moves in Cloudinary.
   *
   * @param fromPublicId - Current public_id (e.g. "site/branding/abc-123")
   * @param toPublicId - New public_id (e.g. "marketing/abc-123")
   * @param resourceType - 'image' | 'video' | 'raw' (defaults to 'image')
   * @returns The new secure_url after rename
   */
  async renameResource(
    fromPublicId: string,
    toPublicId: string,
    resourceType: string = 'image'
  ): Promise<{ publicId: string; url: string }> {
    // Strip file extensions for image public_ids (Cloudinary stores without extension)
    const cleanFrom = resourceType === 'image'
      ? fromPublicId.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '')
      : fromPublicId;
    const cleanTo = resourceType === 'image'
      ? toPublicId.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '')
      : toPublicId;

    // Step 1: Rename the public_id (changes the URL path)
    const formData = new URLSearchParams();
    formData.append('from_public_id', cleanFrom);
    formData.append('to_public_id', cleanTo);
    formData.append('overwrite', 'false');

    const response = await fetch(
      `${this.baseApiUrl}/${resourceType}/rename`,
      {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(
        `[CloudinaryDirectory] Rename failed: ${response.status} from="${cleanFrom}" to="${cleanTo}"`,
        body
      );
      throw new Error(`Cloudinary rename failed (${response.status}): ${body}`);
    }

    const result = await response.json();
    const newPublicId: string = result.public_id;
    const newUrl: string = result.secure_url || result.url;

    // Step 2: Update asset_folder and display_name.
    // The rename endpoint only changes public_id — it does NOT update:
    // - asset_folder: which folder the file appears in (Media Library UI + search)
    // - display_name: the label shown on the thumbnail in Cloudinary's UI
    const newFolder = cleanTo.includes('/')
      ? cleanTo.substring(0, cleanTo.lastIndexOf('/'))
      : '';
    const newDisplayName = cleanTo.includes('/')
      ? cleanTo.substring(cleanTo.lastIndexOf('/') + 1)
      : cleanTo;

    try {
      const encodedPublicId = encodeURIComponent(newPublicId);
      const updateResponse = await fetch(
        `${this.baseApiUrl}/resources/${resourceType}/upload/${encodedPublicId}`,
        {
          method: 'POST',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asset_folder: newFolder,
            display_name: newDisplayName,
          }),
        }
      );

      if (!updateResponse.ok) {
        const body = await updateResponse.text().catch(() => '');
        console.warn(
          `[CloudinaryDirectory] asset_folder update failed: ${updateResponse.status} for "${newPublicId}"`,
          body
        );
        // Non-fatal: the rename succeeded, just the folder display is wrong
      }
    } catch (err) {
      console.warn(
        '[CloudinaryDirectory] asset_folder update error (non-fatal):',
        err instanceof Error ? err.message : err
      );
    }

    return {
      publicId: newPublicId,
      url: newUrl,
    };
  }

  /**
   * Copy a Cloudinary resource to a new location.
   *
   * Cloudinary has no native copy API. This method copies by uploading
   * the existing resource's URL as the source for a new upload at the
   * destination path, then sets the correct asset_folder and display_name.
   *
   * @param sourceUrl - The secure_url of the source resource
   * @param destPublicId - The desired public_id for the copy (e.g. "Cloudstock/mountain_storm")
   * @param resourceType - 'image' | 'video' | 'raw' (defaults to 'image')
   * @param context - Optional context metadata (alt, caption) to copy over
   * @returns The new public_id and secure_url
   */
  async copyResource(
    sourceUrl: string,
    destPublicId: string,
    resourceType: string = 'image',
    context?: { alt?: string; caption?: string }
  ): Promise<{ publicId: string; url: string }> {
    // Strip extension from destination public_id for images
    const cleanDest = resourceType === 'image'
      ? destPublicId.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '')
      : destPublicId;

    // Split into folder and filename for Cloudinary upload params
    const lastSlash = cleanDest.lastIndexOf('/');
    const folder = lastSlash !== -1 ? cleanDest.substring(0, lastSlash) : '';
    const publicId = lastSlash !== -1 ? cleanDest.substring(lastSlash + 1) : cleanDest;

    // Build context string if provided
    const contextParts: string[] = [];
    if (context?.alt) contextParts.push(`alt=${context.alt.replace(/[|=]/g, ' ')}`);
    if (context?.caption) contextParts.push(`caption=${context.caption.replace(/[|=]/g, ' ')}`);
    const contextString = contextParts.length > 0 ? contextParts.join('|') : null;

    // Build signature params
    const timestamp = Math.round(Date.now() / 1000);
    const signatureParams: Record<string, string | number> = {
      public_id: publicId,
      timestamp,
    };
    if (folder) signatureParams.folder = folder;
    if (contextString) signatureParams.context = contextString;

    const signature = this.generateUploadSignature(signatureParams);

    // Upload from URL (Cloudinary fetches the existing resource and creates a copy)
    const formData = new URLSearchParams();
    formData.append('file', sourceUrl);
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('api_key', this.config.apiKey);
    if (folder) formData.append('folder', folder);
    if (contextString) formData.append('context', contextString);

    const response = await fetch(
      `${this.baseApiUrl}/${resourceType}/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(
        `[CloudinaryDirectory] Copy upload failed: ${response.status} dest="${cleanDest}"`,
        body
      );
      throw new Error(`Cloudinary copy failed (${response.status}): ${body}`);
    }

    const result = await response.json();
    const newPublicId: string = result.public_id;
    const newUrl: string = result.secure_url || result.url;

    // Update asset_folder and display_name (same pattern as renameResource)
    try {
      const encodedPublicId = encodeURIComponent(newPublicId);
      await fetch(
        `${this.baseApiUrl}/resources/${resourceType}/upload/${encodedPublicId}`,
        {
          method: 'POST',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asset_folder: folder,
            display_name: publicId,
          }),
        }
      );
    } catch (err) {
      console.warn(
        '[CloudinaryDirectory] Copy asset_folder update error (non-fatal):',
        err instanceof Error ? err.message : err
      );
    }

    return { publicId: newPublicId, url: newUrl };
  }

  // --------------------------------------------------------------------------
  // Resource Lookup
  // --------------------------------------------------------------------------

  /**
   * Search Cloudinary for a resource by filename, returning its actual public_id.
   * Useful when the stored cloudinary_public_id is wrong (e.g. guessed from file path
   * but actual resource was uploaded with a UUID or different folder structure).
   *
   * @param filename - The original filename (e.g. "logo-icon.png" or "logo-icon")
   * @param folderHint - Optional folder path hint to narrow search (e.g. "site/branding")
   * @returns The actual public_id if found, null otherwise
   */
  async findResourcePublicId(
    filename: string,
    folderHint?: string
  ): Promise<string | null> {
    // Strip extension for search - Cloudinary stores filename without extension
    const baseName = filename.replace(/\.[^.]+$/, '');

    // Try multiple search strategies
    const searchStrategies = [
      // Strategy 1: Search by filename in any folder containing the hint path
      folderHint ? `filename:${baseName} AND folder:${folderHint}*` : null,
      // Strategy 2: Search by filename with backup prefix folder
      folderHint ? `filename:${baseName} AND folder:site-backup/${folderHint}*` : null,
      // Strategy 3: Broader search just by filename
      `filename:${baseName}`,
    ].filter(Boolean) as string[];

    for (const expression of searchStrategies) {
      try {
        const result = await this.cloudinarySearch(expression, 5);
        if (result.resources && result.resources.length > 0) {
          // Return the first match's public_id
          const match = result.resources[0];
          if (match) return match.public_id;
        }
      } catch {
        // Search failed, try next strategy
        continue;
      }
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Private: Auth
  // --------------------------------------------------------------------------

  private getAuthHeader(): string {
    return (
      'Basic ' +
      Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')
    );
  }

  /**
   * Generate a SHA-1 signature for Cloudinary Upload API calls.
   * The Upload API uses signature-based auth (not Basic Auth like the Admin API).
   */
  private generateUploadSignature(params: Record<string, string | number>): string {
    const crypto = require('crypto') as typeof import('crypto');
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return crypto.createHash('sha1').update(sortedParams + this.config.apiSecret).digest('hex');
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: CloudinaryDirectoryService | null = null;

/**
 * Get the singleton CloudinaryDirectoryService instance.
 */
export function getCloudinaryDirectoryService(): CloudinaryDirectoryService {
  if (!instance) {
    instance = new CloudinaryDirectoryService();
  }
  return instance;
}

export default CloudinaryDirectoryService;
