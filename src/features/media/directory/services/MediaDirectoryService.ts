/**
 * MediaDirectoryService - Admin Media Directory Management
 *
 * Backend service for browsing, organizing, and managing the media file system.
 * Provides directory listing, folder CRUD, file operations, metadata updates,
 * and image re-crop support.
 *
 * Architecture:
 * - DatabaseService composition (canonical CampaignService pattern)
 * - fs.promises for all file system operations
 * - path-security utilities for traversal prevention on every operation
 * - sharp for image processing and re-crop
 *
 * @module src/features/media/directory/services/MediaDirectoryService.ts
 * @authority Build Map v2.1 ENHANCED - ADVANCED tier
 * @phase Phase 3 - Admin Media Directory Service
 * @see src/core/services/CampaignService.ts - DatabaseService composition pattern
 * @see src/core/services/media/providers/LocalMediaProvider.ts - File system patterns
 */

import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { MediaFileRow } from '@core/types/db-rows';
import { DbResult } from '@core/types/db';
import { bigIntToNumber } from '@core/utils/bigint';
import { BizError } from '@core/errors/BizError';
import {
  DirectoryEntry,
  DirectoryListing,
  UpdateFileMetadataRequest,
  DirectoryStatistics,
} from '../types/directory-types';
import {
  resolveSafePath,
  getRelativePath,
  getPublicUrl,
  getMediaRoot,
  isValidName,
  isImageMimeType,
} from '../utils/path-security';
import { getCloudinaryDirectoryService } from './CloudinaryDirectoryService';
import { getPolicyRouter } from '@core/services/media/PolicyRouter';

// ============================================================================
// MediaDirectoryService
// ============================================================================

export class MediaDirectoryService {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || getDatabaseService();
  }

  // --------------------------------------------------------------------------
  // Directory Listing
  // --------------------------------------------------------------------------

  /**
   * List the contents of a directory within the media root.
   *
   * @param relativePath - Relative path from media root (empty = root)
   * @returns DirectoryListing with enriched file and folder entries
   */
  async listDirectory(relativePath: string): Promise<DirectoryListing> {
    const absolutePath = resolveSafePath(relativePath);
    const normalizedRelative = getRelativePath(absolutePath);

    // Ensure directory exists
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`Directory not found: ${normalizedRelative || 'root'}`);
    }

    const stat = await fs.stat(absolutePath);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${normalizedRelative}`);
    }

    // Read directory entries
    const rawEntries = await fs.readdir(absolutePath, { withFileTypes: true });

    // Filter out hidden entries (dot-files, .metadata/) and generated thumbnails
    const visibleEntries = rawEntries.filter(
      (e) => !e.name.startsWith('.') && e.name !== '.metadata' && !e.name.endsWith('_thumb.webp')
    );

    // Build entries in parallel
    const entries = await Promise.all(
      visibleEntries.map((dirent) => this.buildEntry(absolutePath, normalizedRelative, dirent))
    );

    const fileEntries = entries.filter((e) => e.type === 'file');
    const folderEntries = entries.filter((e) => e.type === 'folder');
    const totalSize = fileEntries.reduce((sum, e) => sum + (e.size ?? 0), 0);

    // Compute parent path
    const parentPath = normalizedRelative === '' ? null : getRelativePath(path.dirname(absolutePath));

    return {
      path: normalizedRelative,
      parentPath,
      entries,
      totalFiles: fileEntries.length,
      totalFolders: folderEntries.length,
      totalSize,
    };
  }

  // --------------------------------------------------------------------------
  // Folder Operations
  // --------------------------------------------------------------------------

  /**
   * Create a new folder within the media sandbox.
   *
   * @param parentPath - Relative parent directory path
   * @param name - New folder name (validated via isValidName)
   * @returns DirectoryEntry for the newly created folder
   */
  async createFolder(parentPath: string, name: string): Promise<DirectoryEntry> {
    if (!isValidName(name)) {
      throw new Error(`Invalid folder name: "${name}". Use alphanumeric characters, hyphens, underscores, and dots only.`);
    }

    const parentAbsolute = resolveSafePath(parentPath);
    const newFolderAbsolute = path.join(parentAbsolute, name);

    // Validate the joined path stays within sandbox
    resolveSafePath(getRelativePath(newFolderAbsolute));

    // Ensure parent exists
    try {
      await fs.access(parentAbsolute);
    } catch {
      throw new Error(`Parent directory not found: ${parentPath || 'root'}`);
    }

    // Check for conflicts
    try {
      await fs.access(newFolderAbsolute);
      throw new Error(`A file or folder named "${name}" already exists.`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    await fs.mkdir(newFolderAbsolute, { recursive: true });

    const folderStat = await fs.stat(newFolderAbsolute);
    const relativeFolderPath = getRelativePath(newFolderAbsolute);

    return {
      name,
      path: relativeFolderPath,
      type: 'folder',
      childCount: 0,
      modifiedAt: folderStat.mtime.toISOString(),
      createdAt: folderStat.birthtime.toISOString(),
    };
  }

  /**
   * Rename an existing folder within the media sandbox.
   *
   * @param folderPath - Relative path to the folder to rename
   * @param newName - New name for the folder
   * @returns DirectoryEntry for the renamed folder
   */
  async renameFolder(folderPath: string, newName: string): Promise<DirectoryEntry> {
    if (!isValidName(newName)) {
      throw new Error(`Invalid folder name: "${newName}". Use alphanumeric characters, hyphens, underscores, and dots only.`);
    }

    const absoluteFolder = resolveSafePath(folderPath);
    const parentAbsolute = path.dirname(absoluteFolder);
    const newAbsolute = path.join(parentAbsolute, newName);

    // Validate new path stays in sandbox
    resolveSafePath(getRelativePath(newAbsolute));

    // Verify source exists and is a directory
    try {
      const s = await fs.stat(absoluteFolder);
      if (!s.isDirectory()) throw new Error(`Path is not a directory: ${folderPath}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Folder not found: ${folderPath}`);
      }
      throw err;
    }

    // Check for name conflict
    try {
      await fs.access(newAbsolute);
      throw new Error(`A file or folder named "${newName}" already exists.`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    // Rename on disk
    await fs.rename(absoluteFolder, newAbsolute);

    // Update DB records: path values that start with the old folder path
    // Also sync Cloudinary public_ids for any files under this folder
    await this.updateFilePathsAfterFolderRename(absoluteFolder, newAbsolute);

    const folderStat = await fs.stat(newAbsolute);
    const relativeNew = getRelativePath(newAbsolute);
    const children = await fs.readdir(newAbsolute);

    return {
      name: newName,
      path: relativeNew,
      type: 'folder',
      childCount: children.filter((c) => !c.startsWith('.')).length,
      modifiedAt: folderStat.mtime.toISOString(),
      createdAt: folderStat.birthtime.toISOString(),
    };
  }

  /**
   * Delete a folder and all its contents from the media sandbox.
   * Also removes any orphaned DB records whose path falls under the folder.
   *
   * @param folderPath - Relative path to the folder to delete
   * @returns true if deletion succeeded
   */
  async deleteFolder(folderPath: string): Promise<boolean> {
    const absoluteFolder = resolveSafePath(folderPath);

    // Verify it is a directory
    try {
      const s = await fs.stat(absoluteFolder);
      if (!s.isDirectory()) throw new Error(`Path is not a directory: ${folderPath}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Folder not found: ${folderPath}`);
      }
      throw err;
    }

    // Remove orphaned DB records under this folder path
    // DB column is 'path', not 'file_path'; use forward slashes for consistent matching
    const relativeFolderPath = getRelativePath(absoluteFolder);
    const dbPathPrefix = relativeFolderPath ? `${relativeFolderPath}/` : '';
    await this.db.query(
      'DELETE FROM media_files WHERE path LIKE ?',
      [`%${dbPathPrefix}%`]
    );

    // Remove from disk recursively
    await fs.rm(absoluteFolder, { recursive: true, force: true });

    return true;
  }

  // --------------------------------------------------------------------------
  // File Operations
  // --------------------------------------------------------------------------

  /**
   * Move a media file to a different directory.
   * Updates the physical file on disk and the DB record.
   *
   * @param fileId - media_files.id
   * @param destinationPath - Relative destination directory path
   * @returns DirectoryEntry for the moved file
   */
  async moveFile(fileId: number, destinationPath: string): Promise<DirectoryEntry> {
    const fileRow = await this.requireFileRow(fileId);
    const destAbsolute = resolveSafePath(destinationPath);
    const srcAbsolute = resolveSafePath(fileRow.path);

    // Ensure destination is a directory
    await this.ensureDirectory(destAbsolute);

    const filename = path.basename(fileRow.path);
    const newAbsolute = path.join(destAbsolute, filename);
    const newRelative = getRelativePath(newAbsolute);

    // Rename (move) on disk
    await fs.rename(srcAbsolute, newAbsolute);

    // Also move the thumbnail if it exists (_thumb.webp sibling)
    const thumbBaseName = path.basename(fileRow.path, path.extname(fileRow.path));
    const srcThumb = path.join(path.dirname(srcAbsolute), `${thumbBaseName}_thumb.webp`);
    const destThumb = path.join(destAbsolute, `${thumbBaseName}_thumb.webp`);
    try {
      await fs.access(srcThumb);
      await fs.rename(srcThumb, destThumb);
    } catch {
      // No thumbnail to move - that's fine
    }

    // Sync move to Cloudinary if file has a Cloudinary copy
    let newCloudinaryPublicId = fileRow.cloudinary_public_id;
    let newUrl = fileRow.url;
    if (fileRow.cloudinary_public_id) {
      try {
        const cloudinary = getCloudinaryDirectoryService();
        // Cloudinary resource types: image, video, raw (audio is stored as 'video')
        let resourceType = (fileRow.file_type ?? 'image').split('/')[0] || 'image';
        if (resourceType === 'audio') resourceType = 'video';

        // Build new Cloudinary public_id from destination path
        // e.g., "site/branding/uuid" → "marketing/uuid"
        const oldPublicId = fileRow.cloudinary_public_id;
        const fileBaseName = oldPublicId.split('/').pop() || path.basename(fileRow.path, path.extname(fileRow.path));
        // destinationPath is the relative directory (e.g., "marketing" or "site/logos")
        const newPublicIdPath = destinationPath.replace(/^\/+|\/+$/g, '') + '/' + fileBaseName;

        const renameResult = await cloudinary.renameResource(
          oldPublicId,
          newPublicIdPath,
          resourceType
        );
        newCloudinaryPublicId = renameResult.publicId;
        newUrl = renameResult.url;

        console.info(
          `[MediaDirectoryService] Cloudinary rename: "${oldPublicId}" → "${renameResult.publicId}"`
        );
      } catch (err) {
        // Log but don't fail the move - local + DB are already updated
        console.error(
          '[MediaDirectoryService] Cloudinary move sync failed (local move succeeded):',
          err instanceof Error ? err.message : err
        );
      }
    }

    // Update DB with new path, cloudinary_public_id, and url
    await this.db.query(
      'UPDATE media_files SET path = ?, cloudinary_public_id = ?, url = ? WHERE id = ?',
      [newRelative, newCloudinaryPublicId, newUrl || getPublicUrl(newRelative), fileId]
    );

    return this.buildEntryFromRow({
      ...fileRow,
      path: newRelative,
      cloudinary_public_id: newCloudinaryPublicId,
      url: newUrl || getPublicUrl(newRelative),
    });
  }

  /**
   * Copy a media file to a different directory.
   * Creates a new file on disk, a new DB record, and copies to Cloudinary.
   *
   * @param fileId - media_files.id of the source file
   * @param destinationPath - Relative destination directory path
   * @returns DirectoryEntry representing the copied file at its new location
   */
  async copyFile(fileId: number, destinationPath: string): Promise<DirectoryEntry> {
    const fileRow = await this.requireFileRow(fileId);
    const destAbsolute = resolveSafePath(destinationPath);
    const srcAbsolute = resolveSafePath(fileRow.path);

    await this.ensureDirectory(destAbsolute);

    const filename = path.basename(fileRow.path);
    const newAbsolute = path.join(destAbsolute, filename);

    // Copy file bytes on disk
    await fs.copyFile(srcAbsolute, newAbsolute);

    // Also copy the thumbnail if it exists
    const baseName = path.basename(fileRow.path, path.extname(fileRow.path));
    const srcThumb = path.join(path.dirname(srcAbsolute), `${baseName}_thumb.webp`);
    const destThumb = path.join(destAbsolute, `${baseName}_thumb.webp`);
    try {
      await fs.access(srcThumb);
      await fs.copyFile(srcThumb, destThumb);
    } catch {
      // No thumbnail - fine
    }

    const copyStat = await fs.stat(newAbsolute);
    const relPath = getRelativePath(newAbsolute);

    // Copy to Cloudinary if source has a Cloudinary copy
    let newCloudinaryPublicId: string | null = null;
    let newUrl: string = getPublicUrl(relPath);
    if (fileRow.cloudinary_public_id && fileRow.url) {
      try {
        const cloudinary = getCloudinaryDirectoryService();
        // Cloudinary resource types: image, video, raw (audio is stored as 'video')
        let resourceType = (fileRow.file_type ?? 'image').split('/')[0] || 'image';
        if (resourceType === 'audio') resourceType = 'video';

        // Build destination public_id: destinationFolder/filename (without extension for images)
        const destFolder = destinationPath.replace(/^\/+|\/+$/g, '');
        const destBaseName = resourceType === 'image'
          ? path.basename(filename, path.extname(filename))
          : filename;
        const destPublicId = `${destFolder}/${destBaseName}`;

        // Build context from source metadata
        const context: { alt?: string; caption?: string } = {};
        if (fileRow.alt_text) context.alt = fileRow.alt_text;
        if (fileRow.title_text) context.caption = fileRow.title_text;

        const copyResult = await cloudinary.copyResource(
          fileRow.url,
          destPublicId,
          resourceType,
          Object.keys(context).length > 0 ? context : undefined
        );
        newCloudinaryPublicId = copyResult.publicId;
        newUrl = copyResult.url;

        console.info(
          `[MediaDirectoryService] Cloudinary copy: "${fileRow.cloudinary_public_id}" → "${copyResult.publicId}"`
        );
      } catch (err) {
        console.error(
          '[MediaDirectoryService] Cloudinary copy failed (local copy succeeded):',
          err instanceof Error ? err.message : err
        );
      }
    }

    // Create a new DB record for the copy
    let newMediaFileId: number | undefined;
    try {
      const insertResult = await this.db.query(
        `INSERT INTO media_files (storage_type, path, url, cloudinary_public_id, file_type, file_size, width, height, alt_text, title_text, seo_filename)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileRow.storage_type,
          relPath,
          newUrl,
          newCloudinaryPublicId,
          fileRow.file_type,
          copyStat.size,
          fileRow.width,
          fileRow.height,
          fileRow.alt_text,
          fileRow.title_text,
          fileRow.seo_filename,
        ]
      );
      newMediaFileId = bigIntToNumber(insertResult.insertId ?? 0) || undefined;
    } catch (err) {
      console.error(
        '[MediaDirectoryService] DB record creation for copy failed:',
        err instanceof Error ? err.message : err
      );
    }

    return {
      name: filename,
      path: relPath,
      type: 'file',
      size: copyStat.size,
      mimeType: fileRow.file_type,
      url: newUrl,
      mediaFileId: newMediaFileId,
      altText: fileRow.alt_text ?? undefined,
      titleText: fileRow.title_text ?? undefined,
      modifiedAt: copyStat.mtime.toISOString(),
      createdAt: copyStat.birthtime.toISOString(),
    };
  }

  /**
   * Rename a media file on disk and update the DB record.
   *
   * @param fileId - media_files.id
   * @param newFilename - New filename (with or without extension)
   * @returns DirectoryEntry for the renamed file
   */
  async renameFile(fileId: number, newFilename: string): Promise<DirectoryEntry> {
    if (!isValidName(newFilename)) {
      throw new Error(`Invalid filename: "${newFilename}".`);
    }

    const fileRow = await this.requireFileRow(fileId);
    const srcAbsolute = resolveSafePath(fileRow.path);
    const dir = path.dirname(srcAbsolute);
    const newAbsolute = path.join(dir, newFilename);
    const newRelative = getRelativePath(newAbsolute);

    // Validate the new path stays within sandbox
    resolveSafePath(newRelative);

    // Rename on disk
    await fs.rename(srcAbsolute, newAbsolute);

    // Also rename the thumbnail if it exists
    const oldBaseName = path.basename(fileRow.path, path.extname(fileRow.path));
    const newBaseName = path.basename(newFilename, path.extname(newFilename));
    const srcThumb = path.join(dir, `${oldBaseName}_thumb.webp`);
    const destThumb = path.join(dir, `${newBaseName}_thumb.webp`);
    try {
      await fs.access(srcThumb);
      await fs.rename(srcThumb, destThumb);
    } catch {
      // No thumbnail - fine
    }

    // Sync rename to Cloudinary if file has a Cloudinary copy
    let newCloudinaryPublicId = fileRow.cloudinary_public_id;
    let newUrl = fileRow.url;
    if (fileRow.cloudinary_public_id) {
      try {
        const cloudinary = getCloudinaryDirectoryService();
        // Cloudinary resource types: image, video, raw (audio is stored as 'video')
        let resourceType = (fileRow.file_type ?? 'image').split('/')[0] || 'image';
        if (resourceType === 'audio') resourceType = 'video';

        const oldPublicId = fileRow.cloudinary_public_id;
        // Replace the last segment of the public_id with the new filename (without extension for images)
        const publicIdParts = oldPublicId.split('/');
        publicIdParts[publicIdParts.length - 1] = resourceType === 'image'
          ? newBaseName
          : newFilename;
        const newPublicIdPath = publicIdParts.join('/');

        const renameResult = await cloudinary.renameResource(
          oldPublicId,
          newPublicIdPath,
          resourceType
        );
        newCloudinaryPublicId = renameResult.publicId;
        newUrl = renameResult.url;
      } catch (err) {
        console.error(
          '[MediaDirectoryService] Cloudinary rename sync failed:',
          err instanceof Error ? err.message : err
        );
      }
    }

    // Update DB
    await this.db.query(
      'UPDATE media_files SET path = ?, cloudinary_public_id = ?, url = ? WHERE id = ?',
      [newRelative, newCloudinaryPublicId, newUrl || getPublicUrl(newRelative), fileId]
    );

    return this.buildEntryFromRow({
      ...fileRow,
      path: newRelative,
      cloudinary_public_id: newCloudinaryPublicId,
      url: newUrl || getPublicUrl(newRelative),
    });
  }

  /**
   * Delete a media file from disk and from the database.
   *
   * @param fileId - media_files.id
   * @returns true if deletion succeeded
   */
  async deleteFile(fileId: number): Promise<boolean> {
    const fileRow = await this.requireFileRow(fileId);
    const srcAbsolute = resolveSafePath(fileRow.path);

    // Delete physical file (ignore ENOENT - file may already be gone)
    try {
      await fs.unlink(srcAbsolute);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    // Delete DB record
    await this.db.query('DELETE FROM media_files WHERE id = ?', [fileId]);

    return true;
  }

  // --------------------------------------------------------------------------
  // Metadata & Re-Crop
  // --------------------------------------------------------------------------

  /**
   * Update SEO metadata fields for a media file in the database.
   *
   * @param fileId - media_files.id
   * @param metadata - Fields to update (partial)
   */
  async updateFileMetadata(fileId: number, metadata: UpdateFileMetadataRequest): Promise<{ cloudinarySyncError?: string }> {
    const fileRow = await this.requireFileRow(fileId); // Verify file exists

    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (metadata.altText !== undefined) {
      fields.push('alt_text = ?');
      params.push(metadata.altText ?? null);
    }
    if (metadata.titleText !== undefined) {
      fields.push('title_text = ?');
      params.push(metadata.titleText ?? null);
    }
    if (metadata.seoFilename !== undefined) {
      fields.push('seo_filename = ?');
      params.push(metadata.seoFilename ?? null);
    }

    if (fields.length === 0) return {}; // Nothing to update

    params.push(fileId);
    await this.db.query(
      `UPDATE media_files SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    // Sync context metadata to Cloudinary for any asset with a Cloudinary copy
    // (includes both cloudinary-primary and local-primary mirrored assets)
    if (fileRow.cloudinary_public_id) {
      try {
        const cloudinary = getCloudinaryDirectoryService();
        // Cloudinary resource types: image, video, raw (audio is stored as 'video')
        let resourceType = (fileRow.file_type ?? 'image').split('/')[0] || 'image';
        if (resourceType === 'audio') resourceType = 'video';

        // Cloudinary public_ids for images don't include file extensions.
        let publicId = fileRow.cloudinary_public_id;
        if (resourceType === 'image') {
          publicId = publicId.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
        }

        const contextData = {
          alt: metadata.altText ?? undefined,
          caption: metadata.titleText ?? undefined,
        };

        try {
          // Try direct update with stored public_id first
          await cloudinary.updateContextMetadata(publicId, contextData, resourceType);
          // Also update display_name on Cloudinary with the title text
          if (metadata.titleText) {
            await cloudinary.updateDisplayName(publicId, metadata.titleText, resourceType);
          }
        } catch (directErr) {
          // If 404, the stored public_id is wrong (e.g. mirrored files use UUID-based IDs).
          // Search Cloudinary for the actual resource by filename.
          const is404 = directErr instanceof Error && directErr.message.includes('404');
          if (!is404) throw directErr;

          console.warn(
            `[MediaDirectoryService] public_id "${publicId}" not found (404), searching Cloudinary for actual resource...`
          );

          const filename = path.basename(fileRow.path);
          const folderHint = path.dirname(fileRow.path).replace(/\\/g, '/');
          const actualPublicId = await cloudinary.findResourcePublicId(filename, folderHint);

          if (!actualPublicId) {
            throw new Error(
              `Resource not found on Cloudinary. Tried public_id "${publicId}" (404) and search by filename "${filename}" found nothing.`
            );
          }

          console.info(
            `[MediaDirectoryService] Found actual public_id: "${actualPublicId}" (stored was "${publicId}")`
          );

          // Update with the correct public_id
          await cloudinary.updateContextMetadata(actualPublicId, contextData, resourceType);
          // Also update display_name for the corrected public_id
          if (metadata.titleText) {
            await cloudinary.updateDisplayName(actualPublicId, metadata.titleText, resourceType);
          }

          // Fix the DB record so future updates don't need to search
          await this.db.query(
            'UPDATE media_files SET cloudinary_public_id = ? WHERE id = ?',
            [actualPublicId, fileId]
          );
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown Cloudinary error';
        console.error('[MediaDirectoryService] Cloudinary context sync failed:', errMsg);
        return { cloudinarySyncError: errMsg };
      }
    }

    return {};
  }

  /**
   * Re-crop an image file from a base64 data URL.
   * Overwrites the original file and regenerates the thumbnail.
   * Updates file_size, width, and height in the database.
   *
   * @param fileId - media_files.id
   * @param cropData - Base64 data URL (e.g. "data:image/jpeg;base64,/9j/...")
   * @param options - Optional filename/SEO metadata to update simultaneously
   * @returns DirectoryEntry for the updated file
   */
  async reCropImage(
    fileId: number,
    cropData: string,
    options?: { filename?: string; altText?: string; titleText?: string }
  ): Promise<DirectoryEntry> {
    const fileRow = await this.requireFileRow(fileId);

    if (!isImageMimeType(fileRow.file_type)) {
      throw new Error(`File ${fileId} is not an image (${fileRow.file_type}).`);
    }

    // Validate file path stays in sandbox
    const srcAbsolute = resolveSafePath(fileRow.path);

    // Decode base64 data URL
    const base64Match = cropData.match(/^data:([^;]+);base64,(.+)$/s);
    if (!base64Match || !base64Match[2]) {
      throw new Error('Invalid cropData format. Expected "data:<mimeType>;base64,<data>".');
    }
    const imageBuffer = Buffer.from(base64Match[2], 'base64');

    // Process with sharp - resize/optimize
    const targetAbsolute = options?.filename
      ? path.join(path.dirname(srcAbsolute), options.filename)
      : srcAbsolute;

    // Validate target path
    if (options?.filename) {
      if (!isValidName(options.filename)) {
        throw new Error(`Invalid filename: "${options.filename}".`);
      }
      resolveSafePath(getRelativePath(targetAbsolute));
    }

    const sharpInstance = sharp(imageBuffer);
    const metadata = await sharpInstance.metadata();
    await sharpInstance.toFile(targetAbsolute);

    // Remove old file if changing filename
    if (options?.filename && targetAbsolute !== srcAbsolute) {
      try {
        await fs.unlink(srcAbsolute);
      } catch {
        // Ignore if already gone
      }
    }

    // Regenerate thumbnail (write as _thumb.webp sibling)
    const dir = path.dirname(targetAbsolute);
    const baseName = path.basename(targetAbsolute, path.extname(targetAbsolute));
    const thumbPath = path.join(dir, `${baseName}_thumb.webp`);

    try {
      await sharp(imageBuffer)
        .resize(300, 300, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toFile(thumbPath);
    } catch {
      // Thumbnail generation failure is non-fatal
    }

    // Get updated file size
    const fileStat = await fs.stat(targetAbsolute);

    // Update DB
    const updateFields: string[] = ['file_size = ?'];
    const updateParams: (string | number | null)[] = [fileStat.size];

    if (metadata.width) {
      updateFields.push('width = ?');
      updateParams.push(metadata.width);
    }
    if (metadata.height) {
      updateFields.push('height = ?');
      updateParams.push(metadata.height);
    }
    if (options?.filename && targetAbsolute !== srcAbsolute) {
      const newRelative = getRelativePath(targetAbsolute);
      updateFields.push('path = ?');
      updateParams.push(newRelative);
    }
    if (options?.altText !== undefined) {
      updateFields.push('alt_text = ?');
      updateParams.push(options.altText);
    }
    if (options?.titleText !== undefined) {
      updateFields.push('title_text = ?');
      updateParams.push(options.titleText);
    }

    updateParams.push(fileId);
    await this.db.query(
      `UPDATE media_files SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Fetch refreshed row
    const updatedRow = await this.requireFileRow(fileId);

    return this.buildEntryFromRow(updatedRow);
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  /**
   * Get aggregate statistics for the entire media library.
   * Reads counts and sums directly from the media_files table.
   *
   * @returns DirectoryStatistics
   */
  async getStatistics(): Promise<DirectoryStatistics> {
    // Total file count and size
    const countResult: DbResult<{ total: bigint | number; total_size: bigint | number }> =
      await this.db.query(
        'SELECT COUNT(*) as total, COALESCE(SUM(file_size), 0) as total_size FROM media_files',
        []
      );
    const countRow = countResult.rows[0] ?? { total: 0, total_size: 0 };
    const totalFiles = bigIntToNumber(countRow.total as bigint | number);
    const totalSizeBytes = bigIntToNumber(countRow.total_size as bigint | number);

    // Missing alt text
    const missingResult: DbResult<{ missing: bigint | number }> = await this.db.query(
      "SELECT COUNT(*) as missing FROM media_files WHERE alt_text IS NULL OR alt_text = ''",
      []
    );
    const missingRow = missingResult.rows[0] ?? { missing: 0 };
    const missingAltTextCount = bigIntToNumber(missingRow.missing as bigint | number);

    // Files grouped by file_type
    const byTypeResult: DbResult<{ file_type: string; cnt: bigint | number }> =
      await this.db.query(
        'SELECT file_type, COUNT(*) as cnt FROM media_files GROUP BY file_type',
        []
      );
    const filesByType: Record<string, number> = {};
    for (const row of byTypeResult.rows) {
      filesByType[row.file_type] = bigIntToNumber(row.cnt as bigint | number);
    }

    // Count folders on disk (lightweight: just list media root top-level dirs)
    let totalFolders = 0;
    try {
      const mediaRoot = getMediaRoot();
      const topLevel = await fs.readdir(mediaRoot, { withFileTypes: true });
      totalFolders = topLevel.filter((e) => e.isDirectory() && !e.name.startsWith('.')).length;
    } catch {
      // Non-fatal if media root doesn't exist yet
    }

    const seoHealthPercent =
      totalFiles > 0
        ? Math.round(((totalFiles - missingAltTextCount) / totalFiles) * 100)
        : 100;

    return {
      totalFiles,
      totalFolders,
      totalSizeBytes,
      totalSizeMB: Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100,
      filesByType,
      missingAltTextCount,
      seoHealthPercent,
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  /**
   * Build a DirectoryEntry from a fs.Dirent + parent context.
   * For files, enriches with database metadata from media_files.
   */
  private async buildEntry(
    parentAbsolute: string,
    parentRelative: string,
    dirent: import('fs').Dirent
  ): Promise<DirectoryEntry> {
    const absolutePath = path.join(parentAbsolute, dirent.name);
    const relativePath = parentRelative ? `${parentRelative}/${dirent.name}` : dirent.name;

    try {
      const stat = await fs.stat(absolutePath);

      if (dirent.isDirectory()) {
        // Count visible children (files + folders for badge display)
        let childCount = 0;
        try {
          const children = await fs.readdir(absolutePath);
          childCount = children.filter((c) => !c.startsWith('.') && c !== '.metadata').length;
        } catch {
          childCount = 0;
        }

        return {
          name: dirent.name,
          path: relativePath,
          type: 'folder',
          childCount,
          modifiedAt: stat.mtime.toISOString(),
          createdAt: stat.birthtime.toISOString(),
        };
      }

      // File entry - look up DB metadata
      const dbRow = await this.findFileRowByPath(absolutePath);

      const entry: DirectoryEntry = {
        name: dirent.name,
        path: relativePath,
        type: 'file',
        size: stat.size,
        url: getPublicUrl(relativePath),
        modifiedAt: stat.mtime.toISOString(),
        createdAt: stat.birthtime.toISOString(),
      };

      if (dbRow) {
        entry.mediaFileId = dbRow.id;
        // Use DB file_type only if it's a valid MIME type (contains '/'),
        // otherwise infer from extension to prevent thumbnail display breakage
        entry.mimeType = dbRow.file_type?.includes('/')
          ? dbRow.file_type
          : inferMimeType(dirent.name);
        entry.altText = dbRow.alt_text ?? undefined;
        entry.titleText = dbRow.title_text ?? undefined;
        entry.seoFilename = dbRow.seo_filename ?? undefined;
      } else {
        // No DB row - auto-register so batch operations (checkboxes, SEO, move/copy) work.
        // Without a mediaFileId, the file is invisible to the selection system.
        entry.mimeType = inferMimeType(dirent.name);
        try {
          const fileType = entry.mimeType ?? 'application/octet-stream';
          const isImage = fileType.startsWith('image/');
          // Use PolicyRouter to determine storage type from path prefix
          const entityType = relativePath.split('/')[0] ?? '';
          const storageType = getPolicyRouter().routeProvider(entityType);
          let cloudinaryPublicId: string | null = null;
          if (storageType === 'cloudinary') {
            cloudinaryPublicId = isImage
              ? relativePath.replace(/\.[^.]+$/, '')
              : relativePath;
          }
          const insertResult = await this.db.query(
            `INSERT INTO media_files (storage_type, path, url, cloudinary_public_id, file_type, file_size)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [storageType, relativePath, getPublicUrl(relativePath), cloudinaryPublicId, fileType, stat.size]
          );
          const newId = bigIntToNumber(insertResult.insertId ?? 0);
          if (newId > 0) {
            entry.mediaFileId = newId;
          }
        } catch {
          // Non-fatal: file displays without mediaFileId, checkbox won't work
        }
      }

      return entry;
    } catch {
      // If stat fails return a minimal entry
      return {
        name: dirent.name,
        path: relativePath,
        type: dirent.isDirectory() ? 'folder' : 'file',
        modifiedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Build a DirectoryEntry directly from a MediaFileRow (DB-first).
   */
  private buildEntryFromRow(row: MediaFileRow): DirectoryEntry {
    return {
      name: path.basename(row.path),
      path: row.path,
      type: 'file',
      size: row.file_size,
      mimeType: row.file_type,
      url: row.url || getPublicUrl(row.path),
      mediaFileId: row.id,
      altText: row.alt_text ?? undefined,
      titleText: row.title_text ?? undefined,
      seoFilename: row.seo_filename ?? undefined,
      modifiedAt: row.updated_at || row.created_at,
      createdAt: row.created_at,
    };
  }

  /**
   * Fetch a MediaFileRow by ID, throwing BizError.notFound if missing.
   */
  private async requireFileRow(fileId: number): Promise<MediaFileRow> {
    const result: DbResult<MediaFileRow> = await this.db.query(
      'SELECT * FROM media_files WHERE id = ?',
      [fileId]
    );
    const row = result.rows[0];
    if (!row) {
      throw BizError.notFound('Media file', fileId);
    }
    return row;
  }

  /**
   * Find a MediaFileRow by its absolute path on disk.
   * Returns null if no matching DB record exists.
   */
  private async findFileRowByPath(absolutePath: string): Promise<MediaFileRow | null> {
    try {
      // DB column is 'path' (stores relative or URL), try matching by relative path
      const relativePath = getRelativePath(absolutePath);
      const result: DbResult<MediaFileRow> = await this.db.query(
        'SELECT * FROM media_files WHERE path = ? OR path LIKE ? LIMIT 1',
        [absolutePath, `%${relativePath}`]
      );
      return result.rows[0] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * After a folder is renamed, update all media_files records whose path
   * begins with the old folder path to use the new folder path.
   */
  private async updateFilePathsAfterFolderRename(
    oldAbsolute: string,
    newAbsolute: string
  ): Promise<void> {
    // DB column is 'path', not 'file_path'; use relative paths for matching
    const oldRelative = getRelativePath(oldAbsolute);
    const newRelative = getRelativePath(newAbsolute);
    const oldPrefix = `${oldRelative}/`;
    const newPrefix = `${newRelative}/`;

    // Fetch all rows under old folder (include cloudinary_public_id for sync)
    const result: DbResult<{ id: number; path: string; cloudinary_public_id: string | null; file_type: string | null }> = await this.db.query(
      'SELECT id, path, cloudinary_public_id, file_type FROM media_files WHERE path LIKE ?',
      [`%${oldPrefix}%`]
    );

    const cloudinary = getCloudinaryDirectoryService();

    // Update each record with the new path prefix + sync Cloudinary
    for (const row of result.rows) {
      const idx = row.path.indexOf(oldPrefix);
      if (idx === -1) continue;
      const newPath = row.path.slice(0, idx) + newPrefix + row.path.slice(idx + oldPrefix.length);

      // Sync Cloudinary rename if file has a Cloudinary copy
      let newCloudinaryPublicId = row.cloudinary_public_id;
      let newUrl: string | null = null;
      if (row.cloudinary_public_id) {
        try {
          const resourceType = (row.file_type ?? 'image').split('/')[0] || 'image';
          const oldPublicId = row.cloudinary_public_id;
          // Replace old folder prefix in the public_id with new prefix
          const publicIdIdx = oldPublicId.indexOf(oldPrefix);
          const newPublicId = publicIdIdx !== -1
            ? oldPublicId.slice(0, publicIdIdx) + newPrefix + oldPublicId.slice(publicIdIdx + oldPrefix.length)
            : oldPublicId; // Fallback: don't rename if prefix not found

          if (newPublicId !== oldPublicId) {
            const renameResult = await cloudinary.renameResource(oldPublicId, newPublicId, resourceType);
            newCloudinaryPublicId = renameResult.publicId;
            newUrl = renameResult.url;
          }
        } catch (err) {
          console.error(
            `[MediaDirectoryService] Cloudinary folder rename sync failed for file ${row.id}:`,
            err instanceof Error ? err.message : err
          );
        }
      }

      const updateFields = ['path = ?'];
      const updateParams: (string | number | null)[] = [newPath];
      if (newCloudinaryPublicId !== row.cloudinary_public_id) {
        updateFields.push('cloudinary_public_id = ?');
        updateParams.push(newCloudinaryPublicId);
      }
      if (newUrl) {
        updateFields.push('url = ?');
        updateParams.push(newUrl);
      }
      updateParams.push(row.id);

      await this.db.query(
        `UPDATE media_files SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );
    }
  }

  /**
   * Ensure a directory exists, creating it recursively if needed.
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Infer MIME type from a file's extension.
 * Used when no database row exists (media_files table is empty).
 */
function inferMimeType(filename: string): string | undefined {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
  };
  return mimeMap[ext];
}

// ============================================================================
// Singleton
// ============================================================================

let instance: MediaDirectoryService | null = null;

/**
 * Get the singleton MediaDirectoryService instance.
 */
export function getMediaDirectoryService(): MediaDirectoryService {
  if (!instance) {
    instance = new MediaDirectoryService();
  }
  return instance;
}

export default MediaDirectoryService;
