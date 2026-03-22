/**
 * Offer Share Click Tracker - GET redirect + track
 *
 * @tier STANDARD
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 *
 * Purpose: Track click from share link and redirect to offer detail page
 * Anonymous tracking - no auth required
 */

import { NextResponse } from 'next/server';
import { apiHandler } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import crypto from 'crypto';

// ============================================================================
// GET - Track click and redirect
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - /api/offers/[id]/shares/click
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // pathSegments: ['', 'api', 'offers', '[id]', 'shares', 'click']
  const offerIdStr = pathSegments[pathSegments.length - 3] || '';
  const offerId = parseInt(offerIdStr, 10);

  if (isNaN(offerId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid offer ID'),
      400
    );
  }

  // Get query params
  const shareId = url.searchParams.get('sid');
  const referrer = url.searchParams.get('ref');

  if (!shareId) {
    return createErrorResponse(
      BizError.badRequest('Share ID is required'),
      400
    );
  }

  const shareIdInt = parseInt(shareId, 10);
  if (isNaN(shareIdInt)) {
    return createErrorResponse(
      BizError.badRequest('Invalid share ID'),
      400
    );
  }

  // Get OfferService
  const offerService = getOfferService();

  // Verify offer exists and get slug
  const offer = await offerService.getById(offerId);
  if (!offer) {
    return createErrorResponse(
      BizError.notFound('Offer', offerId),
      404
    );
  }

  // Get metadata from request
  const userAgent = request.headers.get('user-agent') || undefined;
  const referrerUrl = referrer || request.headers.get('referer') || undefined;

  // Get IP address for hashing (privacy-preserving)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : undefined;

  // Track click (fire-and-forget pattern)
  offerService.trackShareClick(shareIdInt, {
    referrer_url: referrerUrl,
    user_agent: userAgent,
    ip_hash: ipHash,
    resulted_in_signup: false,
    resulted_in_claim: false
  }).catch((err: Error) => {
    // Log error but don't fail redirect
    console.error('[OfferShareClick] Failed to track click:', err.message);
  });

  // Redirect to offer detail page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
  const redirectUrl = `${baseUrl}/offers/${offer.slug}?utm_source=share&utm_medium=referral&utm_campaign=offer_share&sid=${shareId}`;

  return NextResponse.redirect(redirectUrl, { status: 302 });
});
