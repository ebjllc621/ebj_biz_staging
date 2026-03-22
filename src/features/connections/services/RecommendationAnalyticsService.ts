/**
 * RecommendationAnalyticsService - Recommendation Metrics & Analytics
 *
 * Provides comprehensive analytics for the recommendation system including:
 * - Event tracking (impressions, interactions, conversions)
 * - A/B test variant management
 * - Funnel metrics calculation
 * - Performance reporting
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - BigInt handling: ALL COUNT(*) queries use bigIntToNumber()
 *
 * @authority CLAUDE.md - Primary governance
 * @tier ADVANCED - Cross-system analytics integration
 * @phase Phase 8F
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { bigIntToNumber } from '@core/utils/bigint';
import {
  RecommendationAnalyticsEvent,
  RecommendationRelevanceFeedback,
  RecommendationAlgorithmVariant,
  RecommendationFunnelMetrics,
  AlgorithmPerformanceSummary,
  RealtimeRecommendationMetrics,
  RecommendationWeights
} from '../types';

/**
 * Analytics error for recommendation tracking failures
 */
export class RecommendationAnalyticsError extends BizError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      code: 'RECOMMENDATION_ANALYTICS_ERROR',
      message,
      context,
      userMessage: 'Analytics tracking failed'
    });
  }
}

export class RecommendationAnalyticsService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // EVENT TRACKING
  // ==========================================================================

  /**
   * Track a recommendation analytics event
   *
   * @param event - Event data to track
   * @returns Event ID
   *
   * @phase Phase 8F
   */
  async trackEvent(event: Omit<RecommendationAnalyticsEvent, 'timestamp'>): Promise<number> {
    try {
      const result: DbResult<any> = await this.db.query(
        `INSERT INTO recommendation_analytics_events (
          event_type, user_id, recommended_user_id, score, position,
          source, variant_id, session_id, dwell_time_ms, reasons, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.eventType,
          event.userId,
          event.recommendedUserId,
          event.score,
          event.position,
          event.source,
          event.variantId,
          event.sessionId,
          event.dwellTimeMs ?? null,
          event.reasons ? JSON.stringify(event.reasons) : null,
          event.metadata ? JSON.stringify(event.metadata) : null
        ]
      );

      return result.insertId || 0;
    } catch (error) {
      throw new RecommendationAnalyticsError(
        'Failed to track recommendation event',
        { event, originalError: error }
      );
    }
  }

  /**
   * Track multiple events in batch (for offline sync)
   *
   * @param events - Array of events to track
   * @returns Number of events tracked
   *
   * @phase Phase 8F
   */
  async trackEventsBatch(
    events: Array<Omit<RecommendationAnalyticsEvent, 'timestamp'>>
  ): Promise<number> {
    if (events.length === 0) return 0;

    try {
      const values = events.map(event => [
        event.eventType,
        event.userId,
        event.recommendedUserId,
        event.score,
        event.position,
        event.source,
        event.variantId,
        event.sessionId,
        event.dwellTimeMs ?? null,
        event.reasons ? JSON.stringify(event.reasons) : null,
        event.metadata ? JSON.stringify(event.metadata) : null
      ]);

      const placeholders = events.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatValues = values.flat();

      await this.db.query(
        `INSERT INTO recommendation_analytics_events (
          event_type, user_id, recommended_user_id, score, position,
          source, variant_id, session_id, dwell_time_ms, reasons, metadata
        ) VALUES ${placeholders}`,
        flatValues
      );

      return events.length;
    } catch (error) {
      throw new RecommendationAnalyticsError(
        'Failed to batch track recommendation events',
        { eventCount: events.length, originalError: error }
      );
    }
  }

  // ==========================================================================
  // RELEVANCE FEEDBACK
  // ==========================================================================

  /**
   * Record user feedback on recommendation relevance
   *
   * @param feedback - Relevance feedback data
   *
   * @phase Phase 8F
   */
  async recordRelevanceFeedback(
    feedback: Omit<RecommendationRelevanceFeedback, 'timestamp'>
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO recommendation_relevance_feedback (
          user_id, recommended_user_id, action, relevance_rating,
          reasons_helpful, feedback_text, variant_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          action = VALUES(action),
          relevance_rating = VALUES(relevance_rating),
          reasons_helpful = VALUES(reasons_helpful),
          feedback_text = VALUES(feedback_text),
          variant_id = VALUES(variant_id)`,
        [
          feedback.userId,
          feedback.recommendedUserId,
          feedback.action,
          feedback.relevanceRating,
          feedback.reasonsHelpful,
          feedback.feedbackText ?? null,
          feedback.variantId
        ]
      );

      // Also track as analytics event
      await this.trackEvent({
        eventType: 'feedback_submitted',
        userId: feedback.userId,
        recommendedUserId: feedback.recommendedUserId,
        score: 0,
        position: 0,
        source: 'connections_page',
        variantId: feedback.variantId,
        sessionId: '',
        metadata: {
          relevanceRating: feedback.relevanceRating,
          reasonsHelpful: feedback.reasonsHelpful
        }
      });
    } catch (error) {
      throw new RecommendationAnalyticsError(
        'Failed to record relevance feedback',
        { feedback, originalError: error }
      );
    }
  }

  // ==========================================================================
  // A/B TEST VARIANT MANAGEMENT
  // ==========================================================================

  /**
   * Get all algorithm variants
   *
   * @param activeOnly - Only return active variants
   * @returns Array of algorithm variants
   *
   * @phase Phase 8F
   */
  async getAlgorithmVariants(activeOnly: boolean = true): Promise<RecommendationAlgorithmVariant[]> {
    const whereClause = activeOnly ? 'WHERE is_active = TRUE' : '';

    const result: DbResult<any> = await this.db.query(
      `SELECT variant_id, name, description, weight_overrides, is_control, created_at
       FROM recommendation_algorithm_variants
       ${whereClause}
       ORDER BY is_control DESC, name ASC`
    );

    return result.rows.map(row => ({
      variantId: row.variant_id,
      name: row.name,
      description: row.description,
      weightOverrides: row.weight_overrides ? JSON.parse(row.weight_overrides) : {},
      isControl: Boolean(row.is_control),
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Get variant for a user (deterministic assignment)
   *
   * @param userId - User ID
   * @returns Variant ID or 'control'
   *
   * @phase Phase 8F
   */
  async getVariantForUser(userId: number): Promise<string> {
    // Get active variants with rollout percentages
    const result: DbResult<any> = await this.db.query(
      `SELECT variant_id, rollout_percentage
       FROM recommendation_algorithm_variants
       WHERE is_active = TRUE
       ORDER BY rollout_percentage DESC`
    );

    if (result.rows.length === 0) {
      return 'control';
    }

    // Simple deterministic assignment based on user ID
    const hash = this.simpleHash(`recommendation:${userId}`);
    const bucket = hash % 100;

    let cumulativePercentage = 0;
    for (const row of result.rows) {
      cumulativePercentage += row.rollout_percentage;
      if (bucket < cumulativePercentage) {
        return row.variant_id;
      }
    }

    return 'control';
  }

  /**
   * Get weight overrides for a variant
   *
   * @param variantId - Variant ID
   * @returns Partial weight overrides or null
   *
   * @phase Phase 8F
   */
  async getVariantWeightOverrides(variantId: string): Promise<Partial<RecommendationWeights> | null> {
    const result: DbResult<any> = await this.db.query(
      `SELECT weight_overrides FROM recommendation_algorithm_variants WHERE variant_id = ?`,
      [variantId]
    );

    if (!result.rows[0]) return null;

    return result.rows[0].weight_overrides
      ? JSON.parse(result.rows[0].weight_overrides)
      : null;
  }

  /**
   * Create or update an algorithm variant
   *
   * @param variant - Variant data
   *
   * @phase Phase 8F
   */
  async upsertAlgorithmVariant(
    variant: Omit<RecommendationAlgorithmVariant, 'createdAt'> & { rolloutPercentage: number }
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO recommendation_algorithm_variants (
        variant_id, name, description, weight_overrides, is_control, is_active, rollout_percentage
      ) VALUES (?, ?, ?, ?, ?, TRUE, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        weight_overrides = VALUES(weight_overrides),
        rollout_percentage = VALUES(rollout_percentage),
        updated_at = NOW()`,
      [
        variant.variantId,
        variant.name,
        variant.description ?? null,
        variant.weightOverrides ? JSON.stringify(variant.weightOverrides) : null,
        variant.isControl,
        variant.rolloutPercentage
      ]
    );
  }

  // ==========================================================================
  // FUNNEL METRICS
  // ==========================================================================

  /**
   * Calculate conversion funnel metrics
   *
   * @param period - Time period
   * @param variantId - Optional variant filter
   * @returns Funnel metrics
   *
   * @phase Phase 8F
   */
  async getFunnelMetrics(
    period: 'day' | 'week' | 'month',
    variantId?: string
  ): Promise<RecommendationFunnelMetrics> {
    const dateFilter = this.getPeriodDateFilter(period);
    const variantFilter = variantId ? 'AND variant_id = ?' : '';
    const params = variantId ? [variantId] : [];

    // Get stage counts
    const stagesResult: DbResult<any> = await this.db.query(
      `SELECT
        SUM(impressions) as impressions,
        SUM(profile_clicks + connect_clicks + swipe_connects) as interactions,
        SUM(requests_sent) as requests_sent,
        SUM(requests_accepted) as requests_accepted,
        SUM(first_messages) as first_messages
       FROM recommendation_daily_aggregates
       WHERE date >= ? ${variantFilter}`,
      [dateFilter, ...params]
    );

    const stages = stagesResult.rows[0] || {
      impressions: 0,
      interactions: 0,
      requests_sent: 0,
      requests_accepted: 0,
      first_messages: 0
    };

    // Calculate conversion rates
    const impressions = bigIntToNumber(stages.impressions) || 0;
    const interactions = bigIntToNumber(stages.interactions) || 0;
    const requestsSent = bigIntToNumber(stages.requests_sent) || 0;
    const requestsAccepted = bigIntToNumber(stages.requests_accepted) || 0;
    const firstMessages = bigIntToNumber(stages.first_messages) || 0;

    return {
      period,
      startDate: new Date(dateFilter),
      endDate: new Date(),
      variantId: variantId ?? null,
      stages: {
        impressions,
        interactions,
        requestsSent,
        requestsAccepted,
        firstMessages
      },
      conversionRates: {
        impressionToInteraction: impressions > 0 ? (interactions / impressions) * 100 : 0,
        interactionToRequest: interactions > 0 ? (requestsSent / interactions) * 100 : 0,
        requestToAccepted: requestsSent > 0 ? (requestsAccepted / requestsSent) * 100 : 0,
        acceptedToMessage: requestsAccepted > 0 ? (firstMessages / requestsAccepted) * 100 : 0,
        overallConversion: impressions > 0 ? (firstMessages / impressions) * 100 : 0
      }
    };
  }

  // ==========================================================================
  // PERFORMANCE REPORTING
  // ==========================================================================

  /**
   * Get algorithm performance summary
   *
   * @param variantId - Variant ID
   * @param period - Time period
   * @returns Performance summary
   *
   * @phase Phase 8F
   */
  async getAlgorithmPerformance(
    variantId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<AlgorithmPerformanceSummary> {
    const dateFilter = this.getPeriodDateFilter(period);

    // Get variant info
    const variantResult: DbResult<any> = await this.db.query(
      `SELECT name FROM recommendation_algorithm_variants WHERE variant_id = ?`,
      [variantId]
    );
    const variantName = variantResult.rows[0]?.name || variantId;

    // Get aggregated metrics
    const metricsResult: DbResult<any> = await this.db.query(
      `SELECT
        SUM(impressions) as total_recs,
        SUM(unique_users) as unique_users,
        AVG(avg_score) as avg_score,
        SUM(connect_clicks + swipe_connects) as connect_actions,
        SUM(requests_accepted) as acceptances,
        SUM(feedback_count) as feedback_count,
        SUM(relevance_rating_sum) as rating_sum,
        SUM(reasons_helpful_count) as helpful_count,
        SUM(reasons_not_helpful_count) as not_helpful_count
       FROM recommendation_daily_aggregates
       WHERE date >= ? AND (variant_id = ? OR variant_id IS NULL)`,
      [dateFilter, variantId]
    );

    const metrics = metricsResult.rows[0] || {};
    const totalRecs = bigIntToNumber(metrics.total_recs) || 0;
    const connectActions = bigIntToNumber(metrics.connect_actions) || 0;
    const acceptances = bigIntToNumber(metrics.acceptances) || 0;
    const feedbackCount = bigIntToNumber(metrics.feedback_count) || 0;
    const ratingSum = parseFloat(metrics.rating_sum) || 0;
    const helpfulCount = bigIntToNumber(metrics.helpful_count) || 0;
    const notHelpfulCount = bigIntToNumber(metrics.not_helpful_count) || 0;

    return {
      variantId,
      variantName,
      period,
      metrics: {
        totalRecommendations: totalRecs,
        uniqueUsersServed: bigIntToNumber(metrics.unique_users) || 0,
        avgScore: parseFloat(metrics.avg_score) || 0,
        avgReasonsCount: 0, // Would need separate tracking
        connectionRequestRate: totalRecs > 0 ? (connectActions / totalRecs) * 100 : 0,
        acceptanceRate: connectActions > 0 ? (acceptances / connectActions) * 100 : 0,
        avgRelevanceRating: feedbackCount > 0 ? ratingSum / feedbackCount : null,
        reasonsHelpfulRate: (helpfulCount + notHelpfulCount) > 0
          ? (helpfulCount / (helpfulCount + notHelpfulCount)) * 100
          : null
      },
      topPerformingFactors: [], // Would need detailed factor tracking
      bottomPerformingFactors: []
    };
  }

  /**
   * Get real-time recommendation metrics
   *
   * @returns Real-time metrics
   *
   * @phase Phase 8F
   */
  async getRealtimeMetrics(): Promise<RealtimeRecommendationMetrics> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Last hour metrics
    const hourResult: DbResult<any> = await this.db.query(
      `SELECT
        SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions,
        SUM(CASE WHEN event_type IN ('click_connect', 'swipe_connect', 'click_profile') THEN 1 ELSE 0 END) as interactions,
        SUM(CASE WHEN event_type IN ('click_connect', 'swipe_connect') THEN 1 ELSE 0 END) as requests
       FROM recommendation_analytics_events
       WHERE created_at >= ?`,
      [oneHourAgo]
    );

    // Today metrics
    const todayResult: DbResult<any> = await this.db.query(
      `SELECT
        SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions,
        SUM(CASE WHEN event_type IN ('click_connect', 'swipe_connect', 'click_profile') THEN 1 ELSE 0 END) as interactions,
        SUM(CASE WHEN event_type IN ('click_connect', 'swipe_connect') THEN 1 ELSE 0 END) as requests,
        SUM(CASE WHEN event_type = 'connection_accepted' THEN 1 ELSE 0 END) as acceptances
       FROM recommendation_analytics_events
       WHERE created_at >= ?`,
      [todayStart]
    );

    // Active variants
    const variantsResult: DbResult<any> = await this.db.query(
      `SELECT v.variant_id, v.name, v.rollout_percentage,
        (SELECT COUNT(*) FROM recommendation_analytics_events e
         WHERE e.variant_id = v.variant_id AND e.event_type = 'impression'
         AND e.created_at >= ?) as impressions
       FROM recommendation_algorithm_variants v
       WHERE v.is_active = TRUE`,
      [todayStart]
    );

    // Top recommended users today
    const topUsersResult: DbResult<any> = await this.db.query(
      `SELECT
        e.recommended_user_id as user_id,
        u.display_name,
        COUNT(*) as impressions,
        SUM(CASE WHEN e.event_type IN ('click_connect', 'swipe_connect') THEN 1 ELSE 0 END) / COUNT(*) * 100 as interaction_rate
       FROM recommendation_analytics_events e
       JOIN users u ON e.recommended_user_id = u.id
       WHERE e.created_at >= ? AND e.event_type = 'impression'
       GROUP BY e.recommended_user_id, u.display_name
       ORDER BY impressions DESC
       LIMIT 5`,
      [todayStart]
    );

    const hour = hourResult.rows[0] || {};
    const today = todayResult.rows[0] || {};

    return {
      lastHour: {
        impressions: bigIntToNumber(hour.impressions) || 0,
        interactions: bigIntToNumber(hour.interactions) || 0,
        requests: bigIntToNumber(hour.requests) || 0
      },
      today: {
        impressions: bigIntToNumber(today.impressions) || 0,
        interactions: bigIntToNumber(today.interactions) || 0,
        requests: bigIntToNumber(today.requests) || 0,
        acceptances: bigIntToNumber(today.acceptances) || 0
      },
      activeVariants: variantsResult.rows.map(row => ({
        variantId: row.variant_id,
        name: row.name,
        rolloutPercentage: row.rollout_percentage,
        impressions: bigIntToNumber(row.impressions) || 0
      })),
      topRecommendedUsers: topUsersResult.rows.map(row => ({
        userId: row.user_id,
        displayName: row.display_name,
        impressions: bigIntToNumber(row.impressions) || 0,
        interactionRate: parseFloat(row.interaction_rate) || 0
      }))
    };
  }

  // ==========================================================================
  // AGGREGATION
  // ==========================================================================

  /**
   * Run daily aggregation for a specific date
   *
   * @param date - Date to aggregate
   *
   * @phase Phase 8F
   */
  async runDailyAggregation(date: Date): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];
    await this.db.query('CALL aggregate_recommendation_analytics(?)', [dateStr]);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getPeriodDateFilter(period: 'day' | 'week' | 'month'): string {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '';
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '';
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '';
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
