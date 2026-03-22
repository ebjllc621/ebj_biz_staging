/**
 * DirectoryRouter - Hybrid Storage Directory Routing
 *
 * Routes admin media directory requests to the appropriate service:
 * - LOCAL directories (site/, marketing/): Use MediaDirectoryService (local filesystem)
 * - CLOUDINARY directories (everything else): Use CloudinaryDirectoryService
 *
 * Root listing merges both sources to show a unified view.
 *
 * Storage strategy:
 * - site/       → Local-primary, Cloudinary mirror (resilience against CDN downtime)
 * - marketing/  → Local-primary, Cloudinary mirror (future implementation)
 * - All others  → Cloudinary-primary (listings, users, events, offers, jobs, etc.)
 *
 * @module src/features/media/directory/services/DirectoryRouter.ts
 * @authority Build Map v2.1 ENHANCED - ADVANCED tier
 * @see src/core/services/media/MirrorService.ts - Mirror pattern reference
 * @see src/features/media/directory/services/MediaDirectoryService.ts - Local service
 * @see src/features/media/directory/services/CloudinaryDirectoryService.ts - Cloudinary service
 */

import type {
  DirectoryListing,
  DirectoryStatistics,
} from '../types/directory-types';
import { getMediaDirectoryService } from './MediaDirectoryService';
import { getCloudinaryDirectoryService } from './CloudinaryDirectoryService';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Directories stored locally with Cloudinary mirror backup.
 * These are served from local filesystem for resilience.
 * Add 'marketing' here when that directory is implemented.
 */
const LOCAL_PRIMARY_DIRECTORIES = ['site', 'marketing'];

// ============================================================================
// Routing Logic
// ============================================================================

/**
 * Determine if a path should be served from local filesystem.
 *
 * @param relativePath - Relative path from media root
 * @returns true if path is local-primary
 */
export function isLocalPath(relativePath: string): boolean {
  if (!relativePath) return false;
  const topFolder = (relativePath.split('/')[0] ?? '').toLowerCase();
  return LOCAL_PRIMARY_DIRECTORIES.includes(topFolder);
}

/**
 * List a directory using the appropriate storage backend.
 *
 * For root (empty path): merges local directories with Cloudinary directories.
 * For local-primary paths (site/, marketing/): uses local filesystem.
 * For everything else: uses Cloudinary Admin API.
 *
 * @param relativePath - Relative path (empty = root)
 * @returns DirectoryListing from the appropriate source
 */
export async function listDirectory(relativePath: string): Promise<DirectoryListing> {
  const normalizedPath = relativePath.replace(/^\/+|\/+$/g, '');

  // Root listing: merge local + Cloudinary
  if (!normalizedPath) {
    return listRootDirectory();
  }

  // Local-primary directories
  if (isLocalPath(normalizedPath)) {
    const localService = getMediaDirectoryService();
    return localService.listDirectory(normalizedPath);
  }

  // Everything else: Cloudinary
  const cloudinaryService = getCloudinaryDirectoryService();
  return cloudinaryService.listDirectory(normalizedPath);
}

/**
 * List root directory by merging local-primary folders with Cloudinary folders.
 * Local-primary folders take precedence (their entries come from local filesystem).
 * All other folders come from Cloudinary.
 */
async function listRootDirectory(): Promise<DirectoryListing> {
  const localService = getMediaDirectoryService();
  const cloudinaryService = getCloudinaryDirectoryService();

  // Fetch both in parallel
  const [localResult, cloudinaryResult] = await Promise.allSettled([
    localService.listDirectory(''),
    cloudinaryService.listDirectory(''),
  ]);

  const localListing =
    localResult.status === 'fulfilled' ? localResult.value : null;
  const cloudinaryListing =
    cloudinaryResult.status === 'fulfilled' ? cloudinaryResult.value : null;

  // Diagnostic: surface Cloudinary failures that would otherwise be silently swallowed
  if (cloudinaryResult.status === 'rejected') {
    console.error('[DirectoryRouter] Cloudinary root listing FAILED:', cloudinaryResult.reason);
  } else if (cloudinaryListing && cloudinaryListing.entries.length === 0) {
    console.warn('[DirectoryRouter] Cloudinary root listing returned 0 entries (may indicate API auth issue)');
  }

  // Start with local-primary directory entries
  const localPrimaryEntries = (localListing?.entries ?? []).filter((entry) =>
    entry.type === 'folder' && LOCAL_PRIMARY_DIRECTORIES.includes(entry.name.toLowerCase())
  );

  // Get Cloudinary entries, excluding any that overlap with local-primary names
  const localPrimaryNames = new Set(
    LOCAL_PRIMARY_DIRECTORIES.map((d) => d.toLowerCase())
  );
  const cloudinaryEntries = (cloudinaryListing?.entries ?? []).filter(
    (entry) => !localPrimaryNames.has(entry.name.toLowerCase())
  );

  const entries = [...localPrimaryEntries, ...cloudinaryEntries];
  const folderEntries = entries.filter((e) => e.type === 'folder');
  const fileEntries = entries.filter((e) => e.type === 'file');
  const totalSize = fileEntries.reduce((sum, e) => sum + (e.size ?? 0), 0);

  return {
    path: '',
    parentPath: null,
    entries,
    totalFiles: fileEntries.length,
    totalFolders: folderEntries.length,
    totalSize,
  };
}

/**
 * Get combined statistics from both local and Cloudinary sources.
 */
export async function getStatistics(): Promise<DirectoryStatistics> {
  const localService = getMediaDirectoryService();
  const cloudinaryService = getCloudinaryDirectoryService();

  const [localStats, cloudinaryStats] = await Promise.allSettled([
    localService.getStatistics(),
    cloudinaryService.getStatistics(),
  ]);

  const local =
    localStats.status === 'fulfilled' ? localStats.value : null;
  const cloudinary =
    cloudinaryStats.status === 'fulfilled' ? cloudinaryStats.value : null;

  // Merge filesByType by summing values for each key
  const localTypes = local?.filesByType ?? {};
  const cloudTypes = cloudinary?.filesByType ?? {};
  const allTypeKeys = new Set([...Object.keys(localTypes), ...Object.keys(cloudTypes)]);
  const mergedFilesByType: Record<string, number> = {};
  for (const key of allTypeKeys) {
    mergedFilesByType[key] = (localTypes[key] ?? 0) + (cloudTypes[key] ?? 0);
  }

  const totalFiles = (local?.totalFiles ?? 0) + (cloudinary?.totalFiles ?? 0);
  const totalMissingAlt = (local?.missingAltTextCount ?? 0) + (cloudinary?.missingAltTextCount ?? 0);
  const seoHealthPercent = totalFiles > 0
    ? Math.round(((totalFiles - totalMissingAlt) / totalFiles) * 100)
    : 100;

  return {
    totalFiles,
    totalFolders: (local?.totalFolders ?? 0) + (cloudinary?.totalFolders ?? 0),
    totalSizeBytes: (local?.totalSizeBytes ?? 0) + (cloudinary?.totalSizeBytes ?? 0),
    totalSizeMB: (local?.totalSizeMB ?? 0) + (cloudinary?.totalSizeMB ?? 0),
    filesByType: mergedFilesByType,
    missingAltTextCount: totalMissingAlt,
    seoHealthPercent,
  };
}
