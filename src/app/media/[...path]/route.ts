/**
 * Media Streaming Route - Dynamic File Serving
 *
 * Serves media files through the Universal Media Manager.
 * Handles content-type detection, streaming, and caching.
 *
 * Route: /media/[...path]
 * Examples:
 * - /media/listing/123/image.jpg
 * - /media/user/456/profile/avatar.png
 *
 * @authority Universal Media Manager compliance
 * @see .cursor/rules/universal-media-manager.mdc
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediaService } from '@core/services/media';
import path from 'path';
import { promises as fs } from 'fs';

interface MediaRouteParams {
  path: string[];
}

/**
 * Serve media files via GET request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: MediaRouteParams }
): Promise<NextResponse> {
  try {
    const { path: pathSegments } = params;

    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Invalid media path', { status: 400 });
    }

    // Reconstruct file path
    const filePath = pathSegments.join('/');

    // Get media service
    const mediaService = getMediaService();
    const config = mediaService.getProviderConfig() as { type?: string; local?: { rootPath?: string } };

    // For local provider, serve files directly from filesystem
    if (config.type === 'local' && config.local?.rootPath) {
      return await serveLocalFile(filePath, config.local.rootPath, request);
    }

    // For other providers, we would use different logic
    return new NextResponse('Provider not supported for direct serving', { status: 501 });
  } catch (error) {
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * Serve file from local filesystem
 */
async function serveLocalFile(
  filePath: string,
  rootPath: string,
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Sanitize and resolve file path
    const sanitizedPath = filePath.replace(/\.\./g, ''); // Prevent directory traversal
    const fullPath = path.resolve(rootPath, sanitizedPath);

    // Ensure file is within the media root directory (security check)
    const resolvedRoot = path.resolve(rootPath);
    if (!fullPath.startsWith(resolvedRoot)) {
      return new NextResponse('Access denied', { status: 403 });
    }

    // Check if file exists
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return new NextResponse('Not a file', { status: 404 });
      }
    } catch {
      return new NextResponse('File not found', { status: 404 });
    }

    // Get content type
    const contentType = getContentType(fullPath);

    // Check for conditional requests (If-Modified-Since, ETag)
    const stats = await fs.stat(fullPath);
    const lastModified = stats.mtime.toUTCString();
    const etag = `"${stats.size}-${stats.mtime.getTime()}"`;

    // Handle If-Modified-Since
    const ifModifiedSince = request.headers.get('if-modified-since');
    if (ifModifiedSince && ifModifiedSince === lastModified) {
      return new NextResponse(null, { status: 304 });
    }

    // Handle If-None-Match (ETag)
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    // Handle Range requests for partial content
    const range = request.headers.get('range');
    if (range) {
      return await servePartialContent(fullPath, range, contentType, stats.size);
    }

    // Read and serve full file
    const fileBuffer = await fs.readFile(fullPath);

    // Set response headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
      'Last-Modified': lastModified,
      'ETag': etag,
      'Cache-Control': getCacheControl(contentType),
      'Accept-Ranges': 'bytes',
    });

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    return new NextResponse('Failed to serve file', { status: 500 });
  }
}

/**
 * Serve partial content for Range requests
 */
async function servePartialContent(
  filePath: string,
  rangeHeader: string,
  contentType: string,
  fileSize: number
): Promise<NextResponse> {
  try {
    // Parse Range header (e.g., "bytes=0-1023")
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!rangeMatch) {
      return new NextResponse('Invalid range', { status: 416 });
    }

    const start = parseInt(rangeMatch[1] || '0');
    const end = rangeMatch[2] ? parseInt(rangeMatch[2]) : fileSize - 1;

    // Validate range
    if (start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse('Range not satisfiable', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
        },
      });
    }

    // Read partial file
    const { createReadStream } = await import('fs');
    const stream = createReadStream(filePath, { start, end });

    // Convert Node.js stream to response
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const contentLength = end - start + 1;

    // Set partial content headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': contentLength.toString(),
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': getCacheControl(contentType),
    });

    return new NextResponse(buffer, {
      status: 206, // Partial Content
      headers,
    });
  } catch (error) {
    return new NextResponse('Failed to serve partial content', { status: 500 });
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',

    // Documents
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',

    // Videos
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',

    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',

    // Archives
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',

    // Office documents
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Get appropriate cache control header based on content type
 */
function getCacheControl(contentType: string): string {
  // Images and static assets - cache for 1 day
  if (contentType.startsWith('image/') ||
      contentType.startsWith('video/') ||
      contentType.startsWith('audio/')) {
    return 'public, max-age=86400, immutable';
  }

  // Documents - cache for 1 hour
  if (contentType === 'application/pdf' ||
      contentType.startsWith('application/vnd.')) {
    return 'public, max-age=3600';
  }

  // Default - cache for 10 minutes
  return 'public, max-age=600';
}