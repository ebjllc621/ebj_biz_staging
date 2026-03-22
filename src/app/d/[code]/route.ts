/**
 * GET /d/[code]
 *
 * Short URL redirect handler
 * Resolves short codes to full URLs and redirects
 *
 * @tier SIMPLE
 * @phase TD-P3-005 - Shortened Vanity URLs
 * @authority Phase 3 Brain Plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/ServiceRegistry';
import { resolveShortUrl } from '@core/utils/url-shortener';

/**
 * GET handler - Redirect short URL
 *
 * @example
 * GET /d/X7kQ3 -> Redirects to https://bizconekt.com/offers/summer-sale
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length < 4) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const db = getDatabaseService();
    const fullUrl = await resolveShortUrl(db, code);

    if (!fullUrl) {
      // Code not found or expired - redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Redirect to full URL
    return NextResponse.redirect(fullUrl);
  } catch {
    // On error, redirect to home
    return NextResponse.redirect(new URL('/', request.url));
  }
}
