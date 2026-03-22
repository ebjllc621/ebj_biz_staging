/**
 * Universal Media Upload Modal - SEO Filename Utilities
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 2 - Universal Media Upload Modal
 *
 * Generates SEO-optimized filenames from alt text.
 * Output chars: [a-zA-Z0-9._-] only — survives LocalMediaProvider.sanitizeFilename.
 */

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Converts a string to a URL-safe slug using only [a-z0-9-] characters.
 * Strips accents, replaces non-alphanumeric with hyphens, collapses runs.
 */
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')     // non-alphanumeric -> hyphen
    .replace(/^-+|-+$/g, '')         // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-');         // collapse consecutive hyphens
}

// ============================================================================
// EXPORTED UTILITIES
// ============================================================================

/**
 * Extracts the file extension from a filename or MIME type.
 *
 * @param filename - Original filename (e.g. "photo.JPG")
 * @param mimeType - MIME type fallback (e.g. "image/png")
 * @returns Extension without leading dot, lowercased (e.g. "jpg"), or "bin" if unknown.
 */
export function getFileExtension(filename: string, mimeType?: string): string {
  // Try from filename first
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex !== -1 && dotIndex < filename.length - 1) {
    return filename.slice(dotIndex + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Fall back to MIME type
  if (mimeType) {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'application/pdf': 'pdf',
    };
    return mimeMap[mimeType] ?? 'bin';
  }

  return 'bin';
}

/**
 * Generates an SEO-optimized filename from alt text.
 *
 * Format: `{alt-slug}-{context-slug}-{timestamp}.{ext}`
 * - Alt text is slugified (required)
 * - Context name is slugified and appended if provided
 * - Unix timestamp ensures uniqueness
 * - Total length capped at 200 characters (before extension) to survive FS limits
 *
 * @param altText - Required: descriptive alt text for the image
 * @param contextName - Optional: human-readable context (e.g. "listing gallery")
 * @param extension - File extension without dot (e.g. "jpg"). Defaults to "jpg".
 * @returns SEO-safe filename string
 *
 * @example
 * generateSeoFilename("Downtown coffee shop exterior", "listing gallery", "jpg")
 * // => "downtown-coffee-shop-exterior-listing-gallery-1709856000000.jpg"
 */
export function generateSeoFilename(
  altText: string,
  contextName?: string,
  extension: string = 'jpg'
): string {
  const altSlug = slugify(altText.trim()) || 'image';
  const timestamp = Date.now().toString();

  const parts: string[] = [altSlug];

  if (contextName) {
    const contextSlug = slugify(contextName.trim());
    if (contextSlug) {
      parts.push(contextSlug);
    }
  }

  parts.push(timestamp);

  // Join with hyphens, truncate to 200 chars before extension
  let base = parts.join('-');
  if (base.length > 200) {
    // Truncate alt slug to fit, keeping context + timestamp intact
    const suffix = (contextName ? `-${slugify(contextName)}-` : '-') + timestamp;
    const maxAltLength = 200 - suffix.length;
    base = altSlug.slice(0, Math.max(maxAltLength, 8)) + suffix;
  }

  const cleanExt = extension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  return `${base}.${cleanExt}`;
}
