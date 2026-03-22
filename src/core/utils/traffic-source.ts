/**
 * Traffic Source Utility
 *
 * Pure utility functions for UTM parameter extraction and traffic source recording.
 * Follows the url-shortener.ts pattern: standalone exported functions, no class.
 *
 * Records into engagement_funnel_events table (Phase 1B migration 043).
 * Can also query existing analytics_page_views for referrer-based attribution.
 *
 * @tier SIMPLE
 * @phase Phase 1B - Entity-Agnostic Services & UI Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_1B_BRAIN_PLAN.md
 * @reference src/core/utils/url-shortener.ts - Standalone function pattern
 * @reference src/core/services/InternalAnalyticsService.ts - Fire-and-forget tracking
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// TypeScript Interfaces & Types
// ============================================================================

export interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
}

export interface TrafficSourceBreakdown {
  sources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  total: number;
}

type FunnelEntityType = 'listing' | 'offer' | 'event' | 'job';
type FunnelSource =
  | 'search'
  | 'notification'
  | 'direct'
  | 'social'
  | 'listing'
  | 'homepage'
  | 'category'
  | 'email'
  | 'sms'
  | 'share_link';

interface RecordTrafficSourceParams {
  entityType: FunnelEntityType;
  entityId: number;
  url: string;
  referrer?: string;
  userId?: number;
  sessionId?: string;
  utmParams?: UTMParams;
}

// ============================================================================
// Source Inference Helper
// ============================================================================

/**
 * Infer the traffic source from UTM params or referrer.
 */
function inferSource(utmParams: UTMParams | undefined, referrer?: string): FunnelSource {
  if (utmParams?.utm_source) {
    const src = utmParams.utm_source.toLowerCase();
    if (src.includes('google') || src.includes('bing') || src === 'search') return 'search';
    if (src.includes('facebook') || src.includes('twitter') || src.includes('instagram') ||
        src.includes('linkedin') || src.includes('social')) return 'social';
    if (src === 'email' || src.includes('newsletter')) return 'email';
    if (src === 'sms') return 'sms';
    if (src === 'notification') return 'notification';
    if (src === 'homepage') return 'homepage';
    if (src === 'category') return 'category';
    if (src === 'listing') return 'listing';
    if (src === 'share_link') return 'share_link';
  }

  if (referrer) {
    const ref = referrer.toLowerCase();
    if (ref.includes('google') || ref.includes('bing') || ref.includes('yahoo')) return 'search';
    if (ref.includes('facebook') || ref.includes('twitter') || ref.includes('instagram') ||
        ref.includes('linkedin') || ref.includes('tiktok')) return 'social';
  }

  return 'direct';
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract UTM parameters from a URL.
 * Returns null if no UTM parameters are present.
 *
 * @example
 * extractUTMParams('https://example.com?utm_source=facebook&utm_medium=social')
 * // → { utm_source: 'facebook', utm_medium: 'social', utm_campaign: null, utm_content: null }
 */
export function extractUTMParams(url: URL | string): UTMParams | null {
  try {
    const parsed = typeof url === 'string' ? new URL(url) : url;
    const utm_source = parsed.searchParams.get('utm_source');
    const utm_medium = parsed.searchParams.get('utm_medium');
    const utm_campaign = parsed.searchParams.get('utm_campaign');
    const utm_content = parsed.searchParams.get('utm_content');

    // Return null if no UTM params at all
    if (!utm_source && !utm_medium && !utm_campaign && !utm_content) {
      return null;
    }

    return { utm_source, utm_medium, utm_campaign, utm_content };
  } catch {
    return null;
  }
}

/**
 * Record a page view with traffic source attribution.
 * Inserts into engagement_funnel_events with stage='page_view'.
 * Fire-and-forget — never throws, never fails the calling request.
 */
export async function recordTrafficSource(
  params: RecordTrafficSourceParams
): Promise<void> {
  const { entityType, entityId, referrer, userId, sessionId, utmParams } = params;

  try {
    const db = getDatabaseService();
    const source = inferSource(utmParams, referrer);

    await db.query(
      `INSERT INTO engagement_funnel_events
         (entity_type, entity_id, user_id, session_id, stage, source,
          utm_source, utm_medium, utm_campaign, utm_content)
       VALUES (?, ?, ?, ?, 'page_view', ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        userId ?? null,
        sessionId ?? null,
        source,
        utmParams?.utm_source ?? null,
        utmParams?.utm_medium ?? null,
        utmParams?.utm_campaign ?? null,
        utmParams?.utm_content ?? null,
      ]
    );
  } catch {
    // CIRCUIT BREAKER: Don't fail the original request on tracking errors
  }
}

/**
 * Get traffic source breakdown for an entity.
 * Groups engagement_funnel_events by source for the given entity and optional date range.
 */
export async function getTrafficSourceBreakdown(
  entityType: string,
  entityId: number,
  dateRange?: { start: Date; end: Date }
): Promise<TrafficSourceBreakdown> {
  const db = getDatabaseService();

  const params: Array<string | number | Date> = [entityType, entityId];
  let dateClause = '';

  if (dateRange) {
    dateClause = ' AND created_at >= ? AND created_at <= ?';
    params.push(dateRange.start, dateRange.end);
  }

  const result = await db.query<{ source: string; count: bigint | number }>(
    `SELECT source, COUNT(*) as count
     FROM engagement_funnel_events
     WHERE entity_type = ? AND entity_id = ?${dateClause}
     GROUP BY source
     ORDER BY count DESC`,
    params
  );

  const sourceCounts = result.rows.map((row) => ({
    source: row.source,
    count: bigIntToNumber(row.count),
  }));

  const total = sourceCounts.reduce((sum, r) => sum + r.count, 0);

  const sources = sourceCounts.map((r) => ({
    source: r.source,
    count: r.count,
    percentage: total > 0 ? Math.round((r.count / total) * 100 * 10) / 10 : 0,
  }));

  return { sources, total };
}
