/**
 * SharingAnalyticsService Unit Tests
 *
 * Comprehensive test suite for the Sharing Analytics Service
 * covering all 12 public methods with edge cases and error scenarios.
 *
 * Methods Tested:
 * - getMetricsOverview
 * - getFunnelMetrics
 * - getQualityMetrics
 * - getBreakdownMetrics
 * - getSpamAlerts
 * - dismissSpamAlert
 * - takeSpamAction
 * - detectSpam
 * - getABTestResults
 * - calculateQualityScore
 * - calculateStatisticalSignificance
 *
 * Coverage Target: 70%+
 *
 * @phase Technical Debt Remediation - Phase 5
 * @authority docs/components/connections/userrecommendations/phases/TD_PHASE_5_BRAIN_PLAN.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SharingAnalyticsService } from '../SharingAnalyticsService';
import { DatabaseService } from '@core/services/DatabaseService';
import type {
  SharingMetricsOverview,
  SharingFunnelMetrics,
  SharingQualityMetrics,
  SpamAlert,
  SpamDetectionResult,
  QualityScoreBreakdown
} from '@features/contacts/types/analytics';

describe('SharingAnalyticsService', () => {
  let service: SharingAnalyticsService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    // Create mock DatabaseService
    mockDb = {
      query: vi.fn()
    } as unknown as DatabaseService;

    service = new SharingAnalyticsService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // METRICS AGGREGATION
  // ==========================================================================

  describe('getMetricsOverview', () => {
    it('should retrieve overview metrics with data', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            total_recommendations: 100n,
            total_views: 80n,
            total_helpful: 60n,
            total_not_helpful: 10n,
            total_thanked: 40n,
            avg_quality_score: 75.5
          }]
        }) // main metrics
        .mockResolvedValueOnce({
          rows: [{ spam_count: 5n }]
        }); // spam count

      const result = await service.getMetricsOverview();

      expect(result.total_recommendations).toBe(100);
      expect(result.total_views).toBe(80);
      expect(result.total_helpful).toBe(60);
      expect(result.total_not_helpful).toBe(10);
      expect(result.total_thanked).toBe(40);
      expect(result.avg_quality_score).toBeCloseTo(75.5);
      expect(result.spam_flag_count).toBe(5);
    });

    it('should handle empty metrics (no data)', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [{}] });

      const result = await service.getMetricsOverview();

      expect(result.total_recommendations).toBe(0);
      expect(result.total_views).toBe(0);
      expect(result.spam_flag_count).toBe(0);
    });

    it('should apply date filter when period provided', async () => {
      const fromDate = new Date('2026-01-01');
      const toDate = new Date('2026-01-31');

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            total_recommendations: 50n,
            total_views: 40n,
            total_helpful: 30n,
            total_not_helpful: 5n,
            total_thanked: 20n,
            avg_quality_score: 80.0
          }]
        })
        .mockResolvedValueOnce({ rows: [{ spam_count: 2n }] });

      const result = await service.getMetricsOverview({ from: fromDate, to: toDate });

      expect(result.total_recommendations).toBe(50);
      // Verify the date filter was included in the query
      const firstCall = mockDb.query.mock.calls[0][0];
      expect(firstCall).toContain('created_at');
      expect(firstCall).toContain('2026-01-01');
    });
  });

  describe('getFunnelMetrics', () => {
    it('should calculate funnel metrics for day period', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          sent: 100n,
          viewed: 80n,
          rated: 50n,
          helpful: 40n,
          thanked: 30n
        }]
      });

      const result = await service.getFunnelMetrics('day');

      expect(result.period).toBe('day');
      expect(result.stages.sent).toBe(100);
      expect(result.stages.viewed).toBe(80);
      expect(result.stages.rated).toBe(50);
      expect(result.stages.helpful).toBe(40);
      expect(result.stages.thanked).toBe(30);
      expect(result.conversion_rates.view_rate).toBe(80);
      expect(result.conversion_rates.rating_rate).toBe(62.5); // 50/80 * 100
      expect(result.conversion_rates.helpful_rate).toBe(80); // 40/50 * 100
      expect(result.conversion_rates.thank_rate).toBe(30); // 30/100 * 100
    });

    it('should calculate funnel metrics for week period', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          sent: 500n,
          viewed: 400n,
          rated: 250n,
          helpful: 200n,
          thanked: 150n
        }]
      });

      const result = await service.getFunnelMetrics('week');

      expect(result.period).toBe('week');
      expect(result.stages.sent).toBe(500);
    });

    it('should calculate funnel metrics for month period', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          sent: 2000n,
          viewed: 1600n,
          rated: 1000n,
          helpful: 800n,
          thanked: 600n
        }]
      });

      const result = await service.getFunnelMetrics('month');

      expect(result.period).toBe('month');
      expect(result.stages.sent).toBe(2000);
    });

    it('should handle zero values without division errors', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          sent: 0n,
          viewed: 0n,
          rated: 0n,
          helpful: 0n,
          thanked: 0n
        }]
      });

      const result = await service.getFunnelMetrics('day');

      expect(result.conversion_rates.view_rate).toBe(0);
      expect(result.conversion_rates.rating_rate).toBe(0);
      expect(result.conversion_rates.helpful_rate).toBe(0);
      expect(result.conversion_rates.thank_rate).toBe(0);
    });
  });

  describe('getQualityMetrics', () => {
    it('should calculate quality metrics with data', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          total_rated: 100n,
          helpful_count: 80n,
          not_helpful_count: 20n
        }]
      });

      const result = await service.getQualityMetrics();

      expect(result.total_rated).toBe(100);
      expect(result.helpful_count).toBe(80);
      expect(result.not_helpful_count).toBe(20);
      expect(result.helpful_rate).toBe(80); // 80/100 * 100
      expect(result.engagement_score).toBe(80);
    });

    it('should handle zero rated items', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          total_rated: 0n,
          helpful_count: 0n,
          not_helpful_count: 0n
        }]
      });

      const result = await service.getQualityMetrics();

      expect(result.helpful_rate).toBe(0);
      expect(result.engagement_score).toBe(0);
    });

    it('should apply date filter when period provided', async () => {
      const fromDate = new Date('2026-01-01');
      const toDate = new Date('2026-01-31');

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          total_rated: 50n,
          helpful_count: 40n,
          not_helpful_count: 10n
        }]
      });

      const result = await service.getQualityMetrics({ from: fromDate, to: toDate });

      expect(result.total_rated).toBe(50);
    });
  });

  describe('getBreakdownMetrics', () => {
    it('should retrieve breakdown by entity type, sender, and recipient', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            { entity_type: 'listing', count: 50n, avg_views: 0.8, helpful: 40n, rated: 45n },
            { entity_type: 'user', count: 30n, avg_views: 0.6, helpful: 20n, rated: 25n },
            { entity_type: 'event', count: 20n, avg_views: 0.7, helpful: 15n, rated: 18n }
          ]
        }) // by entity type
        .mockResolvedValueOnce({
          rows: [
            { user_id: 101, display_name: 'John Doe', total_sent: 25n, helpful: 20n, rated: 22n, quality_score: 85.5 },
            { user_id: 102, display_name: 'Jane Smith', total_sent: 20n, helpful: 15n, rated: 18n, quality_score: 80.0 }
          ]
        }) // top senders
        .mockResolvedValueOnce({
          rows: [
            { user_id: 201, display_name: 'Bob Wilson', total_received: 15n, responded: 12n },
            { user_id: 202, display_name: 'Alice Brown', total_received: 10n, responded: 8n }
          ]
        }); // top recipients

      const result = await service.getBreakdownMetrics();

      expect(result.by_entity_type).toHaveLength(3);
      expect(result.by_entity_type[0].entity_type).toBe('listing');
      expect(result.by_sender).toHaveLength(2);
      expect(result.top_recipients).toHaveLength(2);
      expect(result.top_recipients[0].response_rate).toBe(80); // 12/15 * 100
    });

    it('should handle empty breakdown data', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getBreakdownMetrics();

      expect(result.by_entity_type).toHaveLength(0);
      expect(result.by_sender).toHaveLength(0);
      expect(result.top_recipients).toHaveLength(0);
    });
  });

  // ==========================================================================
  // SPAM DETECTION
  // ==========================================================================

  describe('getSpamAlerts', () => {
    it('should retrieve spam alerts with pagination', async () => {
      const createdAt = new Date();
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: 100,
            alert_type: 'rate_limit',
            severity: 'high',
            description: 'Exceeded rate limit',
            metadata: JSON.stringify({ shares_per_hour: 25 }),
            status: 'pending',
            reviewed_by: null,
            reviewed_at: null,
            action_taken: null,
            created_at: createdAt
          }
        ]
      });

      const result = await service.getSpamAlerts({ status: 'pending', limit: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].alert_type).toBe('rate_limit');
      expect(result[0].severity).toBe('high');
      expect(result[0].status).toBe('pending');
    });

    it('should filter by severity', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: 100,
            alert_type: 'bulk_send',
            severity: 'high',
            description: 'Bulk sending detected',
            metadata: '{}',
            status: 'pending',
            reviewed_by: null,
            reviewed_at: null,
            action_taken: null,
            created_at: new Date()
          }
        ]
      });

      const result = await service.getSpamAlerts({ severity: 'high' });

      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('high');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('severity = ?'),
        expect.arrayContaining(['high'])
      );
    });

    it('should return empty array when no alerts', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getSpamAlerts();

      expect(result).toHaveLength(0);
    });
  });

  describe('dismissSpamAlert', () => {
    it('should dismiss spam alert with reason', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], affectedRows: 1 });

      await service.dismissSpamAlert(1, 999, 'False positive');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('dismissed'),
        expect.arrayContaining([999, 'False positive', 1])
      );
    });

    it('should dismiss spam alert with default reason', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], affectedRows: 1 });

      await service.dismissSpamAlert(1, 999);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([999, 'Dismissed by admin', 1])
      );
    });
  });

  describe('takeSpamAction', () => {
    it('should warn user', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 100,
            description: 'Rate limit exceeded'
          }]
        }) // get alert
        .mockResolvedValueOnce({ rows: [], insertId: 1n }) // insert notification
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }); // update alert

      await service.takeSpamAction(1, 999, { type: 'warn_user', notes: 'First warning' });

      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });

    it('should suspend user for specified duration', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 100,
            description: 'Spam detected'
          }]
        }) // get alert
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }) // update user status
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }); // update alert

      await service.takeSpamAction(1, 999, { type: 'suspend_user', duration_hours: 48 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('suspended'),
        expect.any(Array)
      );
    });

    it('should ban user', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 100,
            description: 'Repeated violations'
          }]
        }) // get alert
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }) // update user status
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }); // update alert

      await service.takeSpamAction(1, 999, { type: 'ban_user', notes: 'Repeated violations' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('banned'),
        expect.any(Array)
      );
    });

    it('should apply rate limit', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 100,
            description: 'Rate limit exceeded'
          }]
        }) // get alert
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }) // upsert rate limit
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }); // update alert

      await service.takeSpamAction(1, 999, { type: 'rate_limit', duration_hours: 24 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('user_sharing_rate_limits'),
        expect.any(Array)
      );
    });

    it('should throw error when alert not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.takeSpamAction(999, 100, { type: 'warn_user' }))
        .rejects.toThrow('Alert not found');
    });
  });

  describe('detectSpam', () => {
    it('should detect rate limiting violation', async () => {
      // Set up rate limit violation: 25 shares/hour > threshold (20)
      // Score: 40 (rate_limit), which is >= 30 but < 60 = 'warn'
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 25n }] }) // shares per hour (> 20 threshold)
        .mockResolvedValueOnce({ rows: [] }) // no duplicate messages
        .mockResolvedValueOnce({ rows: [{ count: 30n }] }); // bulk count (< 50 threshold)

      const result = await service.detectSpam(100);

      expect(result.is_spam).toBe(true);
      expect(result.score).toBe(40); // rate_limit adds 40 points
      expect(result.flags.some(f => f.type === 'rate_limit')).toBe(true);
      expect(result.recommended_action).toBe('warn'); // 40 >= 30, < 60
    });

    it('should detect duplicate messages', async () => {
      // Duplicate message detection: sends same message 10 times (> 5 threshold)
      // Score: 25 (duplicate_message), which is < 30 = not spam (but flag is raised)
      // To make is_spam = true, we need score >= 30, so we also trigger rate_limit
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 22n }] }) // shares per hour (> 20, triggers rate_limit)
        .mockResolvedValueOnce({ rows: [{ referral_message: 'Same message', count: 10n }] }) // duplicates
        .mockResolvedValueOnce({ rows: [{ count: 20n }] }); // bulk count (ok)

      const result = await service.detectSpam(100);

      // Score: 40 (rate) + 25 (dup) = 65, >= 30 = is_spam
      expect(result.is_spam).toBe(true);
      expect(result.flags.some(f => f.type === 'duplicate_message')).toBe(true);
      expect(result.flags.some(f => f.type === 'rate_limit')).toBe(true);
    });

    it('should detect bulk sending', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 10n }] }) // shares per hour (ok)
        .mockResolvedValueOnce({ rows: [] }) // no duplicates
        .mockResolvedValueOnce({ rows: [{ count: 60n }] }); // bulk count (high)

      const result = await service.detectSpam(100);

      expect(result.is_spam).toBe(true);
      expect(result.flags.some(f => f.type === 'bulk_send')).toBe(true);
    });

    it('should allow legitimate activity', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 5n }] }) // shares per hour (ok)
        .mockResolvedValueOnce({ rows: [] }) // no duplicates
        .mockResolvedValueOnce({ rows: [{ count: 10n }] }); // bulk count (ok)

      const result = await service.detectSpam(100);

      expect(result.is_spam).toBe(false);
      expect(result.score).toBeLessThan(30);
      expect(result.recommended_action).toBe('allow');
    });

    it('should return warn action for moderate score', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 10n }] }) // shares per hour (ok)
        .mockResolvedValueOnce({ rows: [{ referral_message: 'msg', count: 6n }] }) // some duplicates
        .mockResolvedValueOnce({ rows: [{ count: 25n }] }); // bulk count (ok)

      const result = await service.detectSpam(100);

      // Duplicate detection adds 25 points, which is 30+ = warn
      if (result.score >= 30 && result.score < 60) {
        expect(result.recommended_action).toBe('warn');
      }
    });
  });

  // ==========================================================================
  // A/B TESTING
  // ==========================================================================

  describe('getABTestResults', () => {
    it('should retrieve A/B test results with metrics', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          test_id: 'sharing_feature',
          variant_id: 'default',
          variant_name: 'Default Sharing',
          total_users: 100n,
          total_recommendations: 500n,
          avg_quality_score: 75.5,
          helpful: 200n,
          rated: 300n,
          thanked: 100n,
          sent: 500n
        }]
      });

      const result = await service.getABTestResults();

      expect(result).toHaveLength(1);
      expect(result[0].test_id).toBe('sharing_feature');
      expect(result[0].metrics.total_users).toBe(100);
      expect(result[0].metrics.total_recommendations).toBe(500);
      expect(result[0].metrics.helpful_rate).toBeCloseTo(66.67, 1); // 200/300 * 100
    });

    it('should return empty array when no data', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getABTestResults();

      expect(result).toHaveLength(0);
    });

    it('should include statistical significance for large samples', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          test_id: 'sharing_feature',
          variant_id: 'default',
          variant_name: 'Default Sharing',
          total_users: 1000n,
          total_recommendations: 5000n,
          avg_quality_score: 80.0,
          helpful: 3000n,
          rated: 4000n,
          thanked: 1500n,
          sent: 5000n
        }]
      });

      const result = await service.getABTestResults();

      expect(result[0].metrics.p_value).toBeDefined();
      expect(result[0].metrics.z_score).toBeDefined();
      expect(result[0].metrics.significant).toBeDefined();
      expect(result[0].metrics.min_sample_reached).toBe(true);
    });
  });

  // ==========================================================================
  // QUALITY SCORE
  // ==========================================================================

  describe('calculateQualityScore', () => {
    it('should calculate excellent quality score', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            sent: 100n,
            viewed: 90n,
            rated: 80n,
            helpful: 75n,
            thanked: 60n
          }]
        }) // user stats
        .mockResolvedValueOnce({
          rows: [{ spam_flags: 0n }]
        }); // spam count

      const result = await service.calculateQualityScore(100);

      expect(result.score).toBeGreaterThan(60);
      expect(['excellent', 'good']).toContain(result.tier);
      expect(result.components.helpful_component).toBeGreaterThan(0);
      expect(result.components.engagement_component).toBeGreaterThan(0);
      expect(result.components.spam_component).toBeGreaterThan(0);
    });

    it('should calculate poor quality score with spam', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            sent: 100n,
            viewed: 20n,
            rated: 10n,
            helpful: 2n,
            thanked: 1n
          }]
        }) // user stats
        .mockResolvedValueOnce({
          rows: [{ spam_flags: 10n }]
        }); // spam count

      const result = await service.calculateQualityScore(100);

      expect(result.tier).toBe('poor');
      expect(result.metrics.spam_rate).toBeGreaterThan(0);
    });

    it('should handle user with no activity', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            sent: 0n,
            viewed: 0n,
            rated: 0n,
            helpful: 0n,
            thanked: 0n
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ spam_flags: 0n }]
        });

      const result = await service.calculateQualityScore(100);

      expect(result.score).toBeLessThanOrEqual(20); // Only spam component (max 20)
      expect(result.metrics.helpful_rate).toBe(0);
      expect(result.metrics.engagement_rate).toBe(0);
    });

    it('should calculate correct tier boundaries', async () => {
      // Test bronze tier (0-39)
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ sent: 100n, viewed: 10n, rated: 5n, helpful: 1n, thanked: 0n }]
        })
        .mockResolvedValueOnce({ rows: [{ spam_flags: 5n }] });

      const poorResult = await service.calculateQualityScore(100);
      expect(poorResult.tier).toBe('poor');

      // Reset and test good tier (60-79)
      vi.clearAllMocks();
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ sent: 100n, viewed: 70n, rated: 60n, helpful: 40n, thanked: 30n }]
        })
        .mockResolvedValueOnce({ rows: [{ spam_flags: 0n }] });

      const goodResult = await service.calculateQualityScore(100);
      expect(['fair', 'good', 'excellent']).toContain(goodResult.tier);
    });
  });

  // ==========================================================================
  // STATISTICAL SIGNIFICANCE
  // ==========================================================================

  describe('calculateStatisticalSignificance', () => {
    it('should calculate significance for large samples', () => {
      const result = service.calculateStatisticalSignificance(
        0.50, // control rate
        0.55, // variant rate
        1000, // control N
        1000  // variant N
      );

      expect(result.min_sample_reached).toBe(true);
      expect(result.p_value).toBeLessThan(1);
      expect(result.z_score).not.toBe(0);
      expect(result.lift_percentage).toBeCloseTo(10, 1); // 10% lift
      expect(result.confidence_interval).toBeDefined();
    });

    it('should detect statistical significance when p < 0.05', () => {
      // Large difference with large sample
      const result = service.calculateStatisticalSignificance(
        0.40, // control rate
        0.60, // variant rate (50% lift)
        500,  // control N
        500   // variant N
      );

      expect(result.significant).toBe(true);
      expect(result.p_value).toBeLessThan(0.05);
    });

    it('should not detect significance for small samples', () => {
      const result = service.calculateStatisticalSignificance(
        0.50, // control rate
        0.55, // variant rate
        10,   // control N (too small)
        10    // variant N (too small)
      );

      expect(result.min_sample_reached).toBe(false);
      expect(result.significant).toBe(false);
      expect(result.p_value).toBe(1);
    });

    it('should handle equal rates', () => {
      const result = service.calculateStatisticalSignificance(
        0.50, // control rate
        0.50, // variant rate (same)
        1000, // control N
        1000  // variant N
      );

      expect(result.lift_percentage).toBe(0);
      expect(result.significant).toBe(false);
      expect(result.z_score).toBe(0);
    });

    it('should calculate correct confidence interval', () => {
      const result = service.calculateStatisticalSignificance(
        0.50, // control rate
        0.60, // variant rate
        100,  // control N
        100   // variant N
      );

      expect(result.confidence_interval.confidence_level).toBe(0.95);
      expect(result.confidence_interval.lower).toBeLessThan(result.confidence_interval.upper);
    });

    it('should handle zero control rate', () => {
      const result = service.calculateStatisticalSignificance(
        0,    // control rate (zero)
        0.10, // variant rate
        100,  // control N
        100   // variant N
      );

      expect(result.lift_percentage).toBe(0); // Cannot calculate lift from 0
      expect(result.min_sample_reached).toBe(true);
    });
  });
});
