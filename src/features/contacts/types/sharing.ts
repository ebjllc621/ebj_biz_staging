/**
 * Unified Sharing & Recommendations Types
 * Phase 0 - Foundation Migration
 *
 * GOVERNANCE COMPLIANCE:
 * - Extends existing referral infrastructure without breaking changes
 * - Reuses Referral interface and REFERRAL_POINTS constants
 * - Import paths: Uses @features/ aliases
 * - Build Map v2.1 ENHANCED patterns
 *
 * NAMING CONVENTIONS:
 * - "share" prefix: Used for recommendation-related methods (generateShareCode)
 * - "referral" prefix: Reserved for legacy platform invite methods
 * - "recommendation": User-to-user entity sharing
 * - "platform_invite": Traditional referral to join platform
 *
 * MIGRATION NOTES (TD-011):
 * - generateReferralCode() → generateShareCode() (alias maintained)
 * - referralCode variable → shareCode (internal only)
 *
 * @tier SIMPLE
 * @phase Unified Sharing & Recommendations - Phase 0
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_0_BRAIN_PLAN.md
 * @reference src/features/contacts/types/referral.ts - Type pattern
 */

import type {
  Referral,
  ReferralStatus,
  RewardStatus,
  ReferralStats,
  ReferralFilters,
  CreateReferralInput,
  UpdateReferralInput,
  ReferralWithReferrer
} from './referral';
import { REFERRAL_POINTS } from './referral';

// ============================================================================
// ENTITY TYPE DEFINITIONS
// ============================================================================

/**
 * All supported entity types for sharing
 * Phase 0: Foundation for all 12 types
 * Phase 1: user, listing, event implemented
 * Phase 2: offer, product, service implemented
 * Phase 3: article, newsletter, podcast, video implemented
 * Phase 4: job_posting implemented
 */
export type EntityType =
  | 'platform_invite'  // Legacy referrals (Phase 0)
  | 'user'            // User recommendations (Phase 1)
  | 'listing'         // Business recommendations (Phase 1)
  | 'event'           // Event recommendations (Phase 1)
  | 'offer'           // Special offers (Phase 2)
  | 'product'         // Product recommendations (Phase 2)
  | 'service'         // Service recommendations (Phase 2)
  | 'article'         // Article sharing (Phase 3)
  | 'newsletter'      // Newsletter sharing (Phase 3)
  | 'podcast'         // Podcast episode sharing (Phase 3)
  | 'video'           // Video content sharing (Phase 3)
  | 'guide'                // Guide sharing (Phase 8)
  | 'job_posting'          // Job recommendations (Phase 4)
  | 'affiliate_marketer'   // Tier 3 - Creator Profiles
  | 'internet_personality' // Tier 3 - Creator Profiles
  | 'podcaster';           // Tier 3 - Creator Profiles (Phase 8C)

/**
 * Phase 1 entity types (initial implementation)
 */
export type Phase1EntityType = 'user' | 'listing' | 'event';

/**
 * Content entity types (Phase 3 + Tier 3 Creator Profiles)
 */
export type ContentEntityType = 'article' | 'newsletter' | 'podcast' | 'video' | 'guide' | 'affiliate_marketer' | 'internet_personality' | 'podcaster';

// ============================================================================
// MAIN INTERFACES
// ============================================================================

/**
 * Unified sharing record - extends Referral with entity support
 * Phase 0: Foundation only, all fields defined
 * Phase 1+: Actual implementation per entity type
 */
export interface Sharing extends Referral {
  /** Type of entity being shared */
  entity_type: EntityType;

  /** Entity ID (UUID or numeric ID as string) */
  entity_id: string | null;

  /** Bizconekt user receiving recommendation (NULL for external shares) */
  recipient_user_id: number | null;
}

/**
 * Input for creating a platform invite (legacy referral)
 * Phase 0: Delegates to ReferralService.createReferral()
 */
export interface CreatePlatformInviteInput extends CreateReferralInput {
  // Inherits all fields from CreateReferralInput
}

/**
 * Input for creating a recommendation (Phase 1+)
 * Phase 0: NOT_IMPLEMENTED - throws error if called
 */
export interface CreateRecommendationInput {
  /** Type of entity being recommended */
  entity_type: Exclude<EntityType, 'platform_invite'>;

  /** Entity ID to recommend */
  entity_id: string;

  /** Bizconekt user to receive recommendation */
  recipient_user_id: number;

  /** Optional custom message */
  message?: string;

  /** Contact ID if recommending through contact (optional) */
  contact_id?: number;
}

/**
 * Sharing filters for querying
 * Extends ReferralFilters with entity-specific filters
 */
export interface SharingFilters extends ReferralFilters {
  /** Filter by entity type */
  entity_type?: EntityType;

  /** Filter by recipient (recommendations received) */
  recipient_user_id?: number;

  /** Filter by entity ID */
  entity_id?: string;
}

// ============================================================================
// POINTS & REWARDS
// ============================================================================

/**
 * Points for sharing activities
 * Extends REFERRAL_POINTS with recommendation points
 */
export const SHARING_POINTS = {
  ...REFERRAL_POINTS,

  // Phase 1: User recommendations
  recommend_user: 10,
  user_recommendation_accepted: 30,

  // Phase 1: Listing recommendations
  recommend_listing: 5,
  listing_recommendation_viewed: 15,

  // Phase 1: Event recommendations
  recommend_event: 5,
  event_recommendation_registered: 20,

  // Phase 2+: Content sharing (placeholder)
  share_content: 3,
  content_viewed: 10,

  // Phase 4: Feedback points
  recommendation_helpful: 10,  // Sender gets when marked helpful
  thank_received: 5            // Sender gets when thanked
} as const;

// ============================================================================
// ENTITY PREVIEW (Phase 1+)
// ============================================================================

/**
 * Entity preview data for display
 * Phase 0: Interface defined
 * Phase 1+: Actual implementation per entity type
 */
export interface EntityPreview {
  /** Entity type */
  type: EntityType;

  /** Entity ID */
  id: string;

  /** Display title */
  title: string;

  /** Description or subtitle */
  description: string | null;

  /** Preview image URL */
  image_url: string | null;

  /** Entity URL for viewing */
  url: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Unified sharing statistics
 * Extends ReferralStats with recommendation stats
 */
export interface SharingStats extends ReferralStats {
  /** Total recommendations sent (Phase 1+) */
  total_recommendations_sent: number;

  /** Total recommendations received (Phase 1+) */
  total_recommendations_received: number;

  /** Recommendation acceptance rate (Phase 1+) */
  recommendation_acceptance_rate: number;

  /** Points from recommendations (Phase 1+) */
  recommendation_points_earned: number;
}

// ============================================================================
// PHASE 3: INBOX TYPES
// ============================================================================

/**
 * Sharing with entity preview and sender info
 * Used for inbox display
 */
export interface SharingWithPreview extends Sharing {
  /** Entity preview for display */
  entity_preview: EntityPreview | null;

  /** Sender information */
  sender: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };

  /** Whether recommendation has been viewed (Phase 3) */
  viewed_at: Date | null;

  /** Whether recommendation is saved/bookmarked (Phase 3) */
  is_saved: boolean;

  /** Whether recommendation was marked helpful (Phase 4) */
  is_helpful: boolean | null;

  /** When thank you was sent (Phase 4) */
  thanked_at: Date | null;
}

/**
 * Inbox tab counts
 * Used for tab badges in recommendations inbox
 */
export interface InboxCounts {
  /** Total recommendations (sent + received) */
  all: number;

  /** Total received recommendations */
  received: number;

  /** Unread received recommendations */
  unread: number;

  /** Total sent recommendations */
  sent: number;

  /** Saved/bookmarked recommendations */
  saved: number;

  /** Phase 4: Recommendations marked as helpful */
  helpful: number;

  /** Phase 4: Recommendations with thank yous sent */
  thankyous: number;
}

// ============================================================================
// PHASE 4: FEEDBACK TYPES
// ============================================================================

/**
 * Engagement types for recommendation tracking
 */
export type RecommendationEngagementType =
  | 'viewed'
  | 'entity_viewed'
  | 'entity_saved'
  | 'entity_contacted'
  | 'helpful_yes'
  | 'helpful_no'
  | 'thanked'
  | 'shared';

/**
 * Recommendation engagement record
 */
export interface RecommendationEngagement {
  id: number;
  recommendation_id: number;
  user_id: number;
  engagement_type: RecommendationEngagementType;
  metadata: Record<string, unknown> | null;
  points_awarded: number;
  created_at: Date;
}

/**
 * Sender impact statistics
 */
export interface SenderImpactStats {
  total_sent: number;
  total_viewed: number;
  total_helpful: number;
  total_not_helpful: number;
  total_thanked: number;
  view_rate: number;
  helpful_rate: number;
  thank_rate: number;
}

/**
 * Feedback item for display
 */
export interface FeedbackItem {
  id: number;
  type: 'helpful' | 'thanked';
  recipient_name: string;
  recipient_avatar: string | null;
  entity_title: string;
  message?: string;
  created_at: Date;
}

// ============================================================================
// PHASE 8: CONTENT CREATOR TYPES
// ============================================================================

/**
 * Content creator recommendation statistics
 * Phase 8: Content Types
 */
export interface ContentCreatorStats {
  /** Total content items created */
  total_content: number;

  /** Content items that have been recommended */
  content_recommended: number;

  /** Total recommendations received for content */
  total_recommendations: number;

  /** Total views from recommendations */
  recommendation_views: number;

  /** Average helpful rate on content recommendations */
  helpful_rate: number;

  /** Breakdown by content type */
  by_type: {
    articles: ContentTypeStats;
    newsletters: ContentTypeStats;
    podcasts: ContentTypeStats;
    videos: ContentTypeStats;
  };
}

/**
 * Stats for a single content type
 */
export interface ContentTypeStats {
  count: number;
  recommendations: number;
  views: number;
  helpful_rate: number;
}

// ============================================================================
// PHASE 9: MOBILE OPTIMIZATION TYPES
// ============================================================================

/**
 * Mobile share sheet state
 * Manages bottom sheet modal state for mobile sharing
 */
export interface MobileShareSheetState {
  isOpen: boolean;
  isDragging: boolean;
  dragOffset: number;
  canDismiss: boolean;
}

/**
 * Queued recommendation for offline sync
 * Stored in IndexedDB when offline
 */
export interface QueuedRecommendation {
  id: string;  // Client-generated UUID
  entity_type: EntityType;
  entity_id: string;
  recipient_user_id: number;
  message: string | null;
  queued_at: number;  // Unix timestamp
  retry_count: number;
  last_error: string | null;
}

/**
 * Offline queue status
 */
export interface OfflineQueueStatus {
  is_online: boolean;
  pending_count: number;
  syncing: boolean;
  last_sync_at: number | null;  // Unix timestamp
  failed_count: number;
}

/**
 * Mobile recommendation swipe action types
 */
export type MobileRecommendationSwipeAction = 'save' | 'dismiss';

/**
 * Swipe gesture configuration for recommendations
 */
export interface RecommendationSwipeConfig {
  left_action: MobileRecommendationSwipeAction;  // Swipe left
  right_action: MobileRecommendationSwipeAction; // Swipe right
  threshold: number;  // Minimum swipe distance (px)
  velocity_threshold: number;  // Minimum velocity for quick swipe
  haptic_enabled: boolean;
}

/**
 * Default swipe configuration for recommendations
 */
export const DEFAULT_RECOMMENDATION_SWIPE_CONFIG: RecommendationSwipeConfig = {
  left_action: 'dismiss',
  right_action: 'save',
  threshold: 100,
  velocity_threshold: 0.5,
  haptic_enabled: true
};

// ============================================================================
// ACTIVITY LOG TYPES
// ============================================================================

/**
 * Activity log item - unified entry for sent/received/points activity
 */
export interface ActivityLogItem {
  id: number;
  activity_type: 'sent' | 'received' | 'points';
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  entity_image: string | null;
  message: string | null;
  created_at: Date;
  points_earned: number;
  other_user_name: string | null;
  other_user_avatar: string | null;
  is_helpful: boolean | null;
  thanked_at: Date | null;
  viewed_at: Date | null;
}

/**
 * Points ledger - breakdown of points by category
 */
export interface PointsLedger {
  total_points: number;
  by_entity_type: Record<string, { count: number; points: number }>;
  bonus_points: {
    helpful: { count: number; points: number };
    thank_you: { count: number; points: number };
  };
  referral_points: {
    referral_sent: { count: number; points: number };
    referral_registered: { count: number; points: number };
    referral_connected: { count: number; points: number };
  };
  badge_points: { count: number; points: number };
  milestone_points: { count: number; points: number };
  badges_earned: { badge_id: string; description: string; earned_at: Date }[];
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Export all referral types for unified access
export type {
  Referral,
  ReferralStatus,
  RewardStatus,
  ReferralStats,
  ReferralFilters,
  CreateReferralInput,
  UpdateReferralInput,
  ReferralWithReferrer
};

export { REFERRAL_POINTS };
