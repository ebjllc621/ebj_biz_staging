/**
 * Platform Metrics Sync Cron Job Route
 * POST /api/cron/platform-sync — Automated platform metrics sync
 *
 * GOVERNANCE COMPLIANCE:
 * - Auth: CRON_SECRET Bearer token (matching digest route pattern)
 * - Calls PlatformSyncService.syncAllProfiles() — all active connections
 * - Batches to max 10 concurrent (rate limit compliance)
 * - Returns sync summary
 *
 * Schedule: Every 6 hours
 *
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9B_INTERNET_PERSONALITY_PLATFORM_SYNC.md
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9B-3
 * @reference src/app/api/notifications/email/digest/route.ts — cron auth pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlatformSyncService } from '@core/services/PlatformSyncService';
import { ErrorService } from '@core/services/ErrorService';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST — Sync all active platform connections
 *
 * Called by external cron job or Vercel Cron
 * Header: Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startedAt = Date.now();

  try {
    const syncService = getPlatformSyncService();
    const result = await syncService.syncAllProfiles();
    const durationMs = Date.now() - startedAt;

    console.log(`[platform-sync cron] Completed in ${durationMs}ms:`, result);

    return NextResponse.json({
      success: true,
      data: {
        total: result.total,
        synced: result.synced,
        failed: result.failed,
        errors: result.errors,
        duration_ms: durationMs,
      },
    });
  } catch (error) {
    ErrorService.capture('Platform sync cron error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
