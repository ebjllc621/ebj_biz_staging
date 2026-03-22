/**
 * Shared utility: extract numeric file ID from request URL.
 *
 * Pattern: /api/admin/media/file/{id}[/...]
 *
 * @phase Phase 4A - Admin Media Manager Core (tech-debt cleanup)
 */

import type { ApiContext } from '@core/api/apiHandler';

export function extractFileId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const fileIndex = segments.indexOf('file');
  if (fileIndex === -1 || fileIndex + 1 >= segments.length) return NaN;
  const idSegment = segments[fileIndex + 1];
  if (!idSegment) return NaN;
  return parseInt(idSegment, 10);
}
