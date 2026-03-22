/**
 * Media Directory Type Definitions
 *
 * Types for admin media directory browsing, folder CRUD, and file operations.
 *
 * @module src/features/media/directory/types/directory-types.ts
 * @authority Build Map v2.1 ENHANCED
 * @phase Phase 3 - Admin Media Directory Service
 */

/** Represents a directory entry (file or folder) in the media browser */
export interface DirectoryEntry {
  name: string;
  path: string;           // Relative path from media root (forward slashes)
  type: 'file' | 'folder';
  size?: number;          // bytes (files only)
  mimeType?: string;      // files only
  thumbnailUrl?: string;  // image files only
  url?: string;           // public URL (files only)
  mediaFileId?: number;   // DB id from media_files (files only)
  altText?: string;       // SEO alt text (files only)
  titleText?: string;     // SEO title/tooltip (files only)
  seoFilename?: string;   // SEO-optimized filename (files only)
  childCount?: number;    // folders only - number of direct children
  modifiedAt: string;     // ISO 8601
  createdAt?: string;     // ISO 8601
}

/** Directory listing response */
export interface DirectoryListing {
  path: string;              // Current directory path relative from media root
  parentPath: string | null; // Parent directory path (null for root)
  entries: DirectoryEntry[];
  totalFiles: number;
  totalFolders: number;
  totalSize: number;         // Total size of all files in this directory (bytes)
}

/** Folder creation request */
export interface CreateFolderRequest {
  parentPath: string; // Parent directory relative path (empty string = root)
  name: string;       // New folder name
}

/** Folder rename request */
export interface RenameFolderRequest {
  newName: string;
}

/** File move/copy request */
export interface MoveFileRequest {
  sourceId: number;         // media_files.id
  destinationPath: string;  // Relative destination directory path
  operation: 'move' | 'copy';
}

/** File metadata update request */
export interface UpdateFileMetadataRequest {
  altText?: string;
  titleText?: string;
  seoFilename?: string;
}

/** Re-crop request */
export interface ReCropRequest {
  cropData: string;    // Base64 data URL of the cropped image
  filename?: string;   // Optional new filename
  altText?: string;    // Optional SEO update
  titleText?: string;  // Optional SEO update
}

/** Batch operation request (reserved for Phase 4) */
export interface BatchOperationRequest {
  fileIds: number[];
  operation: 'delete' | 'move' | 'copy';
  destinationPath?: string; // Required for move/copy operations
}

/** Batch operation result */
export interface BatchOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ fileId: number; error: string }>;
}

/** Directory statistics for admin overview */
export interface DirectoryStatistics {
  totalFiles: number;
  totalFolders: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  filesByType: Record<string, number>;
  missingAltTextCount: number;
  seoHealthPercent: number;
}
