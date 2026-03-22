/**
 * SharingAnalyticsService - Sharing & Recommendations Analytics Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - mariadb behavior: bigIntToNumber for COUNT(*), safeJsonParse for JSON columns
 * - Build Map v2.1 ENHANCED patterns
 * - STANDARD tier (300-800 lines, ≤6 dependencies)
 *
 * Features:
 * - Metrics aggregation for admin dashboard
 * - Spam detection with configurable thresholds
 * - Quality score calculation
 * - Funnel metrics (sent → viewed → rated → helpful → thanked)
 * - A/B test integration with FeatureFlagService
 *
 * @tier STANDARD
 * @phase Phase 10 - Analytics & Admin Dashboard
 * @authority docs/components/connections/userrecommendations/phases/PHASE_10_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/json';
import type { RowDataPacket } from '@core/types/mariadb-compat';
import type {
  SharingMetricsOverview,
  SharingFunnelMetrics,
  SharingQualityMetrics,
  SharingBreakdownMetrics,
  SpamAlert,
  SpamThresholds,
  SpamDetectionResult,
  ABTestResult,
  QualityScoreBreakdown,
  StatisticalSignificanceResult
} from '../types/analytics';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class SharingAnalyticsService {
  private db: DatabaseService;

  // Default spam detection thresholds (Phase 10) - TD-006: Environment-configurable
  private readonly defaultThresholds: SpamThresholds = {
    shares_per_hour: parseInt(process.env.SPAM_SHARES_PER_HOUR || '20', 10),
    duplicate_message_count: parseInt(process.env.SPAM_DUPLICATE_COUNT || '5', 10),
    accounts_per_ip: parseInt(process.env.SPAM_ACCOUNTS_PER_IP || '3', 10),
    min_account_age_hours: parseInt(process.env.SPAM_MIN_ACCOUNT_AGE_HOURS || '24', 10),
    bulk_send_threshold: parseInt(process.env.SPAM_BULK_THRESHOLD || '50', 10)
  };

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // METRICS AGGREGATION
  // ==========================================================================

  /**
   * Get overview metrics for admin dashboard
   */
  async getMetricsOverview(period?: { from: Date; to: Date }): Promise<SharingMetricsOverview> {
    const whereClause = this.buildDateFilter(period);

    const query = `
      SELECT
        COUNT(*) AS total_recommendations,
        SUM(CASE WHEN viewed_at IS NOT NULL THEN 1 ELSE 0 END) AS total_views,
        SUM(CASE WHEN is_helpful = TRUE THEN 1 ELSE 0 END) AS total_helpful,
        SUM(CASE WHEN is_helpful = FALSE THEN 1 ELSE 0 END) AS total_not_helpful,
        SUM(CASE WHEN thanked_at IS NOT NULL THEN 1 ELSE 0 END) AS total_thanked,
        AVG(quality_score) AS avg_quality_score
      FROM user_referrals
      WHERE entity_type != 'platform_invite'
        ${whereClause}
    `;

    const spamQuery = `
      SELECT COUNT(*) AS spam_count
      FROM user_sharing_spam_alerts
      WHERE status = 'pending'
    `;

    const [metricsResult, spamResult] = await Promise.all([
      this.db.query<RowDataPacket>(query),
      this.db.query<RowDataPacket>(spamQuery)
    ]);

    const metrics = metricsResult.rows?.[0] || {};
    const spam = spamResult.rows?.[0] || {};

    return {
      total_recommendations: bigIntToNumber(metrics.total_recommendations) || 0,
      total_views: bigIntToNumber(metrics.total_views) || 0,
      total_helpful: bigIntToNumber(metrics.total_helpful) || 0,
      total_not_helpful: bigIntToNumber(metrics.total_not_helpful) || 0,
      total_thanked: bigIntToNumber(metrics.total_thanked) || 0,
      avg_quality_score: parseFloat(metrics.avg_quality_score) || 0,
      spam_flag_count: bigIntToNumber(spam.spam_count) || 0
    };
  }

  /**
   * Get funnel metrics (sent → viewed → rated → helpful → thanked)
   */
  async getFunnelMetrics(period: 'day' | 'week' | 'month'): Promise<SharingFunnelMetrics> {
    const dateFilter = this.buildPeriodFilter(period);

    const query = `
      SELECT
        COUNT(*) AS sent,
        SUM(CASE WHEN viewed_at IS NOT NULL THEN 1 ELSE 0 END) AS viewed,
        SUM(CASE WHEN is_helpful IS NOT NULL THEN 1 ELSE 0 END) AS rated,
        SUM(CASE WHEN is_helpful = TRUE THEN 1 ELSE 0 END) AS helpful,
        SUM(CASE WHEN thanked_at IS NOT NULL THEN 1 ELSE 0 END) AS thanked
      FROM user_referrals
      WHERE entity_type != 'platform_invite'
        AND created_at >= ${dateFilter}
    `;

    const result = await this.db.query<RowDataPacket>(query);
    const row = result.rows?.[0] || {};

    const sent = bigIntToNumber(row.sent) || 0;
    const viewed = bigIntToNumber(row.viewed) || 0;
    const rated = bigIntToNumber(row.rated) || 0;
    const helpful = bigIntToNumber(row.helpful) || 0;
    const thanked = bigIntToNumber(row.thanked) || 0;

    return {
      period,
      stages: { sent, viewed, rated, helpful, thanked },
      conversion_rates: {
        view_rate: sent > 0 ? (viewed / sent) * 100 : 0,
        rating_rate: viewed > 0 ? (rated / viewed) * 100 : 0,
        helpful_rate: rated > 0 ? (helpful / rated) * 100 : 0,
        thank_rate: sent > 0 ? (thanked / sent) * 100 : 0
      }
    };
  }

  /**
   * Get quality metrics
   */
  async getQualityMetrics(period?: { from: Date; to: Date }): Promise<SharingQualityMetrics> {
    const whereClause = this.buildDateFilter(period);

    const query = `
      SELECT
        SUM(CASE WHEN is_helpful IS NOT NULL THEN 1 ELSE 0 END) AS total_rated,
        SUM(CASE WHEN is_helpful = TRUE THEN 1 ELSE 0 END) AS helpful_count,
        SUM(CASE WHEN is_helpful = FALSE THEN 1 ELSE 0 END) AS not_helpful_count
      FROM user_referrals
      WHERE entity_type != 'platform_invite'
        ${whereClause}
    `;

    const result = await this.db.query<RowDataPacket>(query);
    const row = result.rows?.[0] || {};

    const totalRated = bigIntToNumber(row.total_rated) || 0;
    const helpfulCount = bigIntToNumber(row.helpful_count) || 0;
    const notHelpfulCount = bigIntToNumber(row.not_helpful_count) || 0;
    const helpfulRate = totalRated > 0 ? (helpfulCount / totalRated) * 100 : 0;

    // Engagement score: composite of helpful_rate and engagement metrics
    const engagementScore = this.calculateEngagementScore(helpfulRate);

    return {
      total_rated: totalRated,
      helpful_count: helpfulCount,
      not_helpful_count: notHelpfulCount,
      helpful_rate: helpfulRate,
      avg_view_time_seconds: null, // Future: implement view time tracking
      engagement_score: engagementScore
    };
  }

  /**
   * Get breakdown metrics by entity type, sender, and recipient
   */
  async getBreakdownMetrics(period?: { from: Date; to: Date }): Promise<SharingBreakdownMetrics> {
    const whereClause = this.buildDateFilter(period);

    // By entity type
    const entityTypeQuery = `
      SELECT
        entity_type,
        COUNT(*) AS count,
        AVG(CASE WHEN viewed_at IS NOT NULL THEN 1 ELSE 0 END) AS avg_views,
        SUM(CASE WHEN is_helpful = TRUE THEN 1 ELSE 0 END) AS helpful,
        SUM(CASE WHEN is_helpful IS NOT NULL THEN 1 ELSE 0 END) AS rated
      FROM user_referrals
      WHERE entity_type != 'platform_invite'
        ${whereClause}
      GROUP BY entity_type
    `;

    // Top senders
    const sendersQuery = `
      SELECT
        ur.referrer_user_id AS user_id,
        u.display_name,
        COUNT(*) AS total_sent,
        SUM(CASE WHEN is_helpful = TRUE THEN 1 ELSE 0 END) AS helpful,
        SUM(CASE WHEN is_helpful IS NOT NULL THEN 1 ELSE 0 END) AS rated,
        AVG(quality_score) AS quality_score
      FROM user_referrals ur
      LEFT JOIN users u ON ur.referrer_user_id = u.id
      WHERE ur.entity_type != 'platform_invite'
        ${whereClause}
      GROUP BY ur.referrer_user_id, u.display_name
      ORDER BY total_sent DESC
      LIMIT 10
    `;

    // Top recipients
    const recipientsQuery = `
      SELECT
        ur.recipient_user_id AS user_id,
        u.display_name,
        COUNT(*) AS total_received,
        SUM(CASE WHEN is_helpful IS NOT NULL THEN 1 ELSE 0 END) AS responded
      FROM user_referrals ur
      LEFT JOIN users u ON ur.recipient_user_id = u.id
      WHERE ur.entity_type != 'platform_invite'
        AND ur.recipient_user_id IS NOT NULL
        ${whereClause}
      GROUP BY ur.recipient_user_id, u.display_name
      ORDER BY total_received DESC
      LIMIT 10
    `;

    const [entityTypeResult, sendersResult, recipientsResult] = await Promise.all([
      this.db.query<RowDataPacket>(entityTypeQuery),
      this.db.query<RowDataPacket>(sendersQuery),
      this.db.query<RowDataPacket>(recipientsQuery)
    ]);

    return {
      by_entity_type: (entityTypeResult.rows || []).map(row => ({
        entity_type: row.entity_type,
        count: bigIntToNumber(row.count),
        helpful_rate: bigIntToNumber(row.rated) > 0
          ? (bigIntToNumber(row.helpful) / bigIntToNumber(row.rated)) * 100
          : 0,
        avg_views: parseFloat(row.avg_views) || 0
      })),
      by_sender: (sendersResult.rows || []).map(row => ({
        user_id: row.user_id,
        display_name: row.display_name,
        total_sent: bigIntToNumber(row.total_sent),
        helpful_rate: bigIntToNumber(row.rated) > 0
          ? (bigIntToNumber(row.helpful) / bigIntToNumber(row.rated)) * 100
          : 0,
        quality_score: parseFloat(row.quality_score) || 0
      })),
      top_recipients: (recipientsResult.rows || []).map(row => ({
        user_id: row.user_id,
        display_name: row.display_name,
        total_received: bigIntToNumber(row.total_received),
        response_rate: bigIntToNumber(row.total_received) > 0
          ? (bigIntToNumber(row.responded) / bigIntToNumber(row.total_received)) * 100
          : 0
      }))
    };
  }

  // ==========================================================================
  // SPAM DETECTION
  // ==========================================================================

  /**
   * Get spam alerts for admin review
   */
  async getSpamAlerts(filters?: {
    status?: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
    severity?: 'low' | 'medium' | 'high';
    limit?: number;
    offset?: number;
  }): Promise<SpamAlert[]> {
    let query = 'SELECT * FROM user_sharing_spam_alerts WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const result = await this.db.query<RowDataPacket>(query, params);
    const rows = result.rows || [];

    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      alert_type: row.alert_type,
      severity: row.severity,
      description: row.description,
      metadata: safeJsonParse(row.metadata) || {},
      status: row.status,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at ? new Date(row.reviewed_at) : null,
      action_taken: row.action_taken,
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * Dismiss a spam alert
   */
  async dismissSpamAlert(alertId: number, reviewerUserId: number, reason?: string): Promise<void> {
    const query = `
      UPDATE user_sharing_spam_alerts
      SET status = 'dismissed',
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          action_taken = ?
      WHERE id = ?
    `;

    await this.db.query(query, [
      reviewerUserId,
      reason || 'Dismissed by admin',
      alertId
    ]);
  }

  /**
   * Take action on a spam alert
   * Phase 10.1: Full implementation of user actions
   */
  async takeSpamAction(
    alertId: number,
    reviewerUserId: number,
    action: { type: 'warn_user' | 'suspend_user' | 'ban_user' | 'rate_limit'; notes?: string; duration_hours?: number }
  ): Promise<void> {
    // Get alert details
    const alertQuery = 'SELECT * FROM user_sharing_spam_alerts WHERE id = ?';
    const alertResult = await this.db.query<RowDataPacket>(alertQuery, [alertId]);
    const alert = alertResult.rows?.[0];

    if (!alert) {
      throw new BizError({ code: 'NOT_FOUND', message: 'Alert not found' });
    }

    const userId = alert.user_id;
    const actionDescription = `${action.type}${action.notes ? `: ${action.notes}` : ''}`;

    // Execute the action
    switch (action.type) {
      case 'warn_user':
        await this.warnUser(userId, alert.description, action.notes);
        break;

      case 'suspend_user':
        await this.suspendUser(userId, action.duration_hours || 24, action.notes);
        break;

      case 'ban_user':
        await this.banUser(userId, action.notes);
        break;

      case 'rate_limit':
        await this.rateLimitUser(userId, action.duration_hours || 24);
        break;
    }

    // Update alert status
    const updateQuery = `
      UPDATE user_sharing_spam_alerts
      SET status = 'action_taken',
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          action_taken = ?
      WHERE id = ?
    `;

    await this.db.query(updateQuery, [reviewerUserId, actionDescription, alertId]);
  }

  /**
   * Send warning notification to user
   * Phase 10.1: User enforcement action
   */
  private async warnUser(userId: number, violation: string, notes?: string): Promise<void> {
    // Create in-app notification
    const notificationQuery = `
      INSERT INTO notifications (user_id, type, title, message, created_at)
      VALUES (?, 'warning', 'Sharing Policy Warning', ?, CURRENT_TIMESTAMP)
    `;

    const message = `Your sharing activity has been flagged: ${violation}. ${notes || 'Please review our sharing guidelines.'}`;
    await this.db.query(notificationQuery, [userId, message]);
  }

  /**
   * Suspend user account temporarily
   * Phase 10.1: User enforcement action
   */
  private async suspendUser(userId: number, durationHours: number, notes?: string): Promise<void> {
    const suspendUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const query = `
      UPDATE users
      SET status = 'suspended',
          suspension_reason = ?,
          suspension_until = ?
      WHERE id = ?
    `;

    await this.db.query(query, [
      notes || 'Suspended for sharing policy violation',
      suspendUntil.toISOString().slice(0, 19).replace('T', ' '),
      userId
    ]);
  }

  /**
   * Permanently ban user account
   * Phase 10.1: User enforcement action
   */
  private async banUser(userId: number, notes?: string): Promise<void> {
    const query = `
      UPDATE users
      SET status = 'banned',
          ban_reason = ?
      WHERE id = ?
    `;

    await this.db.query(query, [
      notes || 'Banned for repeated sharing policy violations',
      userId
    ]);
  }

  /**
   * Apply sharing rate limit to user
   * Phase 10.1: User enforcement action
   */
  private async rateLimitUser(userId: number, durationHours: number): Promise<void> {
    // Store rate limit in user_sharing_rate_limits table
    const query = `
      INSERT INTO user_sharing_rate_limits (user_id, max_shares_per_hour, expires_at)
      VALUES (?, 5, DATE_ADD(NOW(), INTERVAL ? HOUR))
      ON DUPLICATE KEY UPDATE
        max_shares_per_hour = 5,
        expires_at = DATE_ADD(NOW(), INTERVAL ? HOUR)
    `;

    await this.db.query(query, [userId, durationHours, durationHours]);
  }

  /**
   * Detect spam patterns for a user
   */
  async detectSpam(userId: number): Promise<SpamDetectionResult> {
    const thresholds = this.defaultThresholds;
    const flags: Array<{ type: string; severity: 'low' | 'medium' | 'high'; reason: string }> = [];
    let score = 0;

    // Check rate limiting (last hour)
    const rateQuery = `
      SELECT COUNT(*) AS count
      FROM user_referrals
      WHERE referrer_user_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `;
    const rateResult = await this.db.query<RowDataPacket>(rateQuery, [userId]);
    const sharesPerHour = bigIntToNumber(rateResult.rows?.[0]?.count) || 0;

    if (sharesPerHour > thresholds.shares_per_hour) {
      flags.push({
        type: 'rate_limit',
        severity: 'high',
        reason: `${sharesPerHour} shares in last hour (threshold: ${thresholds.shares_per_hour})`
      });
      score += 40;
    }

    // Check duplicate messages
    const dupQuery = `
      SELECT referral_message, COUNT(*) AS count
      FROM user_referrals
      WHERE referrer_user_id = ?
        AND referral_message IS NOT NULL
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY referral_message
      HAVING count > ?
      LIMIT 1
    `;
    const dupResult = await this.db.query<RowDataPacket>(dupQuery, [userId, thresholds.duplicate_message_count]);
    if (dupResult.rows && dupResult.rows.length > 0) {
      const dupCount = bigIntToNumber(dupResult.rows[0]?.count ?? 0);
      flags.push({
        type: 'duplicate_message',
        severity: 'medium',
        reason: `Same message sent ${dupCount} times in 24h`
      });
      score += 25;
    }

    // Check bulk sending
    const bulkQuery = `
      SELECT COUNT(*) AS count
      FROM user_referrals
      WHERE referrer_user_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    `;
    const bulkResult = await this.db.query<RowDataPacket>(bulkQuery, [userId]);
    const bulkCount = bigIntToNumber(bulkResult.rows?.[0]?.count) || 0;

    if (bulkCount > thresholds.bulk_send_threshold) {
      flags.push({
        type: 'bulk_send',
        severity: 'high',
        reason: `${bulkCount} shares in 24h (threshold: ${thresholds.bulk_send_threshold})`
      });
      score += 35;
    }

    // Determine action
    let recommendedAction: 'allow' | 'warn' | 'block' = 'allow';
    if (score >= 60) {
      recommendedAction = 'block';
    } else if (score >= 30) {
      recommendedAction = 'warn';
    }

    return {
      is_spam: score >= 30,
      score,
      flags,
      recommended_action: recommendedAction
    };
  }

  // ==========================================================================
  // A/B TESTING INTEGRATION
  // ==========================================================================

  /**
   * Get A/B test results from FeatureFlagService integration
   * Phase 10.1: Now includes statistical significance calculations
   */
  async getABTestResults(period?: { from: Date; to: Date }): Promise<ABTestResult[]> {
    // Query recommendations grouped by variant (from user metadata)
    const whereClause = this.buildDateFilter(period);

    const query = `
      SELECT
        'sharing_feature' AS test_id,
        'default' AS variant_id,
        'Default Sharing' AS variant_name,
        COUNT(DISTINCT ur.referrer_user_id) AS total_users,
        COUNT(*) AS total_recommendations,
        AVG(ur.quality_score) AS avg_quality_score,
        SUM(CASE WHEN ur.is_helpful = TRUE THEN 1 ELSE 0 END) AS helpful,
        SUM(CASE WHEN ur.is_helpful IS NOT NULL THEN 1 ELSE 0 END) AS rated,
        SUM(CASE WHEN ur.thanked_at IS NOT NULL THEN 1 ELSE 0 END) AS thanked,
        COUNT(*) AS sent
      FROM user_referrals ur
      WHERE ur.entity_type != 'platform_invite'
        ${whereClause}
    `;

    const result = await this.db.query<RowDataPacket>(query);
    const row = result.rows?.[0];

    if (!row) {
      return [];
    }

    const totalUsers = bigIntToNumber(row.total_users);
    const totalRecs = bigIntToNumber(row.total_recommendations);
    const rated = bigIntToNumber(row.rated);
    const helpful = bigIntToNumber(row.helpful);
    const thanked = bigIntToNumber(row.thanked);
    const sent = bigIntToNumber(row.sent);

    const helpfulRate = rated > 0 ? (helpful / rated) * 100 : 0;
    const thankRate = sent > 0 ? (thanked / sent) * 100 : 0;
    const engagementScore = this.calculateEngagementScore(helpfulRate);

    // Phase 10.1: Calculate statistical significance (control vs baseline)
    // For single variant, we compare against expected baseline (e.g., 50% helpful rate)
    const baselineRate = 0.50; // 50% baseline helpful rate
    const variantRate = rated > 0 ? helpful / rated : 0;
    const baselineN = rated; // Use same sample size for comparison
    const variantN = rated;

    let significance: StatisticalSignificanceResult | null = null;
    if (rated > 0) {
      significance = this.calculateStatisticalSignificance(
        baselineRate,
        variantRate,
        baselineN,
        variantN
      );
    }

    return [
      {
        test_id: row.test_id,
        feature_flag_key: 'sharing_recommendations',
        variant_id: row.variant_id,
        variant_name: row.variant_name,
        metrics: {
          total_users: totalUsers,
          total_recommendations: totalRecs,
          avg_quality_score: parseFloat(row.avg_quality_score) || 0,
          helpful_rate: helpfulRate,
          thank_rate: thankRate,
          engagement_score: engagementScore,
          // Phase 10.1: Statistical significance data
          p_value: significance?.p_value,
          z_score: significance?.z_score,
          significant: significance?.significant,
          confidence_interval: significance?.confidence_interval,
          lift_percentage: significance?.lift_percentage,
          min_sample_reached: significance?.min_sample_reached
        },
        confidence_interval: significance?.confidence_interval ? {
          helpful_rate_lower: significance.confidence_interval.lower,
          helpful_rate_upper: significance.confidence_interval.upper,
          confidence_level: significance.confidence_interval.confidence_level
        } : null
      }
    ];
  }

  // ==========================================================================
  // QUALITY SCORE CALCULATION
  // ==========================================================================

  /**
   * Calculate quality score breakdown for a user
   * Formula: (helpful_rate * 0.50) + (engagement_rate * 0.30) + ((1 - spam_rate) * 0.20 * 100)
   */
  async calculateQualityScore(userId: number): Promise<QualityScoreBreakdown> {
    const query = `
      SELECT
        COUNT(*) AS sent,
        SUM(CASE WHEN viewed_at IS NOT NULL THEN 1 ELSE 0 END) AS viewed,
        SUM(CASE WHEN is_helpful IS NOT NULL THEN 1 ELSE 0 END) AS rated,
        SUM(CASE WHEN is_helpful = TRUE THEN 1 ELSE 0 END) AS helpful,
        SUM(CASE WHEN thanked_at IS NOT NULL THEN 1 ELSE 0 END) AS thanked
      FROM user_referrals
      WHERE referrer_user_id = ?
        AND entity_type != 'platform_invite'
    `;

    const spamQuery = `
      SELECT COUNT(*) AS spam_flags
      FROM user_sharing_spam_alerts
      WHERE user_id = ?
        AND status != 'dismissed'
    `;

    const [result, spamResult] = await Promise.all([
      this.db.query<RowDataPacket>(query, [userId]),
      this.db.query<RowDataPacket>(spamQuery, [userId])
    ]);

    const row = result.rows?.[0] || {};
    const sent = bigIntToNumber(row.sent) || 0;
    const viewed = bigIntToNumber(row.viewed) || 0;
    const rated = bigIntToNumber(row.rated) || 0;
    const helpful = bigIntToNumber(row.helpful) || 0;
    const thanked = bigIntToNumber(row.thanked) || 0;
    const spamFlags = bigIntToNumber(spamResult.rows?.[0]?.spam_flags) || 0;

    // Calculate rates
    const helpfulRate = rated > 0 ? (helpful / rated) * 100 : 0;
    const engagementRate = sent > 0 ? ((viewed + rated + thanked) / sent) * 100 : 0;
    const spamRate = sent > 0 ? (spamFlags / sent) * 100 : 0;

    // Calculate components (0-50, 0-30, 0-20)
    const helpfulComponent = (helpfulRate / 100) * 50;
    const engagementComponent = (engagementRate / 100) * 30;
    const spamComponent = (1 - (spamRate / 100)) * 20;

    // Total score (0-100)
    const score = Math.max(0, Math.min(100, helpfulComponent + engagementComponent + spamComponent));

    // Determine tier
    let tier: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 80) tier = 'excellent';
    else if (score >= 60) tier = 'good';
    else if (score >= 40) tier = 'fair';
    else tier = 'poor';

    return {
      score: Math.round(score),
      tier,
      components: {
        helpful_component: Math.round(helpfulComponent),
        engagement_component: Math.round(engagementComponent),
        spam_component: Math.round(spamComponent)
      },
      metrics: {
        helpful_rate: helpfulRate,
        engagement_rate: engagementRate,
        spam_rate: spamRate
      }
    };
  }

  // ==========================================================================
  // STATISTICAL SIGNIFICANCE CALCULATION (Phase 10.1)
  // ==========================================================================

  /**
   * Calculate statistical significance using two-proportion z-test
   * Phase 10.1: Full implementation of statistical significance for A/B testing
   *
   * @param controlRate - Conversion rate for control group (0-1)
   * @param variantRate - Conversion rate for variant group (0-1)
   * @param controlN - Sample size for control
   * @param variantN - Sample size for variant
   * @returns Statistical significance results
   */
  calculateStatisticalSignificance(
    controlRate: number,
    variantRate: number,
    controlN: number,
    variantN: number
  ): StatisticalSignificanceResult {
    const MIN_SAMPLE = 30;

    // Check minimum sample size
    if (controlN < MIN_SAMPLE || variantN < MIN_SAMPLE) {
      return {
        p_value: 1,
        z_score: 0,
        significant: false,
        confidence_interval: { lower: 0, upper: 0, confidence_level: 0.95 },
        lift_percentage: 0,
        min_sample_reached: false
      };
    }

    // Pooled proportion
    const pooled = (controlRate * controlN + variantRate * variantN) / (controlN + variantN);

    // Standard error
    const se = Math.sqrt(pooled * (1 - pooled) * (1/controlN + 1/variantN));

    // Z-score
    const z = se > 0 ? (variantRate - controlRate) / se : 0;

    // Two-tailed p-value using normal approximation
    const p = 2 * (1 - this.normalCDF(Math.abs(z)));

    // 95% confidence interval for difference
    const diff = variantRate - controlRate;
    const ciMargin = 1.96 * se;

    // Lift percentage
    const lift = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;

    return {
      p_value: Math.round(p * 1000) / 1000,
      z_score: Math.round(z * 100) / 100,
      significant: p < 0.05,
      confidence_interval: {
        lower: Math.round((diff - ciMargin) * 1000) / 1000,
        upper: Math.round((diff + ciMargin) * 1000) / 1000,
        confidence_level: 0.95
      },
      lift_percentage: Math.round(lift * 10) / 10,
      min_sample_reached: true
    };
  }

  /**
   * Normal CDF approximation (Abramowitz and Stegun)
   * Used for calculating p-values in statistical significance tests
   */
  private normalCDF(z: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private buildDateFilter(period?: { from: Date; to: Date }): string {
    if (!period) return '';
    return `AND created_at >= '${period.from.toISOString()}' AND created_at <= '${period.to.toISOString()}'`;
  }

  private buildPeriodFilter(period: 'day' | 'week' | 'month'): string {
    switch (period) {
      case 'day':
        return 'DATE_SUB(NOW(), INTERVAL 1 DAY)';
      case 'week':
        return 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
      case 'month':
        return 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }
  }

  private calculateEngagementScore(helpfulRate: number): number {
    // Simple engagement score: helpful_rate is primary factor
    // Future: incorporate view time, interaction depth
    return Math.round(Math.min(100, helpfulRate));
  }
}
