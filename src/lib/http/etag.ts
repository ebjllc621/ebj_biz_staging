/**
 * ETag utilities for HTTP conditional requests
 * Supports weak ETag generation and If-None-Match validation
 */

import { createHash } from 'node:crypto';

/**
 * Generate a weak ETag for the given data using SHA-1 hash
 * @param data The data to generate ETag for (will be JSON stringified if not already a string)
 * @returns Weak ETag string in format W/"sha1-{hash}"
 */
export function weakETag(data: unknown): string {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = createHash('sha1').update(json).digest('base64url');
  return `W/"sha1-${hash}"`;
}

/**
 * Check if the provided ETag matches any of the ETags in the If-None-Match header
 * @param etag The ETag to check
 * @param ifNoneMatchHeader The If-None-Match header value (comma-separated list)
 * @returns true if the ETag matches any in the If-None-Match header
 */
export function matchesIfNoneMatch(etag: string, ifNoneMatchHeader: string | null): boolean {
  if (!ifNoneMatchHeader) return false;
  return ifNoneMatchHeader.split(',').map(s => s.trim()).includes(etag);
}