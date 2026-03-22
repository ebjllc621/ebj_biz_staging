/**
 * Media Directory Module - Barrel Export
 *
 * Public API for the admin media directory feature.
 *
 * Usage:
 *   import { MediaDirectoryService, getMediaDirectoryService } from '@features/media/directory';
 *   import type { DirectoryListing, DirectoryEntry } from '@features/media/directory';
 *
 * @module src/features/media/directory/index.ts
 * @phase Phase 3 - Admin Media Directory Service
 */

// Service
export { MediaDirectoryService, getMediaDirectoryService } from './services/MediaDirectoryService';
export type { default as MediaDirectoryServiceType } from './services/MediaDirectoryService';

// Types
export type {
  DirectoryEntry,
  DirectoryListing,
  CreateFolderRequest,
  RenameFolderRequest,
  MoveFileRequest,
  UpdateFileMetadataRequest,
  ReCropRequest,
  BatchOperationRequest,
  BatchOperationResult,
  DirectoryStatistics,
} from './types/directory-types';

// Path security utilities (exported for server-side use only)
export {
  getMediaRoot,
  getMediaBaseUrl,
  resolveSafePath,
  getRelativePath,
  getPublicUrl,
  isValidName,
  sanitizeName,
  isImageMimeType,
} from './utils/path-security';
