/**
 * Reward & Gamification Types
 * Phase 4 - Referral Gamification & Rewards
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 4
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Types of reward events
 */
export type RewardType =
  | 'referral_sent'
  | 'referral_registered'
  | 'referral_connected'
  | 'badge_earned'
  | 'milestone_reached'
  | 'recommendation_sent'
  | 'recommendation_viewed'
  | 'recommendation_saved'
  | 'recommendation_helpful'
  | 'recommendation_thanked'
  | 'review_submitted'
  | 'review_approved'
  | 'review_helpful';

/**
 * Badge categories
 * Phase 6: Added category_expert
 * Phase 7: Added streak
 * Phase 8: Added content
 */
export type BadgeCategory =
  | 'referral'        // Based on referrals sent
  | 'conversion'      // Based on successful conversions
  | 'points'          // Based on points earned
  | 'special'         // Special achievements
  | 'recommendation'  // Based on recommendations sent
  | 'quality'         // Based on recommendation quality
  | 'category_expert' // Phase 6: Entity-specific expertise badges
  | 'streak'          // Phase 7: Based on consecutive weeks of activity
  | 'content'         // Phase 8: Content sharing badges
  | 'review';         // Review activity badges

/**
 * Badge definitions - all available badges
 */
export const BADGE_DEFINITIONS = {
  // Referral count badges
  first_referral: {
    id: 'first_referral',
    name: 'First Steps',
    icon: '🌱',
    description: 'Sent your first referral',
    category: 'referral' as BadgeCategory,
    requirement: { type: 'referrals_sent', count: 1 }
  },
  referral_5: {
    id: 'referral_5',
    name: 'Growing Network',
    icon: '🌿',
    description: 'Sent 5 referrals',
    category: 'referral' as BadgeCategory,
    requirement: { type: 'referrals_sent', count: 5 }
  },
  referral_10: {
    id: 'referral_10',
    name: 'Connector',
    icon: '🔗',
    description: 'Sent 10 referrals',
    category: 'referral' as BadgeCategory,
    requirement: { type: 'referrals_sent', count: 10 }
  },
  referral_25: {
    id: 'referral_25',
    name: 'Network Builder',
    icon: '🏗️',
    description: 'Sent 25 referrals',
    category: 'referral' as BadgeCategory,
    requirement: { type: 'referrals_sent', count: 25 }
  },
  referral_50: {
    id: 'referral_50',
    name: 'Super Connector',
    icon: '⭐',
    description: 'Sent 50 referrals',
    category: 'referral' as BadgeCategory,
    requirement: { type: 'referrals_sent', count: 50 }
  },
  referral_100: {
    id: 'referral_100',
    name: 'Ambassador',
    icon: '👑',
    description: 'Sent 100 referrals',
    category: 'referral' as BadgeCategory,
    requirement: { type: 'referrals_sent', count: 100 }
  },
  // Conversion badges
  conversion_1: {
    id: 'conversion_1',
    name: 'First Convert',
    icon: '🎯',
    description: 'Had your first referral sign up',
    category: 'conversion' as BadgeCategory,
    requirement: { type: 'conversions', count: 1 }
  },
  conversion_5: {
    id: 'conversion_5',
    name: 'Influencer',
    icon: '💫',
    description: '5 of your referrals have signed up',
    category: 'conversion' as BadgeCategory,
    requirement: { type: 'conversions', count: 5 }
  },
  conversion_10: {
    id: 'conversion_10',
    name: 'Trusted Voice',
    icon: '🎤',
    description: '10 of your referrals have signed up',
    category: 'conversion' as BadgeCategory,
    requirement: { type: 'conversions', count: 10 }
  },
  // Points badges
  points_100: {
    id: 'points_100',
    name: 'Century Club',
    icon: '💯',
    description: 'Earned 100 points',
    category: 'points' as BadgeCategory,
    requirement: { type: 'points', count: 100 }
  },
  points_500: {
    id: 'points_500',
    name: 'Rising Star',
    icon: '🌟',
    description: 'Earned 500 points',
    category: 'points' as BadgeCategory,
    requirement: { type: 'points', count: 500 }
  },
  points_1000: {
    id: 'points_1000',
    name: 'Elite Referrer',
    icon: '🏆',
    description: 'Earned 1000 points',
    category: 'points' as BadgeCategory,
    requirement: { type: 'points', count: 1000 }
  },
  // Recommendation count badges
  first_recommendation: {
    id: 'first_recommendation',
    name: 'First Share',
    icon: '📤',
    description: 'Sent your first recommendation',
    category: 'recommendation' as BadgeCategory,
    requirement: { type: 'recommendations_sent', count: 1 }
  },
  recommendation_5: {
    id: 'recommendation_5',
    name: 'Sharing is Caring',
    icon: '🤝',
    description: 'Sent 5 recommendations',
    category: 'recommendation' as BadgeCategory,
    requirement: { type: 'recommendations_sent', count: 5 }
  },
  recommendation_10: {
    id: 'recommendation_10',
    name: 'Recommendation Pro',
    icon: '💫',
    description: 'Sent 10 recommendations',
    category: 'recommendation' as BadgeCategory,
    requirement: { type: 'recommendations_sent', count: 10 }
  },
  recommendation_25: {
    id: 'recommendation_25',
    name: 'Trusted Advisor',
    icon: '🎯',
    description: 'Sent 25 recommendations',
    category: 'recommendation' as BadgeCategory,
    requirement: { type: 'recommendations_sent', count: 25 }
  },
  // Quality badges
  quality_first: {
    id: 'quality_first',
    name: 'Quality Curator',
    icon: '⭐',
    description: '90%+ helpful rate with 10+ recommendations',
    category: 'quality' as BadgeCategory,
    requirement: { type: 'helpful_rate', count: 90 }
  },
  helpful_hero: {
    id: 'helpful_hero',
    name: 'Helpful Hero',
    icon: '🦸',
    description: '50 helpful ratings received',
    category: 'quality' as BadgeCategory,
    requirement: { type: 'helpful_count', count: 50 }
  },
  // Phase 6: Entity-specific category expert badges (4-tier progression)
  // Listing Badges (4 tiers)
  listing_expert_10: {
    id: 'listing_expert_10',
    name: 'Listing Expert',
    icon: '📍',
    description: '10+ listing recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'listing_recommendations', count: 10 }
  },
  listing_pro_25: {
    id: 'listing_pro_25',
    name: 'Listing Pro',
    icon: '🏢',
    description: '25+ listing recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'listing_recommendations', count: 25 }
  },
  listing_master_50: {
    id: 'listing_master_50',
    name: 'Listing Master',
    icon: '🌟',
    description: '50+ listing recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'listing_recommendations', count: 50 }
  },
  listing_ambassador_100: {
    id: 'listing_ambassador_100',
    name: 'Listing Ambassador',
    icon: '👑',
    description: '100+ listing recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'listing_recommendations', count: 100 }
  },
  // Event Badges (4 tiers)
  event_scout_10: {
    id: 'event_scout_10',
    name: 'Event Scout',
    icon: '📅',
    description: '10+ event recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'event_recommendations', count: 10 }
  },
  event_pro_25: {
    id: 'event_pro_25',
    name: 'Event Pro',
    icon: '🎪',
    description: '25+ event recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'event_recommendations', count: 25 }
  },
  event_master_50: {
    id: 'event_master_50',
    name: 'Event Master',
    icon: '⭐',
    description: '50+ event recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'event_recommendations', count: 50 }
  },
  event_ambassador_100: {
    id: 'event_ambassador_100',
    name: 'Event Ambassador',
    icon: '👑',
    description: '100+ event recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'event_recommendations', count: 100 }
  },
  // User Badges (4 tiers)
  user_advocate_10: {
    id: 'user_advocate_10',
    name: 'User Advocate',
    icon: '👤',
    description: '10+ user recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'user_recommendations', count: 10 }
  },
  user_pro_25: {
    id: 'user_pro_25',
    name: 'User Pro',
    icon: '🤝',
    description: '25+ user recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'user_recommendations', count: 25 }
  },
  user_master_50: {
    id: 'user_master_50',
    name: 'User Master',
    icon: '💫',
    description: '50+ user recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'user_recommendations', count: 50 }
  },
  user_ambassador_100: {
    id: 'user_ambassador_100',
    name: 'User Ambassador',
    icon: '👑',
    description: '100+ user recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'user_recommendations', count: 100 }
  },
  // Offer Badges (4 tiers)
  offer_finder_10: {
    id: 'offer_finder_10',
    name: 'Offer Finder',
    icon: '🏷️',
    description: '10+ offer recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'offer_recommendations', count: 10 }
  },
  offer_pro_25: {
    id: 'offer_pro_25',
    name: 'Offer Pro',
    icon: '💰',
    description: '25+ offer recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'offer_recommendations', count: 25 }
  },
  offer_master_50: {
    id: 'offer_master_50',
    name: 'Offer Master',
    icon: '🎯',
    description: '50+ offer recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'offer_recommendations', count: 50 }
  },
  offer_ambassador_100: {
    id: 'offer_ambassador_100',
    name: 'Offer Ambassador',
    icon: '👑',
    description: '100+ offer recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'offer_recommendations', count: 100 }
  },
  // Job Badges (4 tiers)
  job_scout_10: {
    id: 'job_scout_10',
    name: 'Job Scout',
    icon: '💼',
    description: '10+ job recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'job_recommendations', count: 10 }
  },
  job_pro_25: {
    id: 'job_pro_25',
    name: 'Job Pro',
    icon: '📋',
    description: '25+ job recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'job_recommendations', count: 25 }
  },
  job_master_50: {
    id: 'job_master_50',
    name: 'Job Master',
    icon: '🚀',
    description: '50+ job recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'job_recommendations', count: 50 }
  },
  job_ambassador_100: {
    id: 'job_ambassador_100',
    name: 'Job Ambassador',
    icon: '👑',
    description: '100+ job recommendations',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'job_recommendations', count: 100 }
  },
  // Referral Badges (4 tiers)
  referral_expert_10: {
    id: 'referral_expert_10',
    name: 'Referral Expert',
    icon: '📨',
    description: '10+ platform referrals sent',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'referral_recommendations', count: 10 }
  },
  referral_pro_25: {
    id: 'referral_pro_25',
    name: 'Referral Pro',
    icon: '📬',
    description: '25+ platform referrals sent',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'referral_recommendations', count: 25 }
  },
  referral_master_50: {
    id: 'referral_master_50',
    name: 'Referral Master',
    icon: '🌟',
    description: '50+ platform referrals sent',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'referral_recommendations', count: 50 }
  },
  referral_ambassador_100: {
    id: 'referral_ambassador_100',
    name: 'Referral Ambassador',
    icon: '👑',
    description: '100+ platform referrals sent',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'referral_recommendations', count: 100 }
  },
  category_master_25: {
    id: 'category_master_25',
    name: 'Category Master',
    icon: '🏆',
    description: '25+ recommendations in any category',
    category: 'category_expert' as BadgeCategory,
    requirement: { type: 'any_category_recommendations', count: 25 }
  },
  // Phase 6: Enhanced quality badges
  trusted_voice_quality: {
    id: 'trusted_voice_quality',
    name: 'Trusted Voice',
    icon: '🎙️',
    description: '20 recommendations with 95%+ helpful rate',
    category: 'quality' as BadgeCategory,
    requirement: { type: 'high_quality_rate', count: 95, minRecs: 20 }
  },
  gold_standard_quality: {
    id: 'gold_standard_quality',
    name: 'Gold Standard',
    icon: '🥇',
    description: '50 recommendations with 90%+ helpful rate',
    category: 'quality' as BadgeCategory,
    requirement: { type: 'gold_quality_rate', count: 90, minRecs: 50 }
  },
  // Phase 7: Streak badges
  streak_4_weeks: {
    id: 'streak_4_weeks',
    name: 'On Fire',
    icon: '🔥',
    description: '4-week recommendation streak',
    category: 'streak' as BadgeCategory,
    requirement: { type: 'streak_weeks', count: 4 }
  },
  streak_12_weeks: {
    id: 'streak_12_weeks',
    name: 'Consistent Contributor',
    icon: '💪',
    description: '12-week recommendation streak',
    category: 'streak' as BadgeCategory,
    requirement: { type: 'streak_weeks', count: 12 }
  },
  streak_26_weeks: {
    id: 'streak_26_weeks',
    name: 'Half-Year Hero',
    icon: '🌟',
    description: '26-week recommendation streak',
    category: 'streak' as BadgeCategory,
    requirement: { type: 'streak_weeks', count: 26 }
  },
  streak_52_weeks: {
    id: 'streak_52_weeks',
    name: 'Year-Long Legend',
    icon: '👑',
    description: '52-week recommendation streak',
    category: 'streak' as BadgeCategory,
    requirement: { type: 'streak_weeks', count: 52 }
  },
  // Phase 8: Content Badges
  content_curator_10: {
    id: 'content_curator_10',
    name: 'Content Curator',
    icon: '📚',
    description: 'Shared 10+ articles or newsletters',
    category: 'content' as BadgeCategory,
    requirement: { type: 'content_recs', content_types: ['article', 'newsletter'], count: 10 }
  },
  podcast_promoter_10: {
    id: 'podcast_promoter_10',
    name: 'Podcast Promoter',
    icon: '🎙️',
    description: 'Shared 10+ podcast episodes',
    category: 'content' as BadgeCategory,
    requirement: { type: 'content_recs', content_types: ['podcast'], count: 10 }
  },
  video_advocate_10: {
    id: 'video_advocate_10',
    name: 'Video Advocate',
    icon: '🎬',
    description: 'Shared 10+ videos',
    category: 'content' as BadgeCategory,
    requirement: { type: 'content_recs', content_types: ['video'], count: 10 }
  },
  knowledge_sharer_25: {
    id: 'knowledge_sharer_25',
    name: 'Knowledge Sharer',
    icon: '📰',
    description: 'Shared 25+ content items across all types',
    category: 'content' as BadgeCategory,
    requirement: { type: 'content_recs', content_types: ['article', 'newsletter', 'podcast', 'video'], count: 25 }
  },
  // Review badges
  first_review: {
    id: 'first_review',
    name: 'First Impression',
    icon: '✍️',
    description: 'Submitted your first review',
    category: 'review' as BadgeCategory,
    requirement: { type: 'reviews_submitted', count: 1 }
  },
  review_5: {
    id: 'review_5',
    name: 'Regular Reviewer',
    icon: '📝',
    description: 'Submitted 5 reviews',
    category: 'review' as BadgeCategory,
    requirement: { type: 'reviews_submitted', count: 5 }
  },
  review_10: {
    id: 'review_10',
    name: 'Trusted Reviewer',
    icon: '⭐',
    description: 'Submitted 10 reviews',
    category: 'review' as BadgeCategory,
    requirement: { type: 'reviews_submitted', count: 10 }
  },
  review_25: {
    id: 'review_25',
    name: 'Review Champion',
    icon: '🏅',
    description: 'Submitted 25 reviews',
    category: 'review' as BadgeCategory,
    requirement: { type: 'reviews_submitted', count: 25 }
  },
  review_50: {
    id: 'review_50',
    name: 'Review Legend',
    icon: '🏆',
    description: 'Submitted 50 reviews',
    category: 'review' as BadgeCategory,
    requirement: { type: 'reviews_submitted', count: 50 }
  }
} as const;

export type BadgeId = keyof typeof BADGE_DEFINITIONS;

/**
 * Points awarded for review actions
 */
export const REVIEW_REWARD_POINTS = {
  review_submitted: 10,    // Base points for submitting any review
  review_with_text: 5,     // Bonus for including review text (min 20 chars)
  review_with_media: 5,    // Bonus for including images or video
  review_approved: 5,      // Bonus when review is approved by moderation
  review_helpful: 2,       // Points when someone marks review as helpful
} as const;

// ============================================================================
// MAIN INTERFACES
// ============================================================================

/**
 * Reward event record from database
 */
export interface Reward {
  id: number;
  user_id: number;
  reward_type: RewardType;
  points_earned: number;
  badge_id: string | null;
  milestone_type: string | null;
  referral_id: number | null;
  description: string | null;
  created_at: Date;
}

/**
 * Badge record from database
 */
export interface Badge {
  id: number;
  user_id: number;
  badge_type: string;
  badge_name: string;
  badge_icon: string | null;
  badge_description: string | null;
  badge_category: BadgeCategory;
  earned_at: Date;
}

/**
 * Badge definition with earned status
 */
export interface BadgeWithStatus {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: BadgeCategory;
  earned: boolean;
  earned_at: Date | null;
  requirement: {
    type: string;
    count: number;
  };
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

/**
 * Leaderboard entry
 * Phase 6: Extended with recommendation counts
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  user_name: string;
  avatar_url: string | null;
  total_points: number;
  total_referrals: number;
  total_conversions: number;
  badges_earned: number;
  is_current_user: boolean;
  // Phase 6: Recommendation counts
  total_recommendations: number;
  total_sharing: number; // referrals + recommendations
  // Phase 6: Category-specific (when filtered)
  category_points?: number;
  category_recommendations?: number;
}

/**
 * User's complete reward summary
 */
export interface RewardSummary {
  total_points: number;
  total_referrals_sent: number;
  total_conversions: number;
  badges_earned: Badge[];
  recent_rewards: Reward[];
  leaderboard_rank: number;
  next_badge: BadgeWithStatus | null;
}

/**
 * Extended reward summary with recommendation stats (Phase 5)
 */
export interface UnifiedRewardSummary extends RewardSummary {
  total_recommendations_sent: number;
  total_helpful: number;
  total_thank_yous: number;
  helpful_rate: number;
  recommendation_points: number;
}

/**
 * Unified sharing stats for both referrals and recommendations (Phase 5)
 * Phase 6: Extended with entity-specific recommendation counts
 */
export interface UnifiedSharingStats {
  // Referral stats
  total_referrals_sent: number;
  total_conversions: number;
  referral_points: number;

  // Recommendation stats
  total_recommendations_sent: number;
  total_helpful: number;
  total_thank_yous: number;
  helpful_rate: number;
  recommendation_points: number;

  // Combined
  total_points: number;
  combined_activities: number;

  // Phase 6: Entity-specific recommendation counts (for category progress)
  listing_recommendations: number;
  event_recommendations: number;
  user_recommendations: number;
  offer_recommendations: number;
  job_recommendations: number;

  // Referral (platform invite) counts
  referral_count: number;

  // Phase 8: Content-specific recommendation counts
  article_recommendations: number;
  newsletter_recommendations: number;
  podcast_recommendations: number;
  video_recommendations: number;
}

/**
 * Leaderboard filters
 * Phase 6: Extended with category filter
 * Phase 8: Extended with content type filters
 */
export interface LeaderboardFilters {
  period?: 'all_time' | 'this_month' | 'this_week';
  limit?: number;
  // Phase 6: Category filter for entity-specific leaderboards
  // Phase 8: Added content types (article, newsletter, podcast, video)
  // Jobs Integration: Added 'job' category
  category?: 'all' | 'listing' | 'event' | 'user' | 'offer' | 'job' | 'referral' | 'article' | 'newsletter' | 'podcast' | 'video';
}

/**
 * Entity-specific recommendation counts
 * Phase 6: For category badge eligibility
 */
export interface EntityRecommendationStats {
  listing: number;
  event: number;
  user: number;
  offer: number;
  job: number;
  referral: number;
  total: number;
  max_category: {
    type: string;
    count: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * New badge earned event (for notifications)
 */
export interface BadgeEarnedEvent {
  badge: Badge;
  isNew: boolean;
  timestamp: Date;
}

/**
 * Points earned event (for animations/notifications)
 */
export interface PointsEarnedEvent {
  points: number;
  source: RewardType;
  timestamp: Date;
}

// ============================================================================
// PHASE 7: STREAKS & TIER PROGRESSION
// ============================================================================

/**
 * User tier levels
 * Phase 7: Tier-based progression system
 */
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * Tier configuration and perks
 */
export interface TierInfo {
  tier: Tier;
  name: string;
  icon: string;
  color: string;
  pointsRequired: number;
  freezesPerMonth: number;
  bonusMultiplier: number;
  perks: string[];
}

/**
 * Tier definitions with thresholds and benefits
 */
export const TIER_DEFINITIONS: Record<Tier, TierInfo> = {
  bronze: {
    tier: 'bronze',
    name: 'Bronze',
    icon: '🥉',
    color: '#CD7F32',
    pointsRequired: 0,
    freezesPerMonth: 1,
    bonusMultiplier: 1.0,
    perks: [
      '1 streak freeze per month',
      'Basic badge access',
      'Standard leaderboard visibility'
    ]
  },
  silver: {
    tier: 'silver',
    name: 'Silver',
    icon: '🥈',
    color: '#C0C0C0',
    pointsRequired: 500,
    freezesPerMonth: 1,
    bonusMultiplier: 1.05,
    perks: [
      '1 streak freeze per month',
      '5% bonus points multiplier',
      'Silver badge access',
      'Priority leaderboard display'
    ]
  },
  gold: {
    tier: 'gold',
    name: 'Gold',
    icon: '🥇',
    color: '#FFD700',
    pointsRequired: 2000,
    freezesPerMonth: 2,
    bonusMultiplier: 1.10,
    perks: [
      '2 streak freezes per month',
      '10% bonus points multiplier',
      'Gold badge access',
      'Top leaderboard prominence',
      'Exclusive gold badge'
    ]
  },
  platinum: {
    tier: 'platinum',
    name: 'Platinum',
    icon: '💎',
    color: '#E5E4E2',
    pointsRequired: 5000,
    freezesPerMonth: 3,
    bonusMultiplier: 1.15,
    perks: [
      '3 streak freezes per month',
      '15% bonus points multiplier',
      'Platinum badge access',
      'Premium leaderboard placement',
      'Exclusive platinum badge',
      'Special recognition flair'
    ]
  }
} as const;

/**
 * Streak bonus multipliers based on consecutive weeks
 */
export const STREAK_BONUSES: Record<number, number> = {
  2: 1.10,   // 2 weeks: 1.1x points
  4: 1.25,   // 4 weeks: 1.25x points
  8: 1.50,   // 8 weeks: 1.5x points
  52: 2.00   // 52 weeks (1 year): 2.0x points
} as const;

/**
 * Streak status for a user
 */
export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  streakStartDate: Date | null;
  lastActivityDate: Date | null;
  lastActivityWeek: string | null;
  freezesAvailable: number;
  freezesUsedThisMonth: number;
  lastFreezeUsedAt: Date | null;
  freezeResetAt: Date;
  bonusMultiplier: number;
  daysUntilReset: number;
  nextStreakBonus: {
    weeks: number;
    multiplier: number;
  } | null;
}

/**
 * Tier status for a user
 */
export interface TierStatus {
  currentTier: Tier;
  tierInfo: TierInfo;
  points: number;
  nextTier: Tier | null;
  nextTierInfo: TierInfo | null;
  pointsToNextTier: number | null;
  progressPercentage: number;
}
