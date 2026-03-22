/**
 * Social Media OAuth Callback Route
 * GET /api/social/callback/[platform]?code=...&state=...
 *
 * @authority TIER_5A_SOCIAL_MEDIA_MANAGER_MASTER_INDEX.md
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 2
 * @reference src/app/api/auth/callback/[platform]/route.ts — Canon callback pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getSocialMediaService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';
import type { SocialPlatform } from '@core/types/social-media';

const VALID_PLATFORMS: SocialPlatform[] = ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'pinterest'];

interface RouteParams {
  params: Promise<{ platform: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { platform: rawPlatform } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const dashboardBase = new URL('/dashboard', url.origin);

  // Handle OAuth provider error
  if (error) {
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('social_error', error);
    return NextResponse.redirect(redirect.toString());
  }

  // Validate platform
  if (!VALID_PLATFORMS.includes(rawPlatform as SocialPlatform)) {
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('social_error', 'invalid_platform');
    return NextResponse.redirect(redirect.toString());
  }

  const platform = rawPlatform as SocialPlatform;

  // Validate required params
  if (!code || !state) {
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('social_error', 'missing_params');
    return NextResponse.redirect(redirect.toString());
  }

  try {
    const socialService = getSocialMediaService();

    // Validate state (anti-CSRF)
    const stateData = socialService.validateAndConsumeState(state);

    // Verify user session
    const user = await getUserFromRequest(request);
    if (!user) {
      const redirect = new URL('/auth/login', url.origin);
      redirect.searchParams.set('redirect', '/dashboard');
      return NextResponse.redirect(redirect.toString());
    }

    // Verify state userId matches session user
    if (stateData.userId !== user.id) {
      const redirect = new URL(dashboardBase.toString());
      redirect.searchParams.set('social_error', 'user_mismatch');
      return NextResponse.redirect(redirect.toString());
    }

    // Exchange code for tokens
    const tokens = await socialService.exchangeCodeForTokens(platform, code);

    // Create or update connection with encrypted tokens
    await socialService.createConnection({
      listing_id: stateData.listingId,
      user_id: user.id,
      platform,
      platform_user_id: tokens.platformUserId,
      platform_username: tokens.platformUsername,
      platform_page_name: tokens.platformPageName,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || undefined,
      token_expires_at: tokens.expiresAt || undefined,
      scopes: tokens.scope ? tokens.scope.split(' ') : undefined,
      connected_at: new Date(),
    });

    // Redirect to dashboard with success
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('social_connected', platform);
    redirect.searchParams.set('listing_id', stateData.listingId.toString());
    return NextResponse.redirect(redirect.toString());
  } catch (err) {
    ErrorService.capture('Social OAuth callback error:', err);
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('social_error', 'callback_failed');
    return NextResponse.redirect(redirect.toString());
  }
}
