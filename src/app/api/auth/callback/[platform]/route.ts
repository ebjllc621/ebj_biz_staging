/**
 * Platform OAuth Callback Route
 * GET /api/auth/callback/[platform] — Handles OAuth provider callback
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - NO requireAuth (user returns from external OAuth provider — session cookie handles auth)
 * - Validates OAuth state parameter (anti-CSRF)
 * - NEVER stores tokens in cookies or localStorage — DB only
 * - Redirects to dashboard after exchange
 *
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9B_INTERNET_PERSONALITY_PLATFORM_SYNC.md
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9B-2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getPlatformSyncService } from '@core/services/PlatformSyncService';
import { ErrorService } from '@core/services/ErrorService';
import type { SyncPlatform } from '@core/types/platform-sync';

const VALID_PLATFORMS: SyncPlatform[] = ['youtube', 'instagram', 'tiktok'];

interface RouteParams {
  params: Promise<{ platform: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { platform: rawPlatform } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Base dashboard URL for redirects
  const dashboardBase = new URL('/dashboard', url.origin);

  // Handle OAuth provider error (user denied access, etc.)
  if (error) {
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('platform_error', error);
    return NextResponse.redirect(redirect.toString());
  }

  // Validate platform
  if (!VALID_PLATFORMS.includes(rawPlatform as SyncPlatform)) {
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('platform_error', 'invalid_platform');
    return NextResponse.redirect(redirect.toString());
  }

  const platform = rawPlatform as SyncPlatform;

  // Validate required params
  if (!code || !state) {
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('platform_error', 'missing_params');
    return NextResponse.redirect(redirect.toString());
  }

  try {
    const syncService = getPlatformSyncService();

    // Validate state parameter (anti-CSRF) — also extracts userId, profileType, profileId
    const stateData = syncService.validateAndConsumeState(state);

    // Verify user session
    const user = await getUserFromRequest(request);
    if (!user) {
      const redirect = new URL('/auth/login', url.origin);
      redirect.searchParams.set('redirect', '/dashboard');
      return NextResponse.redirect(redirect.toString());
    }

    // Verify the state userId matches the session user
    if (stateData.userId !== user.id) {
      const redirect = new URL(dashboardBase.toString());
      redirect.searchParams.set('platform_error', 'user_mismatch');
      return NextResponse.redirect(redirect.toString());
    }

    // Exchange code for tokens
    const tokens = await syncService.exchangeCodeForTokens(platform, code);

    // Save connection (tokens encrypted in DB)
    await syncService.saveConnection(
      user.id,
      stateData.profileType,
      stateData.profileId,
      platform,
      tokens,
      { platformUserId: '', platformUsername: '' } // Will be populated on first sync
    );

    // Fire initial metrics sync (non-blocking)
    syncService.syncProfile(stateData.profileType, stateData.profileId).catch((err) => {
      ErrorService.capture('Initial platform sync failed:', err);
    });

    // Redirect to dashboard with success
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('platform_connected', platform);
    return NextResponse.redirect(redirect.toString());
  } catch (err) {
    ErrorService.capture('OAuth callback error:', err);
    const redirect = new URL(dashboardBase.toString());
    redirect.searchParams.set('platform_error', 'callback_failed');
    return NextResponse.redirect(redirect.toString());
  }
}
