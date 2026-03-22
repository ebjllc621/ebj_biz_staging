/**
 * GET /l/[code]
 *
 * Listing vanity URL redirect handler.
 * Resolves short codes to full listing URLs using VanityURLService
 * and redirects with click tracking.
 *
 * @tier SIMPLE
 * @phase Phase 4B - SEO & Discovery (Vanity URLs)
 * @authority Phase 4B Brain Plan
 * @reference src/app/d/[code]/route.ts - Pattern replicated here
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/ServiceRegistry';
import { VanityURLService } from '@core/services/VanityURLService';

/**
 * GET handler - Redirect listing vanity short URL
 *
 * @example
 * GET /l/X7kQ3 -> Redirects to https://bizconekt.com/listings/my-business
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
    const service = new VanityURLService(db);
    const fullUrl = await service.resolveAndTrack(code);

    if (!fullUrl) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.redirect(new URL(fullUrl));
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
