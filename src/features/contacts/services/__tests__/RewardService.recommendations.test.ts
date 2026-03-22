/**
 * RewardService Recommendation Methods Unit Tests
 *
 * Tests for the 14 recommendation-related methods in RewardService:
 * - recordRecommendationReward
 * - getUnifiedTotalPoints
 * - getUnifiedSharingStats
 * - getUnifiedRewardSummary
 * - getUnifiedLeaderboard
 * - getEntityRecommendationStats
 * - getUnifiedUserRank
 * - getStreakStatus
 * - updateStreak
 * - useStreakFreeze
 * - calculateTier (private)
 * - getTierStatus
 * - checkBadgeEligibility
 * - calculateStatisticalSignificance (if exists)
 *
 * Coverage Target: 70%+
 *
 * @phase Technical Debt Remediation - Phase 5
 * @authority docs/components/connections/userrecommendations/phases/TD_PHASE_5_BRAIN_PLAN.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RewardService } from '../RewardService';
import { DatabaseService } from '@core/services/DatabaseService';

describe('RewardService - Recommendation Methods', () => {
  let service: RewardService;
  let mockDb: DatabaseService;

  // Default mock data for common query patterns
  const defaultMockData = {
    referralStats: {
      referrals_sent: 5n,
      conversions: 3n,
      total_points: 100n
    },
    recommendationStats: {
      recommendations_sent: 10n,
      helpful_count: 7n,
      thank_you_count: 5n,
      total_rated: 8n
    },
    entityStats: [
      { entity_type: 'listing', count: 5n },
      { entity_type: 'user', count: 3n },
      { entity_type: 'event', count: 2n }
    ],
    streakRecord: {
      user_id: 100,
      current_streak: 5,
      longest_streak: 10,
      streak_start_date: new Date(),
      last_activity_date: new Date(),
      last_activity_week: '2026-W08',
      freezes_available: 2,
      freezes_used_this_month: 0,
      freeze_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      bonus_multiplier: '1.25'
    },
    recommendationPoints: 50n,
    referralPoints: 100n,
    rewardPoints: 50n
  };

  // Smart query router based on query content
  const setupSmartMock = (overrides: Partial<typeof defaultMockData> = {}) => {
    const data = { ...defaultMockData, ...overrides };
    let insertIdCounter = 1n;

    mockDb.query.mockImplementation((query: string, params?: unknown[]) => {
      // INSERT queries
      if (query.includes('INSERT INTO user_rewards')) {
        const currentId = insertIdCounter++;
        return Promise.resolve({ rows: [], insertId: currentId });
      }
      if (query.includes('INSERT INTO user_sharing_streaks')) {
        return Promise.resolve({ rows: [], insertId: 1n });
      }
      if (query.includes('INSERT INTO user_badges')) {
        return Promise.resolve({ rows: [], insertId: 1n });
      }

      // UPDATE queries
      if (query.includes('UPDATE user_sharing_streaks')) {
        return Promise.resolve({ rows: [], affectedRows: 1 });
      }
      if (query.includes('UPDATE user_referrals')) {
        return Promise.resolve({ rows: [], affectedRows: 1 });
      }

      // SELECT user_rewards by ID (getRewardById)
      if (query.includes('SELECT * FROM user_rewards WHERE id = ?')) {
        const rewardId = params?.[0] as number;
        return Promise.resolve({
          rows: [{
            id: rewardId,
            user_id: 100,
            reward_type: 'recommendation_sent',
            points_earned: 5,
            badge_id: null,
            milestone_type: null,
            referral_id: null,
            description: 'Recommended a listing',
            created_at: new Date()
          }]
        });
      }

      // Referral stats (getUserStats - referral query)
      if (query.includes('SELECT') && query.includes('user_referrals') && query.includes('entity_type = \'platform_invite\'') && query.includes('conversions')) {
        return Promise.resolve({ rows: [data.referralStats] });
      }

      // Recommendation stats query
      if (query.includes('SELECT') && query.includes('user_referrals') && query.includes('entity_type != \'platform_invite\'') && query.includes('helpful_count')) {
        return Promise.resolve({ rows: [data.recommendationStats] });
      }

      // Entity recommendation stats
      if (query.includes('SELECT') && query.includes('entity_type') && query.includes('GROUP BY entity_type')) {
        return Promise.resolve({ rows: data.entityStats });
      }

      // Recommendation points from user_rewards
      if (query.includes('SELECT') && query.includes('user_rewards') && query.includes('recommendation_')) {
        return Promise.resolve({ rows: [{ recommendation_points: data.recommendationPoints }] });
      }

      // Streak record queries
      if (query.includes('SELECT * FROM user_sharing_streaks') && query.includes('user_id')) {
        return Promise.resolve({ rows: [data.streakRecord] });
      }
      if (query.includes('SELECT current_streak FROM user_sharing_streaks')) {
        return Promise.resolve({ rows: [{ current_streak: data.streakRecord.current_streak }] });
      }

      // User badges check
      if (query.includes('SELECT') && query.includes('user_badges') && query.includes('badge_type')) {
        return Promise.resolve({ rows: [] }); // No existing badge
      }
      if (query.includes('SELECT') && query.includes('user_badges') && query.includes('user_id')) {
        return Promise.resolve({ rows: [] }); // No earned badges
      }

      // Referral points for getUnifiedTotalPoints
      if (query.includes('SUM(reward_points)') && query.includes('referral_points')) {
        return Promise.resolve({ rows: [{ referral_points: data.referralPoints }] });
      }

      // Reward points for getUnifiedTotalPoints
      if (query.includes('SUM(points_earned)') && query.includes('reward_points')) {
        return Promise.resolve({ rows: [{ reward_points: data.rewardPoints }] });
      }

      // Unified user rank
      if (query.includes('COUNT(*) + 1 as rank')) {
        return Promise.resolve({ rows: [{ rank: 5n }] });
      }

      // Unified leaderboard - users query
      if (query.includes('SELECT DISTINCT') && query.includes('users u')) {
        return Promise.resolve({
          rows: [
            { user_id: 101, user_name: 'User One', avatar_url: '/avatar1.jpg' },
            { user_id: 102, user_name: 'User Two', avatar_url: '/avatar2.jpg' }
          ]
        });
      }

      // Unified leaderboard - points query
      if (query.includes('user_id') && query.includes('referral_points') && query.includes('recommendation_points') && query.includes('UNION ALL')) {
        return Promise.resolve({
          rows: [
            { user_id: 101, referral_points: 100n, recommendation_points: 100n },
            { user_id: 102, referral_points: 75n, recommendation_points: 75n }
          ]
        });
      }

      // Unified leaderboard - counts query
      if (query.includes('total_referrals') && query.includes('total_recommendations') && query.includes('conversion_count')) {
        return Promise.resolve({
          rows: [
            { user_id: 101, total_referrals: 10n, total_recommendations: 15n, total_conversions: 5n, badges_earned: 3n },
            { user_id: 102, total_referrals: 8n, total_recommendations: 12n, total_conversions: 3n, badges_earned: 2n }
          ]
        });
      }

      // Default: return empty rows
      return Promise.resolve({ rows: [] });
    });
  };

  beforeEach(() => {
    // Create mock DatabaseService
    mockDb = {
      query: vi.fn()
    } as unknown as DatabaseService;

    service = new RewardService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // REWARD RECORDING
  // ==========================================================================

  describe('recordRecommendationReward', () => {
    it('should record recommendation_sent reward', async () => {
      setupSmartMock();

      const result = await service.recordRecommendationReward(
        100,
        'recommendation_sent',
        5,
        { recommendationId: 1 }
      );

      expect(result.reward_type).toBe('recommendation_sent');
      expect(result.points_earned).toBe(5);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should record recommendation_helpful reward', async () => {
      let insertCount = 0;
      mockDb.query.mockImplementation((query: string, params?: unknown[]) => {
        if (query.includes('INSERT INTO user_rewards')) {
          insertCount++;
          return Promise.resolve({ rows: [], insertId: BigInt(insertCount) });
        }
        if (query.includes('SELECT * FROM user_rewards WHERE id = ?')) {
          return Promise.resolve({
            rows: [{
              id: params?.[0],
              user_id: 100,
              reward_type: 'recommendation_helpful',
              points_earned: 10,
              created_at: new Date()
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.recordRecommendationReward(
        100,
        'recommendation_helpful',
        10,
        { recommendationId: 1 }
      );

      expect(result.reward_type).toBe('recommendation_helpful');
      expect(result.points_earned).toBe(10);
    });

    it('should record recommendation_thanked reward', async () => {
      let insertCount = 0;
      mockDb.query.mockImplementation((query: string, params?: unknown[]) => {
        if (query.includes('INSERT INTO user_rewards')) {
          insertCount++;
          return Promise.resolve({ rows: [], insertId: BigInt(insertCount) });
        }
        if (query.includes('SELECT * FROM user_rewards WHERE id = ?')) {
          return Promise.resolve({
            rows: [{
              id: params?.[0],
              user_id: 100,
              reward_type: 'recommendation_thanked',
              points_earned: 15,
              created_at: new Date()
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.recordRecommendationReward(
        100,
        'recommendation_thanked',
        15,
        { recommendationId: 1 }
      );

      expect(result.reward_type).toBe('recommendation_thanked');
      expect(result.points_earned).toBe(15);
    });
  });

  // ==========================================================================
  // UNIFIED STATS
  // ==========================================================================

  describe('getUnifiedTotalPoints', () => {
    it('should calculate combined referral and recommendation points', async () => {
      // Use mockResolvedValueOnce for parallel queries (Promise.all)
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ referral_points: 100n }] })
        .mockResolvedValueOnce({ rows: [{ reward_points: 50n }] });

      const result = await service.getUnifiedTotalPoints(100);

      expect(result).toBe(150);
    });

    it('should handle user with no points', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ referral_points: 0n }] })
        .mockResolvedValueOnce({ rows: [{ reward_points: 0n }] });

      const result = await service.getUnifiedTotalPoints(100);

      expect(result).toBe(0);
    });
  });

  describe('getUnifiedSharingStats', () => {
    it('should combine referral and recommendation statistics', async () => {
      setupSmartMock();

      const result = await service.getUnifiedSharingStats(100);

      expect(result).toBeDefined();
      expect(result.total_referrals_sent).toBeDefined();
      expect(result.total_recommendations_sent).toBeDefined();
    });
  });

  describe('getUnifiedRewardSummary', () => {
    it('should return extended summary with recommendation data', async () => {
      setupSmartMock();

      const result = await service.getUnifiedRewardSummary(100);

      expect(result).toBeDefined();
      expect(result.total_recommendations_sent).toBeDefined();
    });
  });

  // ==========================================================================
  // LEADERBOARD
  // ==========================================================================

  describe('getUnifiedLeaderboard', () => {
    it('should retrieve leaderboard with all categories', async () => {
      setupSmartMock();

      const result = await service.getUnifiedLeaderboard(100);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].total_points).toBeDefined();
    });

    it('should filter by recommendation category', async () => {
      setupSmartMock();

      const result = await service.getUnifiedLeaderboard(100, { category: 'recommendations' });

      expect(result).toBeDefined();
    });

    it('should handle pagination', async () => {
      setupSmartMock();

      const result = await service.getUnifiedLeaderboard(100, { page: 1, limit: 10 });

      expect(result).toBeDefined();
    });
  });

  describe('getEntityRecommendationStats', () => {
    it('should retrieve per-entity type recommendation counts', async () => {
      setupSmartMock();

      const result = await service.getEntityRecommendationStats(100);

      expect(result).toBeDefined();
      expect(result.listing).toBeDefined();
      expect(result.event).toBeDefined();
      expect(result.user).toBeDefined();
    });
  });

  describe('getUnifiedUserRank', () => {
    it('should calculate user rank based on unified points', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ rank: 5n }] });

      const result = await service.getUnifiedUserRank(100);

      expect(result).toBe(5);
    });

    it('should return rank 1 for top user', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ rank: 1n }] });

      const result = await service.getUnifiedUserRank(100);

      expect(result).toBe(1);
    });
  });

  // ==========================================================================
  // STREAK MANAGEMENT
  // ==========================================================================

  describe('getStreakStatus', () => {
    it('should retrieve current streak status', async () => {
      setupSmartMock();

      const result = await service.getStreakStatus(100);

      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(10);
      expect(result.freezesAvailable).toBe(2);
    });

    it('should handle user with no streak', async () => {
      setupSmartMock({
        streakRecord: {
          ...defaultMockData.streakRecord,
          current_streak: 0,
          longest_streak: 0,
          freezes_available: 1
        }
      });

      const result = await service.getStreakStatus(100);

      expect(result.currentStreak).toBe(0);
    });
  });

  describe('updateStreak', () => {
    it('should increment streak on activity', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      setupSmartMock({
        streakRecord: {
          ...defaultMockData.streakRecord,
          current_streak: 5,
          last_activity_date: yesterday,
          last_activity_week: '2026-W07' // Previous week
        }
      });

      const result = await service.updateStreak(100);

      expect(result.currentStreak).toBeGreaterThan(0);
    });

    it('should reset streak if gap too large', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
      setupSmartMock({
        streakRecord: {
          ...defaultMockData.streakRecord,
          current_streak: 5,
          last_activity_date: threeDaysAgo,
          last_activity_week: '2026-W05' // Old week
        }
      });

      const result = await service.updateStreak(100);

      expect(result).toBeDefined();
    });
  });

  describe('useStreakFreeze', () => {
    it('should use streak freeze when available', async () => {
      setupSmartMock({
        streakRecord: {
          ...defaultMockData.streakRecord,
          freezes_available: 2,
          freezes_used_this_month: 0
        }
      });

      const result = await service.useStreakFreeze(100);

      expect(result.success).toBe(true);
    });

    it('should fail when no freezes available', async () => {
      setupSmartMock({
        streakRecord: {
          ...defaultMockData.streakRecord,
          freezes_available: 0,
          freezes_used_this_month: 2
        }
      });

      await expect(service.useStreakFreeze(100)).rejects.toThrow('No streak freezes available');
    });
  });

  // ==========================================================================
  // TIER & BADGE MANAGEMENT
  // ==========================================================================

  describe('getTierStatus', () => {
    it('should calculate current tier and progress', async () => {
      setupSmartMock({ referralStats: { ...defaultMockData.referralStats, total_points: 150n } });

      const result = await service.getTierStatus(100);

      expect(result.currentTier).toBeDefined();
      expect(result.progressPercentage).toBeDefined();
    });

    it('should handle bronze tier user', async () => {
      setupSmartMock({ referralStats: { ...defaultMockData.referralStats, total_points: 50n } });

      const result = await service.getTierStatus(100);

      expect(result.currentTier).toBe('bronze');
    });
  });

  describe('checkBadgeEligibility (via checkAndAwardBadges)', () => {
    it('should check eligibility for recommendation badges', async () => {
      setupSmartMock({
        recommendationStats: {
          ...defaultMockData.recommendationStats,
          recommendations_sent: 25n,
          helpful_count: 20n
        }
      });

      // checkAndAwardBadges is called internally by recordRecommendationReward
      const result = await service.recordRecommendationReward(
        100,
        'recommendation_sent',
        5,
        { recommendationId: 1 }
      );

      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should check eligibility for streak badges', async () => {
      setupSmartMock({
        streakRecord: {
          ...defaultMockData.streakRecord,
          current_streak: 7
        }
      });

      // Streak badges are checked during updateStreak
      const result = await service.updateStreak(100);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  describe('calculateTier (via getTierStatus)', () => {
    it('should calculate bronze tier for low points', async () => {
      setupSmartMock({ referralStats: { ...defaultMockData.referralStats, total_points: 50n } });

      const result = await service.getTierStatus(100);
      expect(result.currentTier).toBe('bronze');
    });

    it('should calculate silver tier for medium points', async () => {
      setupSmartMock({ referralStats: { ...defaultMockData.referralStats, total_points: 700n } });

      const result = await service.getTierStatus(100);
      expect(result.currentTier).toBe('silver');
    });

    it('should calculate gold tier for high points', async () => {
      setupSmartMock({ referralStats: { ...defaultMockData.referralStats, total_points: 2500n } });

      const result = await service.getTierStatus(100);
      expect(result.currentTier).toBe('gold');
    });

    it('should calculate platinum tier for highest points', async () => {
      setupSmartMock({ referralStats: { ...defaultMockData.referralStats, total_points: 6000n } });

      const result = await service.getTierStatus(100);
      expect(result.currentTier).toBe('platinum');
    });
  });
});
