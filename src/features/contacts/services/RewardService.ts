/**
 * RewardService - Gamification & Rewards Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Service pattern: Feature-specific service in contacts feature
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 4
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 * @reference src/features/contacts/services/ReferralService.ts - Service pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { RowDataPacket } from '@core/types/mariadb-compat';
import type {
  Reward,
  Badge,
  BadgeWithStatus,
  LeaderboardEntry,
  RewardSummary,
  UnifiedRewardSummary,
  UnifiedSharingStats,
  LeaderboardFilters,
  RewardType,
  BadgeId,
  StreakStatus,
  TierStatus,
  Tier
} from '../types/reward';
import { BADGE_DEFINITIONS, TIER_DEFINITIONS } from '../types/reward';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class RewardService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // REWARD TRACKING
  // ==========================================================================

  /**
   * Record a reward event
   */
  async recordReward(
    userId: number,
    rewardType: RewardType,
    pointsEarned: number,
    options: {
      referralId?: number;
      badgeId?: string;
      milestoneType?: string;
      description?: string;
    } = {}
  ): Promise<Reward> {
    const query = `
      INSERT INTO user_rewards (
        user_id, reward_type, points_earned,
        badge_id, milestone_type, referral_id, description,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      userId,
      rewardType,
      pointsEarned,
      options.badgeId || null,
      options.milestoneType || null,
      options.referralId || null,
      options.description || null
    ];

    const result = await this.db.query(query, params);
    const insertId = bigIntToNumber(result.insertId);

    // Check for new badges after recording reward
    await this.checkAndAwardBadges(userId);

    return this.getRewardById(insertId);
  }

  /**
   * Record a recommendation reward event (Phase 5)
   */
  async recordRecommendationReward(
    userId: number,
    rewardType: 'recommendation_sent' | 'recommendation_helpful' | 'recommendation_thanked',
    pointsEarned: number,
    options: {
      recommendationId?: number;
      recipientUserId?: number;
      entityType?: string;
      entityId?: string;
    } = {}
  ): Promise<Reward> {
    const description = this.getRecommendationRewardDescription(rewardType, options);

    const query = `
      INSERT INTO user_rewards (
        user_id, reward_type, points_earned,
        referral_id, description, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      userId,
      rewardType,
      pointsEarned,
      options.recommendationId || null,
      description
    ];

    const result = await this.db.query(query, params);
    const insertId = bigIntToNumber(result.insertId);

    // Check for new recommendation badges
    await this.checkAndAwardBadges(userId);

    return this.getRewardById(insertId);
  }

  /**
   * Get reward by ID
   */
  private async getRewardById(rewardId: number): Promise<Reward> {
    const query = `SELECT * FROM user_rewards WHERE id = ?`;
    const result = await this.db.query<RowDataPacket>(query, [rewardId]);
    const rows = result.rows || [];

    if (rows.length === 0 || !rows[0]) {
      throw new BizError({
        code: 'REWARD_NOT_FOUND',
        message: `Reward not found: ${rewardId}`
      });
    }

    return this.mapRowToReward(rows[0]);
  }

  /**
   * Get recent rewards for a user
   */
  async getRecentRewards(userId: number, limit: number = 10): Promise<Reward[]> {
    const query = `
      SELECT * FROM user_rewards
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId, limit]);
    const rows = result.rows || [];

    return rows.map(row => this.mapRowToReward(row));
  }

  /**
   * Get total points for a user
   */
  async getTotalPoints(userId: number): Promise<number> {
    const query = `
      SELECT SUM(reward_points) as total_points
      FROM user_referrals
      WHERE referrer_user_id = ?
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const row = result.rows?.[0];

    return bigIntToNumber(row?.total_points) || 0;
  }

  /**
   * Get unified total points from both referrals and rewards (Phase 5)
   */
  async getUnifiedTotalPoints(userId: number): Promise<number> {
    // Points from referrals (stored in user_referrals.reward_points)
    const referralQuery = `
      SELECT COALESCE(SUM(reward_points), 0) as referral_points
      FROM user_referrals
      WHERE referrer_user_id = ?
    `;

    // Points from rewards table (includes recommendation points)
    const rewardQuery = `
      SELECT COALESCE(SUM(points_earned), 0) as reward_points
      FROM user_rewards
      WHERE user_id = ?
    `;

    const [referralResult, rewardResult] = await Promise.all([
      this.db.query<RowDataPacket>(referralQuery, [userId]),
      this.db.query<RowDataPacket>(rewardQuery, [userId])
    ]);

    const referralPoints = bigIntToNumber(referralResult.rows?.[0]?.referral_points) || 0;
    const rewardPoints = bigIntToNumber(rewardResult.rows?.[0]?.reward_points) || 0;

    return referralPoints + rewardPoints;
  }

  // ==========================================================================
  // BADGE MANAGEMENT
  // ==========================================================================

  /**
   * Get user's earned badges
   */
  async getUserBadges(userId: number): Promise<Badge[]> {
    const query = `
      SELECT * FROM user_badges
      WHERE user_id = ?
      ORDER BY earned_at DESC
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const rows = result.rows || [];

    return rows.map(row => this.mapRowToBadge(row));
  }

  /**
   * Get all badges with earned status for user
   */
  async getAllBadgesWithStatus(userId: number): Promise<BadgeWithStatus[]> {
    // Get user's earned badges
    const earnedBadges = await this.getUserBadges(userId);
    const earnedMap = new Map(earnedBadges.map(b => [b.badge_type, b]));

    // Get user's stats for progress
    const stats = await this.getUserStats(userId);

    // Map all badge definitions with earned status and progress
    return Object.values(BADGE_DEFINITIONS).map(def => {
      const earned = earnedMap.get(def.id);
      const progress = this.calculateBadgeProgress(def, stats);

      return {
        id: def.id,
        name: def.name,
        icon: def.icon,
        description: def.description,
        category: def.category,
        earned: !!earned,
        earned_at: earned?.earned_at || null,
        requirement: def.requirement,
        progress
      };
    });
  }

  /**
   * Award a badge to a user (if not already earned)
   */
  async awardBadge(userId: number, badgeId: BadgeId): Promise<Badge | null> {
    const definition = BADGE_DEFINITIONS[badgeId];
    if (!definition) {
      throw new BizError({
        code: 'INVALID_BADGE',
        message: `Invalid badge ID: ${badgeId}`
      });
    }

    // Check if already earned
    const existing = await this.db.query<RowDataPacket>(
      'SELECT id FROM user_badges WHERE user_id = ? AND badge_type = ?',
      [userId, badgeId]
    );

    if (existing.rows && existing.rows.length > 0) {
      return null; // Already earned
    }

    // Award the badge
    const query = `
      INSERT INTO user_badges (
        user_id, badge_type, badge_name, badge_icon,
        badge_description, badge_category, earned_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await this.db.query(query, [
      userId,
      definition.id,
      definition.name,
      definition.icon,
      definition.description,
      definition.category
    ]);

    const insertId = bigIntToNumber(result.insertId);

    // Record badge reward event
    await this.db.query(
      `INSERT INTO user_rewards (
        user_id, reward_type, points_earned, badge_id, description, created_at
      ) VALUES (?, 'badge_earned', 0, ?, ?, NOW())`,
      [userId, badgeId, `Earned badge: ${definition.name}`]
    );

    // Fetch and return the new badge
    const badgeResult = await this.db.query<RowDataPacket>(
      'SELECT * FROM user_badges WHERE id = ?',
      [insertId]
    );

    return badgeResult.rows?.[0] ? this.mapRowToBadge(badgeResult.rows[0]) : null;
  }

  /**
   * Check and award any eligible badges
   */
  async checkAndAwardBadges(userId: number): Promise<Badge[]> {
    const stats = await this.getUserStats(userId);
    const awardedBadges: Badge[] = [];

    // Debug logging
    console.log('[checkAndAwardBadges] Stats:', {
      userId,
      recommendations_sent: stats.recommendations_sent,
      listing_recommendations: stats.listing_recommendations,
      referrals_sent: stats.referrals_sent
    });

    // Check each badge definition
    for (const [badgeId, definition] of Object.entries(BADGE_DEFINITIONS)) {
      let isEligible = false;

      // Phase 8: Handle content_recs asynchronously
      if (definition.requirement.type === 'content_recs') {
        const contentTypes = (definition.requirement as any).content_types || [];
        const count = definition.requirement.count;
        const contentCount = await this.getContentRecommendationCount(userId, contentTypes);
        isEligible = contentCount >= count;
      } else {
        isEligible = this.checkBadgeEligibility(definition, stats);
      }

      // Debug: log first_recommendation check
      if (badgeId === 'first_recommendation') {
        console.log('[checkAndAwardBadges] first_recommendation:', {
          requirement: definition.requirement,
          stats_recommendations_sent: stats.recommendations_sent,
          isEligible
        });
      }

      if (isEligible) {
        const badge = await this.awardBadge(userId, badgeId as BadgeId);
        if (badge) {
          awardedBadges.push(badge);
        }
      }
    }

    return awardedBadges;
  }

  /**
   * Get next badge user is working towards
   */
  async getNextBadge(userId: number): Promise<BadgeWithStatus | null> {
    const allBadges = await this.getAllBadgesWithStatus(userId);

    // Find unearned badges sorted by progress percentage
    const unearned = allBadges
      .filter(b => !b.earned && b.progress)
      .sort((a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0));

    return unearned[0] || null;
  }

  // ==========================================================================
  // LEADERBOARD
  // ==========================================================================

  /**
   * Get leaderboard entries
   */
  async getLeaderboard(
    currentUserId: number,
    filters: LeaderboardFilters = {}
  ): Promise<LeaderboardEntry[]> {
    const limit = filters.limit || 10;
    let dateFilter = '';

    if (filters.period === 'this_month') {
      dateFilter = 'AND ur.created_at >= DATE_FORMAT(NOW(), "%Y-%m-01")';
    } else if (filters.period === 'this_week') {
      dateFilter = 'AND ur.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    const query = `
      SELECT
        u.id as user_id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.avatar_url,
        COALESCE(SUM(ur.reward_points), 0) as total_points,
        COUNT(ur.id) as total_referrals,
        SUM(CASE WHEN ur.status IN ('registered', 'connected') THEN 1 ELSE 0 END) as total_conversions,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges_earned
      FROM users u
      LEFT JOIN user_referrals ur ON ur.referrer_user_id = u.id ${dateFilter}
      WHERE EXISTS (SELECT 1 FROM user_referrals WHERE referrer_user_id = u.id)
      GROUP BY u.id, u.first_name, u.last_name, u.avatar_url
      ORDER BY total_points DESC
      LIMIT ?
    `;

    const result = await this.db.query<RowDataPacket>(query, [limit]);
    const rows = result.rows || [];

    return rows.map((row, index) => ({
      rank: index + 1,
      user_id: row.user_id,
      user_name: row.user_name || 'Anonymous',
      avatar_url: row.avatar_url,
      total_points: bigIntToNumber(row.total_points) || 0,
      total_referrals: bigIntToNumber(row.total_referrals) || 0,
      total_conversions: bigIntToNumber(row.total_conversions) || 0,
      badges_earned: bigIntToNumber(row.badges_earned) || 0,
      is_current_user: row.user_id === currentUserId,
      // Phase 6: Add missing fields for backward compatibility
      total_recommendations: 0,
      total_sharing: bigIntToNumber(row.total_referrals) || 0
    }));
  }

  /**
   * Get user's leaderboard rank
   */
  async getUserRank(userId: number): Promise<number> {
    // Unified rank: combines referral points (user_referrals.reward_points)
    // with recommendation points (user_rewards.points_earned)
    const query = `
      SELECT COUNT(*) + 1 as \`rank\`
      FROM (
        SELECT
          user_id,
          SUM(points) as total_points
        FROM (
          SELECT referrer_user_id as user_id, COALESCE(SUM(reward_points), 0) as points
          FROM user_referrals
          GROUP BY referrer_user_id
          UNION ALL
          SELECT user_id, COALESCE(SUM(points_earned), 0) as points
          FROM user_rewards
          GROUP BY user_id
        ) combined
        GROUP BY user_id
      ) as rankings
      WHERE total_points > (
        SELECT COALESCE(ref_pts, 0) + COALESCE(rec_pts, 0)
        FROM (
          SELECT
            (SELECT COALESCE(SUM(reward_points), 0) FROM user_referrals WHERE referrer_user_id = ?) as ref_pts,
            (SELECT COALESCE(SUM(points_earned), 0) FROM user_rewards WHERE user_id = ?) as rec_pts
        ) as my_points
      )
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId, userId]);
    return bigIntToNumber(result.rows?.[0]?.rank) || 1;
  }

  // ==========================================================================
  // REWARD SUMMARY
  // ==========================================================================

  /**
   * Get complete reward summary for user
   */
  async getRewardSummary(userId: number): Promise<RewardSummary> {
    const [
      totalPoints,
      badges,
      recentRewards,
      rank,
      nextBadge,
      stats
    ] = await Promise.all([
      this.getUnifiedTotalPoints(userId),
      this.getUserBadges(userId),
      this.getRecentRewards(userId, 5),
      this.getUserRank(userId),
      this.getNextBadge(userId),
      this.getUserStats(userId)
    ]);

    return {
      total_points: totalPoints,
      total_referrals_sent: stats.referrals_sent,
      total_conversions: stats.conversions,
      badges_earned: badges,
      recent_rewards: recentRewards,
      leaderboard_rank: rank,
      next_badge: nextBadge
    };
  }

  /**
   * Get unified reward summary with recommendation stats (Phase 5)
   */
  async getUnifiedRewardSummary(userId: number): Promise<UnifiedRewardSummary> {
    const [
      baseSummary,
      recommendationStats
    ] = await Promise.all([
      this.getRewardSummary(userId),
      this.getRecommendationStats(userId)
    ]);

    return {
      ...baseSummary,
      total_recommendations_sent: recommendationStats.recommendations_sent,
      total_helpful: recommendationStats.helpful_count,
      total_thank_yous: recommendationStats.thank_you_count,
      helpful_rate: recommendationStats.helpful_rate,
      recommendation_points: recommendationStats.recommendation_points
    };
  }

  /**
   * Get unified sharing stats for both systems (Phase 5)
   * Phase 6: Extended with entity-specific counts
   * Phase 8: Extended with content-specific counts
   */
  async getUnifiedSharingStats(userId: number): Promise<UnifiedSharingStats> {
    const [
      referralStats,
      recommendationStats,
      unifiedPoints,
      entityStats,
      contentStats
    ] = await Promise.all([
      this.getUserStats(userId),
      this.getRecommendationStats(userId),
      this.getUnifiedTotalPoints(userId),
      this.getEntityRecommendationStats(userId),
      this.getContentRecommendationStats(userId)
    ]);

    return {
      // Referral stats
      total_referrals_sent: referralStats.referrals_sent,
      total_conversions: referralStats.conversions,
      referral_points: referralStats.total_points,

      // Recommendation stats
      total_recommendations_sent: recommendationStats.recommendations_sent,
      total_helpful: recommendationStats.helpful_count,
      total_thank_yous: recommendationStats.thank_you_count,
      helpful_rate: recommendationStats.helpful_rate,
      recommendation_points: recommendationStats.recommendation_points,

      // Combined
      total_points: unifiedPoints,
      combined_activities: referralStats.referrals_sent + recommendationStats.recommendations_sent,

      // Phase 6: Entity-specific recommendation counts
      listing_recommendations: entityStats.listing,
      event_recommendations: entityStats.event,
      user_recommendations: entityStats.user,
      offer_recommendations: entityStats.offer,
      job_recommendations: entityStats.job,

      // Referral (platform invite) counts
      referral_count: entityStats.referral,

      // Phase 8: Content-specific recommendation counts
      article_recommendations: contentStats.article,
      newsletter_recommendations: contentStats.newsletter,
      podcast_recommendations: contentStats.podcast,
      video_recommendations: contentStats.video
    };
  }

  // ==========================================================================
  // PHASE 6: UNIFIED LEADERBOARD METHODS
  // ==========================================================================

  /**
   * Get unified leaderboard with both referral and recommendation points
   * Phase 6: Combines all sharing activities
   * TD-013: Optimized with 3 independent queries (eliminates N+1 pattern)
   */
  async getUnifiedLeaderboard(
    currentUserId: number,
    filters: LeaderboardFilters = {}
  ): Promise<LeaderboardEntry[]> {
    const limit = filters.limit || 10;

    // Build date filter SQL
    let dateFilter = '';
    if (filters.period === 'this_month') {
      dateFilter = 'AND created_at >= DATE_FORMAT(NOW(), "%Y-%m-01")';
    } else if (filters.period === 'this_week') {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    // Build category filter - PARAMETERIZED (preserve TD-001 fix)
    // Map 'referral' UI category to 'platform_invite' entity_type in DB
    const dbEntityType = filters.category === 'referral' ? 'platform_invite' : filters.category;
    const categoryCondition = filters.category && filters.category !== 'all'
      ? 'AND entity_type = ?'
      : '';
    const categoryParams = filters.category && filters.category !== 'all'
      ? [dbEntityType]
      : [];

    // QUERY 1: Get all user IDs with sharing activity + basic info
    const usersQuery = `
      SELECT DISTINCT
        u.id as user_id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.avatar_url
      FROM users u
      WHERE EXISTS (
        SELECT 1 FROM user_referrals WHERE referrer_user_id = u.id
        UNION
        SELECT 1 FROM user_rewards WHERE user_id = u.id AND reward_type LIKE 'recommendation_%'
      )
    `;
    const usersResult = await this.db.query<RowDataPacket>(usersQuery, []);
    const users = usersResult.rows || [];

    if (users.length === 0) {
      return [];
    }

    const userIds = users.map(u => u.user_id);

    // QUERY 2: Get all points in single query (grouped by user)
    const pointsQuery = `
      SELECT
        user_id,
        SUM(CASE WHEN source = 'referral' THEN points ELSE 0 END) as referral_points,
        SUM(CASE WHEN source = 'recommendation' THEN points ELSE 0 END) as recommendation_points
      FROM (
        SELECT
          referrer_user_id as user_id,
          reward_points as points,
          'referral' as source
        FROM user_referrals
        WHERE referrer_user_id IN (?) AND entity_type = 'platform_invite' ${dateFilter}
        UNION ALL
        SELECT
          user_id,
          points_earned as points,
          'recommendation' as source
        FROM user_rewards
        WHERE user_id IN (?) AND reward_type LIKE 'recommendation_%'
      ) combined
      GROUP BY user_id
    `;
    const pointsResult = await this.db.query<RowDataPacket>(pointsQuery, [userIds, userIds]);
    const pointsMap = new Map<number, { referral: number; recommendation: number }>();
    for (const row of pointsResult.rows || []) {
      pointsMap.set(row.user_id, {
        referral: bigIntToNumber(row.referral_points) || 0,
        recommendation: bigIntToNumber(row.recommendation_points) || 0
      });
    }

    // QUERY 3: Get all counts in single query (grouped by user)
    const countsQuery = `
      SELECT
        user_id,
        SUM(referral_count) as total_referrals,
        SUM(recommendation_count) as total_recommendations,
        SUM(conversion_count) as total_conversions,
        MAX(badge_count) as badges_earned
      FROM (
        SELECT
          referrer_user_id as user_id,
          COUNT(*) as referral_count,
          0 as recommendation_count,
          SUM(CASE WHEN status IN ('registered', 'connected') THEN 1 ELSE 0 END) as conversion_count,
          0 as badge_count
        FROM user_referrals
        WHERE referrer_user_id IN (?) AND entity_type = 'platform_invite' ${dateFilter}
        GROUP BY referrer_user_id

        UNION ALL

        SELECT
          referrer_user_id as user_id,
          0 as referral_count,
          COUNT(*) as recommendation_count,
          0 as conversion_count,
          0 as badge_count
        FROM user_referrals
        WHERE referrer_user_id IN (?) AND entity_type != 'platform_invite' ${categoryCondition} ${dateFilter}
        GROUP BY referrer_user_id

        UNION ALL

        SELECT
          user_id,
          0 as referral_count,
          0 as recommendation_count,
          0 as conversion_count,
          COUNT(*) as badge_count
        FROM user_badges
        WHERE user_id IN (?)
        GROUP BY user_id
      ) combined
      GROUP BY user_id
    `;
    const countsParams = [userIds, userIds, ...categoryParams, userIds];
    const countsResult = await this.db.query<RowDataPacket>(countsQuery, countsParams);
    const countsMap = new Map<number, {
      referrals: number;
      recommendations: number;
      conversions: number;
      badges: number;
    }>();
    for (const row of countsResult.rows || []) {
      countsMap.set(row.user_id, {
        referrals: bigIntToNumber(row.total_referrals) || 0,
        recommendations: bigIntToNumber(row.total_recommendations) || 0,
        conversions: bigIntToNumber(row.total_conversions) || 0,
        badges: bigIntToNumber(row.badges_earned) || 0
      });
    }

    // AGGREGATE: Merge results and sort
    const entries: LeaderboardEntry[] = users.map(user => {
      const points = pointsMap.get(user.user_id) || { referral: 0, recommendation: 0 };
      const counts = countsMap.get(user.user_id) || { referrals: 0, recommendations: 0, conversions: 0, badges: 0 };

      return {
        rank: 0, // Set after sorting
        user_id: user.user_id,
        user_name: user.user_name || 'Anonymous',
        avatar_url: user.avatar_url,
        total_points: points.referral + points.recommendation,
        total_referrals: counts.referrals,
        total_recommendations: counts.recommendations,
        total_sharing: counts.referrals + counts.recommendations,
        total_conversions: counts.conversions,
        badges_earned: counts.badges,
        is_current_user: user.user_id === currentUserId
      };
    });

    // Sort by total points descending
    entries.sort((a, b) => b.total_points - a.total_points);

    // Apply limit and set ranks
    return entries.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  /**
   * Get entity-specific recommendation counts for a user
   * Phase 6: Powers category badge eligibility
   */
  async getEntityRecommendationStats(userId: number): Promise<import('../types/reward').EntityRecommendationStats> {
    const query = `
      SELECT
        entity_type,
        COUNT(*) as count
      FROM user_referrals
      WHERE referrer_user_id = ?
      GROUP BY entity_type
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const rows = result.rows || [];

    const stats: Record<string, number> = {
      listing: 0,
      event: 0,
      user: 0,
      offer: 0,
      job: 0,
      referral: 0
    };

    let maxCategory = { type: 'listing', count: 0 };
    let total = 0;

    rows.forEach(row => {
      let entityType = row.entity_type as string;
      const count = bigIntToNumber(row.count) || 0;

      // Normalize job_posting to job for stats key
      if (entityType === 'job_posting') {
        entityType = 'job';
      }

      // Map platform_invite to referral for stats key
      if (entityType === 'platform_invite') {
        entityType = 'referral';
      }

      if (entityType in stats) {
        stats[entityType] = count;
        total += count;

        if (count > maxCategory.count) {
          maxCategory = { type: entityType, count };
        }
      }
    });

    return {
      listing: stats.listing || 0,
      event: stats.event || 0,
      user: stats.user || 0,
      offer: stats.offer || 0,
      job: stats.job || 0,
      referral: stats.referral || 0,
      total,
      max_category: maxCategory
    };
  }

  /**
   * Get content-specific recommendation counts for a user
   * Phase 8: Powers content category badge eligibility
   */
  async getContentRecommendationStats(userId: number): Promise<{
    article: number;
    newsletter: number;
    podcast: number;
    video: number;
    total: number;
  }> {
    const query = `
      SELECT
        entity_type,
        COUNT(*) as count
      FROM user_referrals
      WHERE referrer_user_id = ?
        AND entity_type IN ('article', 'newsletter', 'podcast', 'video')
      GROUP BY entity_type
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const rows = result.rows || [];

    const stats: Record<string, number> = {
      article: 0,
      newsletter: 0,
      podcast: 0,
      video: 0
    };

    let total = 0;

    rows.forEach(row => {
      const entityType = row.entity_type as string;
      const count = bigIntToNumber(row.count) || 0;

      if (entityType in stats) {
        stats[entityType] = count;
        total += count;
      }
    });

    return {
      article: stats.article || 0,
      newsletter: stats.newsletter || 0,
      podcast: stats.podcast || 0,
      video: stats.video || 0,
      total
    };
  }

  /**
   * Get unified user rank (Phase 6)
   */
  async getUnifiedUserRank(userId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) + 1 as rank
      FROM (
        SELECT
          u.id,
          COALESCE(
            (SELECT SUM(reward_points) FROM user_referrals
             WHERE referrer_user_id = u.id AND entity_type = 'platform_invite'),
            0
          ) + COALESCE(
            (SELECT SUM(points_earned) FROM user_rewards
             WHERE user_id = u.id AND reward_type LIKE 'recommendation_%'),
            0
          ) as total_points
        FROM users u
        WHERE EXISTS (
          SELECT 1 FROM user_referrals WHERE referrer_user_id = u.id
          UNION
          SELECT 1 FROM user_rewards WHERE user_id = u.id AND reward_type LIKE 'recommendation_%'
        )
      ) as rankings
      WHERE total_points > (
        SELECT
          COALESCE(
            (SELECT SUM(reward_points) FROM user_referrals
             WHERE referrer_user_id = ? AND entity_type = 'platform_invite'),
            0
          ) + COALESCE(
            (SELECT SUM(points_earned) FROM user_rewards
             WHERE user_id = ? AND reward_type LIKE 'recommendation_%'),
            0
          )
      )
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId, userId]);
    return bigIntToNumber(result.rows?.[0]?.rank) || 1;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get user's referral stats (includes recommendation data for badge eligibility)
   * Phase 6: Extended with entity-specific counts
   */
  private async getUserStats(userId: number): Promise<{
    referrals_sent: number;
    conversions: number;
    total_points: number;
    recommendations_sent: number;
    helpful_count: number;
    helpful_rate: number;
    listing_recommendations: number;
    event_recommendations: number;
    user_recommendations: number;
    offer_recommendations: number;
    job_recommendations: number;
    referral_recommendations: number;
    max_category_count: number;
    current_streak?: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as referrals_sent,
        SUM(CASE WHEN status IN ('registered', 'connected') THEN 1 ELSE 0 END) as conversions,
        SUM(reward_points) as total_points
      FROM user_referrals
      WHERE referrer_user_id = ? AND entity_type = 'platform_invite'
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const row = result.rows?.[0] || {};

    // Get recommendation stats for unified badge checking
    const recStats = await this.getRecommendationStats(userId);

    // Phase 6: Get entity-specific recommendation counts
    const entityStats = await this.getEntityRecommendationStats(userId);

    // Phase 7: Get current streak
    const streakQuery = `SELECT current_streak FROM user_sharing_streaks WHERE user_id = ?`;
    const streakResult = await this.db.query<RowDataPacket>(streakQuery, [userId]);
    const streakRows = streakResult.rows || [];
    const currentStreak = streakRows.length > 0 && streakRows[0] ? streakRows[0].current_streak : 0;

    return {
      referrals_sent: bigIntToNumber(row.referrals_sent) || 0,
      conversions: bigIntToNumber(row.conversions) || 0,
      total_points: bigIntToNumber(row.total_points) || 0,
      recommendations_sent: recStats.recommendations_sent,
      helpful_count: recStats.helpful_count,
      helpful_rate: recStats.helpful_rate,
      // Phase 6: Entity-specific counts (explicitly typed as number)
      listing_recommendations: entityStats.listing || 0,
      event_recommendations: entityStats.event || 0,
      user_recommendations: entityStats.user || 0,
      offer_recommendations: entityStats.offer || 0,
      job_recommendations: entityStats.job || 0,
      referral_recommendations: entityStats.referral || 0,
      max_category_count: entityStats.max_category.count || 0,
      // Phase 7: Streak data
      current_streak: currentStreak
    };
  }

  /**
   * Get recommendation stats (Phase 5)
   */
  private async getRecommendationStats(userId: number): Promise<{
    recommendations_sent: number;
    helpful_count: number;
    thank_you_count: number;
    helpful_rate: number;
    recommendation_points: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as recommendations_sent,
        SUM(CASE WHEN is_helpful = TRUE THEN 1 ELSE 0 END) as helpful_count,
        SUM(CASE WHEN thanked_at IS NOT NULL THEN 1 ELSE 0 END) as thank_you_count,
        SUM(CASE WHEN is_helpful IS NOT NULL THEN 1 ELSE 0 END) as total_rated
      FROM user_referrals
      WHERE referrer_user_id = ?
        AND entity_type != 'platform_invite'
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const row = result.rows?.[0] || {};

    const recommendationsSent = bigIntToNumber(row.recommendations_sent) || 0;
    const helpfulCount = bigIntToNumber(row.helpful_count) || 0;
    const thankYouCount = bigIntToNumber(row.thank_you_count) || 0;
    const totalRated = bigIntToNumber(row.total_rated) || 0;

    const helpfulRate = totalRated > 0 ? Math.round((helpfulCount / totalRated) * 100) : 0;

    // Get recommendation points from user_rewards
    const recommendationPoints = await this.getRecommendationPoints(userId);

    return {
      recommendations_sent: recommendationsSent,
      helpful_count: helpfulCount,
      thank_you_count: thankYouCount,
      helpful_rate: helpfulRate,
      recommendation_points: recommendationPoints
    };
  }

  /**
   * Get total points earned from recommendations (Phase 5)
   */
  private async getRecommendationPoints(userId: number): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(points_earned), 0) as recommendation_points
      FROM user_rewards
      WHERE user_id = ?
        AND reward_type IN (
          'recommendation_sent',
          'recommendation_viewed',
          'recommendation_saved',
          'recommendation_helpful',
          'recommendation_thanked'
        )
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    return bigIntToNumber(result.rows?.[0]?.recommendation_points) || 0;
  }

  /**
   * Get description for recommendation reward (Phase 5)
   */
  private getRecommendationRewardDescription(
    rewardType: 'recommendation_sent' | 'recommendation_helpful' | 'recommendation_thanked',
    options: {
      recipientUserId?: number;
      entityType?: string;
      entityId?: string;
    }
  ): string {
    const entityTypeMap: Record<string, string> = {
      'user': 'user',
      'listing': 'listing',
      'event': 'event',
      'offer': 'offer',
      'product': 'product',
      'service': 'service'
    };

    const entityLabel = entityTypeMap[options.entityType || ''] || 'content';

    switch (rewardType) {
      case 'recommendation_sent':
        return `Recommended a ${entityLabel}`;
      case 'recommendation_helpful':
        return `Recommendation marked helpful`;
      case 'recommendation_thanked':
        return `Received thank you for recommendation`;
      default:
        return 'Recommendation reward';
    }
  }

  /**
   * Check if user is eligible for a badge (updated for Phase 6)
   */
  private checkBadgeEligibility(
    definition: typeof BADGE_DEFINITIONS[keyof typeof BADGE_DEFINITIONS],
    stats: {
      referrals_sent: number;
      conversions: number;
      total_points: number;
      recommendations_sent?: number;
      helpful_count?: number;
      helpful_rate?: number;
      listing_recommendations?: number;
      event_recommendations?: number;
      user_recommendations?: number;
      offer_recommendations?: number;
      job_recommendations?: number;
      referral_recommendations?: number;
      max_category_count?: number;
      current_streak?: number;
    }
  ): boolean {
    const { type, count } = definition.requirement;

    switch (type) {
      case 'referrals_sent':
        return stats.referrals_sent >= count;
      case 'conversions':
        return stats.conversions >= count;
      case 'points':
        return stats.total_points >= count;
      case 'recommendations_sent':
        return (stats.recommendations_sent || 0) >= count;
      case 'helpful_count':
        return (stats.helpful_count || 0) >= count;
      case 'helpful_rate':
        // Requires at least 10 recommendations and 90%+ helpful rate
        return (stats.recommendations_sent || 0) >= 10 && (stats.helpful_rate || 0) >= count;
      // Phase 6: Entity-specific badge eligibility
      case 'listing_recommendations':
        return (stats.listing_recommendations || 0) >= count;
      case 'event_recommendations':
        return (stats.event_recommendations || 0) >= count;
      case 'user_recommendations':
        return (stats.user_recommendations || 0) >= count;
      case 'offer_recommendations':
        return (stats.offer_recommendations || 0) >= count;
      case 'job_recommendations':
        return (stats.job_recommendations || 0) >= count;
      case 'referral_recommendations':
        return (stats.referral_recommendations || 0) >= count;
      case 'any_category_recommendations':
        return (stats.max_category_count || 0) >= count;
      case 'high_quality_rate':
        // 20+ recs with 95%+ helpful rate
        return (stats.recommendations_sent || 0) >= 20 && (stats.helpful_rate || 0) >= count;
      case 'gold_quality_rate':
        // 50+ recs with 90%+ helpful rate
        return (stats.recommendations_sent || 0) >= 50 && (stats.helpful_rate || 0) >= count;
      // Phase 7: Streak badge eligibility
      case 'streak_weeks':
        return (stats.current_streak || 0) >= count;
      // Phase 8: Content recommendation badge eligibility
      case 'content_recs':
        // Note: This is checked asynchronously in checkAndAwardBadges
        // This sync check is a fallback
        return false;
      default:
        return false;
    }
  }

  /**
   * Get content recommendation count by types
   * Phase 8: Content badge eligibility
   */
  private async getContentRecommendationCount(
    userId: number,
    contentTypes: string[]
  ): Promise<number> {
    const placeholders = contentTypes.map(() => '?').join(', ');
    const query = `
      SELECT COUNT(*) AS total
      FROM user_referrals
      WHERE referrer_user_id = ?
        AND entity_type IN (${placeholders})
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId, ...contentTypes]);
    return bigIntToNumber(result.rows?.[0]?.total || 0);
  }

  /**
   * Calculate badge progress (updated for Phase 6)
   *
   * For compound requirement badges (rate + minRecs), shows recommendation
   * count progress until minRecs is met, then shows rate progress.
   */
  private calculateBadgeProgress(
    definition: typeof BADGE_DEFINITIONS[keyof typeof BADGE_DEFINITIONS],
    stats: {
      referrals_sent: number;
      conversions: number;
      total_points: number;
      recommendations_sent?: number;
      helpful_count?: number;
      helpful_rate?: number;
      listing_recommendations?: number;
      event_recommendations?: number;
      user_recommendations?: number;
      offer_recommendations?: number;
      job_recommendations?: number;
      referral_recommendations?: number;
      max_category_count?: number;
    }
  ): { current: number; target: number; percentage: number } {
    const { type, count } = definition.requirement;
    let current = 0;
    let target: number = count;

    switch (type) {
      case 'referrals_sent':
        current = stats.referrals_sent;
        break;
      case 'conversions':
        current = stats.conversions;
        break;
      case 'points':
        current = stats.total_points;
        break;
      case 'recommendations_sent':
        current = stats.recommendations_sent || 0;
        break;
      case 'helpful_count':
        current = stats.helpful_count || 0;
        break;
      case 'helpful_rate': {
        // Quality Curator: 90%+ rate with 10+ recommendations
        // Show recommendation progress until 10 recs met, then rate progress
        const minRecs = 10;
        const recCount = stats.recommendations_sent || 0;
        if (recCount < minRecs) {
          // Show recommendation count progress first
          current = recCount;
          target = minRecs;
        } else {
          // Recommendation count met, show rate progress (capped to target)
          current = Math.min(stats.helpful_rate || 0, count);
          target = count;
        }
        break;
      }
      // Phase 6: Entity-specific progress
      case 'listing_recommendations':
        current = stats.listing_recommendations || 0;
        break;
      case 'event_recommendations':
        current = stats.event_recommendations || 0;
        break;
      case 'user_recommendations':
        current = stats.user_recommendations || 0;
        break;
      case 'offer_recommendations':
        current = stats.offer_recommendations || 0;
        break;
      case 'job_recommendations':
        current = stats.job_recommendations || 0;
        break;
      case 'referral_recommendations':
        current = stats.referral_recommendations || 0;
        break;
      case 'any_category_recommendations':
        current = stats.max_category_count || 0;
        break;
      case 'high_quality_rate': {
        // Trusted Voice: 95%+ rate with 20+ recommendations
        // Show recommendation progress until minRecs met
        const minRecs = (definition.requirement as { minRecs?: number }).minRecs || 20;
        const recCount = stats.recommendations_sent || 0;
        if (recCount < minRecs) {
          current = recCount;
          target = minRecs;
        } else {
          current = Math.min(stats.helpful_rate || 0, count);
          target = count;
        }
        break;
      }
      case 'gold_quality_rate': {
        // Gold Standard: 90%+ rate with 50+ recommendations
        // Show recommendation progress until minRecs met
        const minRecs = (definition.requirement as { minRecs?: number }).minRecs || 50;
        const recCount = stats.recommendations_sent || 0;
        if (recCount < minRecs) {
          current = recCount;
          target = minRecs;
        } else {
          current = Math.min(stats.helpful_rate || 0, count);
          target = count;
        }
        break;
      }
    }

    return {
      current,
      target,
      percentage: Math.min(100, Math.round((current / target) * 100))
    };
  }

  /**
   * Map database row to Reward
   */
  private mapRowToReward(row: RowDataPacket): Reward {
    return {
      id: row.id,
      user_id: row.user_id,
      reward_type: row.reward_type,
      points_earned: row.points_earned,
      badge_id: row.badge_id,
      milestone_type: row.milestone_type,
      referral_id: row.referral_id,
      description: row.description,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Map database row to Badge
   */
  private mapRowToBadge(row: RowDataPacket): Badge {
    return {
      id: row.id,
      user_id: row.user_id,
      badge_type: row.badge_type,
      badge_name: row.badge_name,
      badge_icon: row.badge_icon,
      badge_description: row.badge_description,
      badge_category: row.badge_category,
      earned_at: new Date(row.earned_at)
    };
  }

  // ==========================================================================
  // PHASE 7: STREAKS & TIER PROGRESSION
  // ==========================================================================

  /**
   * Get or create streak record for user
   */
  private async getOrCreateStreakRecord(userId: number): Promise<RowDataPacket> {
    // Try to get existing record
    const query = `
      SELECT * FROM user_sharing_streaks
      WHERE user_id = ?
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const rows = result.rows || [];

    if (rows.length > 0 && rows[0]) {
      return rows[0];
    }

    // Create new record
    const insertQuery = `
      INSERT INTO user_sharing_streaks (
        user_id, current_streak, longest_streak,
        freezes_available, freezes_used_this_month,
        freeze_reset_at, bonus_multiplier,
        created_at, updated_at
      ) VALUES (?, 0, 0, 1, 0, DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), 1.00, NOW(), NOW())
    `;

    await this.db.query(insertQuery, [userId]);

    const newResult = await this.db.query<RowDataPacket>(query, [userId]);
    const newRows = newResult.rows || [];
    if (!newRows[0]) {
      throw new BizError({
        code: 'STREAK_RECORD_CREATE_FAILED',
        message: 'Failed to create streak record'
      });
    }
    return newRows[0];
  }

  /**
   * Check if freeze counts need to be reset (monthly)
   */
  private async checkFreezeReset(userId: number): Promise<void> {
    const query = `
      UPDATE user_sharing_streaks
      SET
        freezes_used_this_month = 0,
        freeze_reset_at = DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH),
        updated_at = NOW()
      WHERE user_id = ? AND freeze_reset_at <= CURRENT_DATE
    `;

    await this.db.query(query, [userId]);
  }

  /**
   * Get current ISO week string (YYYY-Www format)
   */
  private getCurrentISOWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);

    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get previous ISO week string
   */
  private getPreviousISOWeek(currentWeek: string): string {
    const parts = currentWeek.split('-W');
    const yearStr = parts[0];
    const weekStr = parts[1];

    if (!yearStr || !weekStr) {
      throw new BizError({
        code: 'INVALID_WEEK_FORMAT',
        message: 'Invalid ISO week format'
      });
    }

    const year = parseInt(yearStr, 10);
    let week = parseInt(weekStr, 10) - 1;

    if (week < 1) {
      return `${year - 1}-W52`;
    }

    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get streak bonus multiplier based on current streak length
   */
  private getStreakBonusMultiplier(streakWeeks: number): number {
    if (streakWeeks >= 52) return 2.00;
    if (streakWeeks >= 8) return 1.50;
    if (streakWeeks >= 4) return 1.25;
    if (streakWeeks >= 2) return 1.10;
    return 1.00;
  }

  /**
   * Get next streak bonus milestone
   */
  private getNextStreakBonus(currentStreak: number): { weeks: number; multiplier: number } | null {
    const bonuses = [
      { weeks: 2, multiplier: 1.10 },
      { weeks: 4, multiplier: 1.25 },
      { weeks: 8, multiplier: 1.50 },
      { weeks: 52, multiplier: 2.00 }
    ];

    for (const bonus of bonuses) {
      if (currentStreak < bonus.weeks) {
        return bonus;
      }
    }

    return null;
  }

  /**
   * Get streak status for a user
   */
  async getStreakStatus(userId: number): Promise<StreakStatus> {
    await this.checkFreezeReset(userId);
    const record = await this.getOrCreateStreakRecord(userId);

    const now = new Date();
    const freezeResetDate = new Date(record.freeze_reset_at);
    const daysUntilReset = Math.ceil((freezeResetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      currentStreak: record.current_streak,
      longestStreak: record.longest_streak,
      streakStartDate: record.streak_start_date ? new Date(record.streak_start_date) : null,
      lastActivityDate: record.last_activity_date ? new Date(record.last_activity_date) : null,
      lastActivityWeek: record.last_activity_week,
      freezesAvailable: record.freezes_available,
      freezesUsedThisMonth: record.freezes_used_this_month,
      lastFreezeUsedAt: record.last_freeze_used_at ? new Date(record.last_freeze_used_at) : null,
      freezeResetAt: new Date(record.freeze_reset_at),
      bonusMultiplier: parseFloat(record.bonus_multiplier),
      daysUntilReset,
      nextStreakBonus: this.getNextStreakBonus(record.current_streak)
    };
  }

  /**
   * Update streak after recommendation activity
   */
  async updateStreak(userId: number): Promise<StreakStatus> {
    await this.checkFreezeReset(userId);

    const record = await this.getOrCreateStreakRecord(userId);
    const currentWeek = this.getCurrentISOWeek();

    // If activity already recorded this week, no update needed
    if (record.last_activity_week === currentWeek) {
      return this.getStreakStatus(userId);
    }

    const previousWeek = this.getPreviousISOWeek(currentWeek);
    const isConsecutive = record.last_activity_week === previousWeek;

    let newStreak: number;
    let streakStartDate: Date | null;

    if (isConsecutive) {
      // Continue streak
      newStreak = record.current_streak + 1;
      streakStartDate = record.streak_start_date ? new Date(record.streak_start_date) : new Date();
    } else {
      // Reset streak (unless frozen)
      newStreak = 1;
      streakStartDate = new Date();
    }

    const longestStreak = Math.max(newStreak, record.longest_streak);
    const bonusMultiplier = this.getStreakBonusMultiplier(newStreak);

    const updateQuery = `
      UPDATE user_sharing_streaks
      SET
        current_streak = ?,
        longest_streak = ?,
        streak_start_date = ?,
        last_activity_date = CURRENT_DATE,
        last_activity_week = ?,
        bonus_multiplier = ?,
        updated_at = NOW()
      WHERE user_id = ?
    `;

    const formattedStartDate = streakStartDate ? streakStartDate.toISOString().split('T')[0] : null;

    await this.db.query(updateQuery, [
      newStreak,
      longestStreak,
      formattedStartDate,
      currentWeek,
      bonusMultiplier,
      userId
    ]);

    // Check for streak badges
    await this.checkStreakBadges(userId, newStreak);

    return this.getStreakStatus(userId);
  }

  /**
   * Use a streak freeze to protect current streak
   */
  async useStreakFreeze(userId: number): Promise<{ success: boolean; message: string }> {
    await this.checkFreezeReset(userId);

    const record = await this.getOrCreateStreakRecord(userId);

    // Check if user has freezes available
    if (record.freezes_available <= 0) {
      throw new BizError({
        code: 'NO_FREEZES_AVAILABLE',
        message: 'No streak freezes available'
      });
    }

    // Get user's tier to determine freeze limit (using unified points)
    const totalPoints = await this.getUnifiedTotalPoints(userId);
    const tier = this.calculateTierFromPoints(totalPoints);
    const tierInfo = TIER_DEFINITIONS[tier];

    // Check if user has exceeded monthly freeze limit
    if (record.freezes_used_this_month >= tierInfo.freezesPerMonth) {
      throw new BizError({
        code: 'FREEZE_LIMIT_REACHED',
        message: 'Monthly freeze limit reached for your tier'
      });
    }

    // Use freeze
    const updateQuery = `
      UPDATE user_sharing_streaks
      SET
        freezes_used_this_month = freezes_used_this_month + 1,
        freezes_available = freezes_available - 1,
        last_freeze_used_at = NOW(),
        updated_at = NOW()
      WHERE user_id = ?
    `;

    await this.db.query(updateQuery, [userId]);

    return {
      success: true,
      message: `Streak freeze activated! You have ${record.freezes_available - 1} freezes remaining.`
    };
  }

  /**
   * Calculate user tier from total points
   */
  private calculateTierFromPoints(points: number): Tier {
    if (points >= 5000) return 'platinum';
    if (points >= 2000) return 'gold';
    if (points >= 500) return 'silver';
    return 'bronze';
  }

  /**
   * Get tier status for a user
   */
  async getTierStatus(userId: number): Promise<TierStatus> {
    // Use unified total points (referrals + recommendations) for tier calculation
    const totalPoints = await this.getUnifiedTotalPoints(userId);
    const currentTier = this.calculateTierFromPoints(totalPoints);
    const tierInfo = TIER_DEFINITIONS[currentTier];

    // Determine next tier
    const tiers: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];
    const currentTierIndex = tiers.indexOf(currentTier);
    const nextTierCandidate = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : undefined;
    const nextTier: Tier | null = nextTierCandidate || null;
    const nextTierInfo = nextTier ? TIER_DEFINITIONS[nextTier] : null;

    const pointsToNextTier = nextTierInfo ? nextTierInfo.pointsRequired - totalPoints : null;
    const progressPercentage = nextTierInfo
      ? Math.min(100, Math.round((totalPoints / nextTierInfo.pointsRequired) * 100))
      : 100;

    return {
      currentTier,
      tierInfo,
      points: totalPoints,
      nextTier,
      nextTierInfo,
      pointsToNextTier,
      progressPercentage
    };
  }

  /**
   * Check and award streak badges
   */
  private async checkStreakBadges(userId: number, currentStreak: number): Promise<void> {
    const streakBadges = [
      { badgeId: 'streak_4_weeks', weeks: 4 },
      { badgeId: 'streak_12_weeks', weeks: 12 },
      { badgeId: 'streak_26_weeks', weeks: 26 },
      { badgeId: 'streak_52_weeks', weeks: 52 }
    ];

    for (const { badgeId, weeks } of streakBadges) {
      if (currentStreak >= weeks) {
        const hashedQuery = `
          SELECT COUNT(*) as count
          FROM user_badges
          WHERE user_id = ? AND badge_type = ?
        `;

        const result = await this.db.query<RowDataPacket>(hashedQuery, [userId, badgeId]);
        const rows = result.rows || [];
        const count = rows.length > 0 && rows[0] ? bigIntToNumber(rows[0].count) : 0;

        if (count === 0) {
          await this.awardBadge(userId, badgeId as BadgeId);
        }
      }
    }
  }
}
