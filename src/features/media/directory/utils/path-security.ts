/**
 * Media Directory Path Security Utilities
 *
 * Prevents directory traversal attacks and validates user-supplied paths.
 * ALL file system operations MUST pass paths through resolveSafePath() first.
 *
 * @module src/features/media/directory/utils/path-security.ts
 * @authority Build Map v2.1 ENHANCED - OSI Layer 4 Security
 * @phase Phase 3 - Admin Media Directory Service
 */

import path from 'path';

/**
 * Get the absolute media root directory path.
 * Reads from MEDIA_LOCAL_ROOT env or defaults to var/media/ in project root.
 * ALWAYS resolves to an absolute path so security comparisons work correctly.
 */
export function getMediaRoot(): string {
  const raw = process.env.MEDIA_LOCAL_ROOT;
  if (raw) {
    return path.resolve(raw);
  }
  return path.resolve(process.cwd(), 'var', 'media');
}

/**
 * Get the public base URL for media files.
 */
export function getMediaBaseUrl(): string {
  return process.env.MEDIA_PUBLIC_BASE_URL || 'http://localhost:3000/media';
}

/**
 * Normalize and validate a user-supplied relative path, ensuring it stays within
 * the media root sandbox.
 *
 * SECURITY: Prevents directory traversal attacks by:
 * 1. Stripping leading .. segments
 * 2. Normalizing the path (resolves .., ., double slashes)
 * 3. Joining with the absolute media root
 * 4. Verifying the resolved result starts with the media root
 *
 * @param userPath - User-supplied relative path (may be empty string for root)
 * @returns Absolute, validated path guaranteed within the media root
 * @throws Error with code PATH_TRAVERSAL if the path escapes the sandbox
 */
export function resolveSafePath(userPath: string): string {
  const mediaRoot = getMediaRoot();

  // Empty path means the root itself
  if (!userPath || userPath.trim() === '') {
    return mediaRoot;
  }

  // Strip null bytes (defense-in-depth against path injection)
  const sanitized = userPath.replace(/\0/g, '');

  // Strip leading traversal sequences before normalizing
  const stripped = sanitized.replace(/^(\.\.(\/|\\|$))+/, '');

  // Normalize resolves remaining .., ., and duplicate separators
  const normalized = path.normalize(stripped);

  // Join with media root then resolve to absolute path
  const resolved = path.resolve(mediaRoot, normalized);

  // Final safety check: resolved path must stay within mediaRoot
  if (!resolved.startsWith(mediaRoot + path.sep) && resolved !== mediaRoot) {
    const err = new Error('Path traversal detected: access denied') as NodeJS.ErrnoException;
    err.code = 'PATH_TRAVERSAL';
    throw err;
  }

  return resolved;
}

/**
 * Convert an absolute file system path back to a relative path from the media root.
 * Uses forward slashes regardless of OS.
 *
 * @param absolutePath - Absolute path within the media sandbox
 * @returns Relative path from media root (empty string if at root)
 */
export function getRelativePath(absolutePath: string): string {
  const mediaRoot = getMediaRoot();
  const relative = path.relative(mediaRoot, absolutePath);
  // Always use forward slashes for consistency across platforms
  return relative.replace(/\\/g, '/');
}

/**
 * Build a public URL for a file given its relative path from media root.
 *
 * @param relativePath - Relative path from media root (forward slashes)
 * @returns Full public URL
 */
export function getPublicUrl(relativePath: string): string {
  const baseUrl = getMediaBaseUrl().replace(/\/$/, '');
  const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\//, '');
  return `${baseUrl}/${normalizedPath}`;
}

/**
 * Validate a folder or file name for safety.
 *
 * Rules:
 * - Non-empty, 1-255 characters
 * - Must not be "." or ".."
 * - Must not start with "." (no hidden files/folders)
 * - First character must be alphanumeric
 * - Remaining characters: alphanumeric, dot, underscore, hyphen, space
 *
 * @param name - Name to validate
 * @returns true if the name is safe to use on disk
 */
export function isValidName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 255) return false;
  if (name === '.' || name === '..') return false;
  if (name.startsWith('.')) return false; // No hidden files/folders
  return /^[a-zA-Z0-9][a-zA-Z0-9._\- ]*$/.test(name);
}

/**
 * Sanitize a name for file system use.
 * Replaces unsafe characters with underscores and trims whitespace.
 *
 * @param name - Raw name from user input
 * @returns Sanitized name safe for file system use
 */
export function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '_').trim();
}

/**
 * Check whether a given string looks like an image MIME type.
 * Excludes SVG to avoid security concerns with inline scripts.
 *
 * @param mimeType - MIME type string
 * @returns true if it is a raster image type
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/') && !mimeType.includes('svg');
}
