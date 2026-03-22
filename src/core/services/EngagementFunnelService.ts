/**
 * EngagementFunnelService - Configurable Funnel Tracking & Aggregation
 *
 * Tracks stage transitions (Impression → Page View → Engagement → Conversion → Follow)
 * for any entity type. Provides conversion rate calculations and multi-entity comparisons.
 *
 * Uses engagement_funnel_events table (created by migration 043).
 *
 * @tier ADVANCED
 * @phase Phase 1B - Entity-Agnostic Services & UI Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_1B_BRAIN_PLAN.md
 * @reference src/core/services/InternalAnalyticsService.ts - Constructor + fire-and-forget pattern
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';

// ============================================================================
// TypeScript Interfaces & Types
// ============================================================================

export type FunnelEntityType = 'listing' | 'offer' | 'event' | 'job' | 'affiliate_marketer';

export type FunnelStage =
  | 'impression'
  | 'page_view'
  | 'engagement'
  | 'conversion'
  | 'follow';

export type FunnelSource =
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

interface RecordFunnelEventParams {
  entityType: FunnelEntityType;
  entityId: number;
  stage: FunnelStage;
  source?: FunnelSource;
  userId?: number;
  sessionId?: string;
  utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface FunnelStageData {
  stage: FunnelStage;
  count: number;
  conversion_rate: number; // percentage relative to previous stage
}

export interface FunnelData {
  stages: FunnelStageData[];
  overall_conversion_rate: number; // impression → conversion percentage
  total_events: number;
  date_range: { start: string; end: string };
}

export interface FunnelComparison {
  entityId: number;
  stages: FunnelStageData[];
  overall_conversion_rate: number;
  total_events: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

// Stage ordering for conversion rate calculations
const STAGE_ORDER: FunnelStage[] = [
  'impression',
  'page_view',
  'engagement',
  'conversion',
  'follow',
];

// ============================================================================
// Service Class
// ============================================================================

export class EngagementFunnelService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Record a funnel stage event.
   * Fire-and-forget — never fails the calling request.
   */
  async recordFunnelEvent(params: RecordFunnelEventParams): Promise<void> {
    try {
      const {
        entityType,
        entityId,
        stage,
        source = 'direct',
        userId,
        sessionId,
        utmParams,
        metadata,
      } = params;

      await this.db.query(
        `INSERT INTO engagement_funnel_events
           (entity_type, entity_id, user_id, session_id, stage, source,
            utm_source, utm_medium, utm_campaign, utm_content, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entityType,
          entityId,
          userId ?? null,
          sessionId ?? null,
          stage,
          source,
          utmParams?.utm_source ?? null,
          utmParams?.utm_medium ?? null,
          utmParams?.utm_campaign ?? null,
          utmParams?.utm_content ?? null,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );
    } catch {
      // CIRCUIT BREAKER: Don't fail the original request on tracking errors
    }
  }

  /**
   * Get funnel data for an entity — stage counts with conversion rates.
   */
  async getFunnelData(
    entityType: string,
    entityId: number,
    dateRange?: DateRange
  ): Promise<FunnelData> {
    const params: Array<string | number | Date> = [entityType, entityId];
    let dateClause = '';

    if (dateRange) {
      dateClause = ' AND created_at >= ? AND created_at <= ?';
      params.push(dateRange.start, dateRange.end);
    }

    const result = await this.db.query<{
      stage: FunnelStage;
      count: bigint | number;
    }>(
      `SELECT stage, COUNT(*) as count
       FROM engagement_funnel_events
       WHERE entity_type = ? AND entity_id = ?${dateClause}
       GROUP BY stage`,
      params
    );

    // Build a map of stage → count
    const stageCounts = new Map<FunnelStage, number>();
    for (const row of result.rows) {
      stageCounts.set(row.stage, bigIntToNumber(row.count));
    }

    // Build ordered stages with conversion rates
    const stages: FunnelStageData[] = [];
    let previousCount: number | null = null;

    for (const stage of STAGE_ORDER) {
      const count = stageCounts.get(stage) ?? 0;
      const conversion_rate =
        previousCount !== null && previousCount > 0
          ? Math.round((count / previousCount) * 100 * 10) / 10
          : 0;

      stages.push({ stage, count, conversion_rate });
      if (count > 0) {
        previousCount = count;
      }
    }

    const totalEvents = stages.reduce((sum, s) => sum + s.count, 0);

    // Overall conversion rate: impression → conversion
    const impressionCount = stageCounts.get('impression') ?? 0;
    const conversionCount = stageCounts.get('conversion') ?? 0;
    const overallConversionRate =
      impressionCount > 0
        ? Math.round((conversionCount / impressionCount) * 100 * 10) / 10
        : 0;

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      stages,
      overall_conversion_rate: overallConversionRate,
      total_events: totalEvents,
      date_range: {
        start: (dateRange?.start ?? defaultStart).toISOString(),
        end: (dateRange?.end ?? now).toISOString(),
      },
    };
  }

  /**
   * Get funnel comparison across multiple entities of the same type.
   */
  async compareFunnels(
    entityType: string,
    entityIds: number[],
    dateRange?: DateRange
  ): Promise<FunnelComparison[]> {
    if (entityIds.length === 0) {
      return [];
    }

    const params: Array<string | number | Date> = [entityType, ...entityIds];
    const placeholders = entityIds.map(() => '?').join(', ');
    let dateClause = '';

    if (dateRange) {
      dateClause = ' AND created_at >= ? AND created_at <= ?';
      params.push(dateRange.start, dateRange.end);
    }

    const result = await this.db.query<{
      entity_id: number;
      stage: FunnelStage;
      count: bigint | number;
    }>(
      `SELECT entity_id, stage, COUNT(*) as count
       FROM engagement_funnel_events
       WHERE entity_type = ? AND entity_id IN (${placeholders})${dateClause}
       GROUP BY entity_id, stage`,
      params
    );

    // Group by entityId
    const entityMap = new Map<number, Map<FunnelStage, number>>();
    for (const row of result.rows) {
      if (!entityMap.has(row.entity_id)) {
        entityMap.set(row.entity_id, new Map());
      }
      entityMap.get(row.entity_id)!.set(row.stage, bigIntToNumber(row.count));
    }

    // Build comparison results for each requested entity
    return entityIds.map((entityId) => {
      const stageCounts = entityMap.get(entityId) ?? new Map<FunnelStage, number>();
      const stages: FunnelStageData[] = [];
      let previousCount: number | null = null;

      for (const stage of STAGE_ORDER) {
        const count = stageCounts.get(stage) ?? 0;
        const conversion_rate =
          previousCount !== null && previousCount > 0
            ? Math.round((count / previousCount) * 100 * 10) / 10
            : 0;
        stages.push({ stage, count, conversion_rate });
        if (count > 0) {
          previousCount = count;
        }
      }

      const totalEvents = stages.reduce((sum, s) => sum + s.count, 0);
      const impressionCount = stageCounts.get('impression') ?? 0;
      const conversionCount = stageCounts.get('conversion') ?? 0;
      const overallConversionRate =
        impressionCount > 0
          ? Math.round((conversionCount / impressionCount) * 100 * 10) / 10
          : 0;

      return {
        entityId,
        stages,
        overall_conversion_rate: overallConversionRate,
        total_events: totalEvents,
      };
    });
  }

  /**
   * Read metadata from a funnel event row.
   * Uses safeJsonParse() because mariadb may auto-parse JSON columns.
   */
  parseMetadata(rawMetadata: unknown): Record<string, unknown> {
    return safeJsonParse<Record<string, unknown>>(
      rawMetadata as string | Record<string, unknown> | null,
      {}
    );
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: EngagementFunnelService | null = null;

export function getEngagementFunnelService(): EngagementFunnelService {
  if (!instance) {
    const db = getDatabaseService();
    instance = new EngagementFunnelService(db);
  }
  return instance;
}
