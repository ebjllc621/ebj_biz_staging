/**
 * Connection System Types
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECT_SYSTEM_BRAIN_PLAN.md
 */

/**
 * Input for creating a connection request
 */
export interface ConnectionRequestInput {
  sender_user_id: number;
  receiver_user_id: number;
  message?: string;
  connection_type?: 'business' | 'professional' | 'personal';
  intent_type: ConnectionIntentType; // Phase 1: Make required
}

/**
 * Connection request record with sender profile information
 */
export interface ConnectionRequest {
  id: number;
  sender_user_id: number;
  receiver_user_id: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message: string | null;
  connection_type: string | null;
  intent_type: string | null; // Phase 1: Intent system
  reason: string | null;
  response_message: string | null;
  responded_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  // Joined sender profile info
  sender_username?: string;
  sender_display_name?: string | null;
  sender_avatar_url?: string | null;
  /** @governance AVATAR_DISPLAY_GOVERNANCE.md - Avatar background color for fallback */
  sender_avatar_bg_color?: string | null;
}

/**
 * User connection with profile information
 */
export interface UserConnection {
  id: number;
  user_id: number; // The other user in the connection
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  /** @governance AVATAR_DISPLAY_GOVERNANCE.md - Avatar background color for fallback */
  avatar_bg_color: string | null;
  connection_type: string | null;
  connected_since: Date;
  mutual_connections: number;
  interaction_count: number;
  last_interaction: Date | null;
  notes: string | null;
  tags: string[] | null;
}

/**
 * Connection statistics for a user
 */
export interface ConnectionStats {
  total_connections: number;
  connections_this_month: number;
  pending_sent: number;
  pending_received: number;
  mutual_connections_avg: number;
}

/**
 * Connection status state machine
 */
export type ConnectionStatus =
  | 'none'             // No relationship
  | 'pending_sent'     // Current user sent a request
  | 'pending_received' // Other user sent a request
  | 'connected'        // Users are connected
  | 'blocked_by_me'    // Current user blocked the other
  | 'blocked_by_them'; // Other user blocked current (invisible to current user)

/**
 * Response to a connection request
 */
export interface RespondToRequestInput {
  action: 'accept' | 'decline';
  response_message?: string;
}

/**
 * Update connection input (notes, tags)
 */
export interface UpdateConnectionInput {
  notes?: string;
  tags?: string[];
  connection_type?: 'business' | 'professional' | 'personal';
}

// =============================================================================
// PHASE 1: Rate Limiting & Intent System
// =============================================================================

/**
 * Rate limit configuration per user tier
 */
export interface RateLimitConfig {
  perDay: number;
  perWeek: number;
  cooldownMinutes: number;
}

/**
 * Current rate limit status for a user
 */
export interface RateLimitStatus {
  canSend: boolean;
  remainingToday: number;
  remainingThisWeek: number;
  nextAvailableAt: string | null;
  reputationScore: number;
  limits: RateLimitConfig;
}

/**
 * Connection request intent types
 */
export type ConnectionIntentType =
  | 'networking'
  | 'hiring'
  | 'partnership'
  | 'mentorship'
  | 'client_inquiry'
  | 'personal';

/**
 * Intent type metadata for UI display
 */
export interface IntentTypeInfo {
  type: ConnectionIntentType;
  label: string;
  description: string;
  color: string;
  icon: string;
}

/**
 * Connection request tracking record (rate limiting data)
 */
export interface ConnectionRequestTracking {
  id: number;
  user_id: number;
  requests_today: number;
  requests_this_week: number;
  last_request_at: Date | null;
  cooldown_until: Date | null;
  decline_count: number;
  reputation_score: number;
  last_reset_daily: Date;
  last_reset_weekly: Date;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// PHASE 2: PYMK Recommendations
// =============================================================================

/**
 * Recommended connection with scoring data
 */
export interface RecommendedConnection {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarBgColor: string | null;
  headline: string | null;
  industry: string | null;
  location: string | null;
  score: number;
  reasons: string[];
  mutualConnections: MutualConnectionSample[];
  mutualConnectionCount: number;
}

/**
 * Sample mutual connection for display
 */
export interface MutualConnectionSample {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Recommendation algorithm weights
 * @phase Phase 8A - Extended with skills and goals
 * @phase Phase 8B - Extended with interests and hobbies
 * @phase Phase 8C - Extended with education, hometown, and groups
 * @phase Phase 9 - Extended with connection groups (user-curated)
 */
export interface RecommendationWeights {
  // Existing factors (rebalanced in Phase 8C)
  mutualConnections: number;
  industryMatch: number;
  location: number;
  engagement: number;
  reputation: number;
  profileCompleteness: number;
  // Phase 8A: Professional alignment factors
  skillsOverlap: number;
  goalsAlignment: number;
  // Phase 8B: Personal connection factors
  interestOverlap: number;
  hobbiesAlignment: number;
  // Phase 8C: Education & community factors
  educationMatch: number;
  hometownMatch: number;
  groupOverlap: number;
  // Phase 9: Connection Groups (user-curated)
  connectionGroupOverlap: number;
}

/**
 * Recommendation preset profiles
 * Each preset defines a different weight distribution for different use cases
 *
 * @phase Phase 8D
 */
export type RecommendationPresetProfile =
  | 'balanced'      // Default: Even distribution
  | 'professional'  // Emphasizes skills, industry, goals
  | 'personal'      // Emphasizes interests, hobbies, education
  | 'alumni'        // Emphasizes education match
  | 'local';        // Emphasizes location and hometown

/**
 * Preset profile metadata for UI display
 *
 * @phase Phase 8D
 */
export interface PresetProfileInfo {
  id: RecommendationPresetProfile;
  name: string;
  description: string;
  icon: string;
  weights: RecommendationWeights;
}

/**
 * User's stored recommendation preferences
 * Includes weights and threshold settings
 *
 * @phase Phase 8D - Extended with presetProfile
 */
export interface UserRecommendationPreferences {
  userId: number;
  weights: RecommendationWeights;
  minScoreThreshold: number;
  presetProfile: RecommendationPresetProfile | null;  // NEW
  updatedAt: Date | null;
}

/**
 * Input for updating recommendation preferences
 */
export interface UpdateRecommendationPreferencesInput {
  weights?: Partial<RecommendationWeights>;
  minScoreThreshold?: number;
}

/**
 * Default weights for recommendation scoring
 * Total: 100 points
 *
 * @phase Phase 8A - Rebalanced for professional alignment
 * @phase Phase 8B - Rebalanced for personal connection (interests/hobbies)
 * @phase Phase 8C - Rebalanced for education & community (13 factors)
 * @phase Phase 9 - Extended with connection groups (14 factors)
 *
 * Distribution (14 factors):
 * - Network & Activity: 32 points (32%)
 * - Professional Alignment: 23 points (23%)
 * - Personal Connection: 35 points (35%)
 * - Context: 15 points (15%)
 */
export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  // Network & Activity (32 points)
  mutualConnections: 15,       // Reduced from 17 (Phase 8B)
  engagement: 6,               // Reduced from 7 (Phase 8B)
  reputation: 5,               // Reduced from 6 (Phase 8B)
  profileCompleteness: 6,      // Increased from 5 (Phase 8B)
  // Professional Alignment (23 points)
  industryMatch: 8,            // Reduced from 9 (Phase 8B)
  skillsOverlap: 8,            // Reduced from 9 (Phase 8B)
  goalsAlignment: 7,           // Unchanged
  // Personal Connection (35 points)
  interestOverlap: 10,         // Unchanged
  hobbiesAlignment: 5,         // Unchanged
  educationMatch: 8,           // NEW Phase 8C
  hometownMatch: 4,            // NEW Phase 8C
  groupOverlap: 3,             // NEW Phase 8C
  connectionGroupOverlap: 5,   // NEW Phase 9 - Higher weight (trusted curator signal)
  // Context (15 points)
  location: 15                 // Reduced from 25 (Phase 8B)
};

/**
 * Preset profile definitions
 * All weights MUST sum to 100
 *
 * @phase Phase 8D
 */
export const PRESET_PROFILES: Record<RecommendationPresetProfile, PresetProfileInfo> = {
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    description: 'Equal emphasis on all connection factors',
    icon: 'Scale',
    weights: DEFAULT_RECOMMENDATION_WEIGHTS
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Focus on skills, industry, and career goals',
    icon: 'Briefcase',
    weights: {
      // Network & Activity: 25 points
      mutualConnections: 10,
      engagement: 5,
      reputation: 5,
      profileCompleteness: 5,
      // Professional Alignment: 45 points (EMPHASIZED)
      industryMatch: 15,
      skillsOverlap: 18,
      goalsAlignment: 12,
      // Personal Connection: 20 points
      interestOverlap: 5,
      hobbiesAlignment: 3,
      educationMatch: 7,
      hometownMatch: 2,
      groupOverlap: 3,
      connectionGroupOverlap: 3,  // Phase 9 - Connection groups
      // Context: 10 points
      location: 7
    }
  },
  personal: {
    id: 'personal',
    name: 'Personal Connection',
    description: 'Find people with shared interests and backgrounds',
    icon: 'Heart',
    weights: {
      // Network & Activity: 20 points
      mutualConnections: 10,
      engagement: 4,
      reputation: 3,
      profileCompleteness: 3,
      // Professional Alignment: 15 points
      industryMatch: 5,
      skillsOverlap: 5,
      goalsAlignment: 5,
      // Personal Connection: 55 points (EMPHASIZED)
      interestOverlap: 16,
      hobbiesAlignment: 10,
      educationMatch: 10,
      hometownMatch: 6,
      groupOverlap: 5,
      connectionGroupOverlap: 8,  // Phase 9 - Connection groups (higher for personal)
      // Context: 10 points
      location: 10
    }
  },
  alumni: {
    id: 'alumni',
    name: 'Alumni Network',
    description: 'Connect with fellow graduates and classmates',
    icon: 'GraduationCap',
    weights: {
      // Network & Activity: 20 points
      mutualConnections: 10,
      engagement: 4,
      reputation: 3,
      profileCompleteness: 3,
      // Professional Alignment: 20 points
      industryMatch: 7,
      skillsOverlap: 7,
      goalsAlignment: 6,
      // Personal Connection: 52 points (EDUCATION EMPHASIZED)
      interestOverlap: 6,
      hobbiesAlignment: 4,
      educationMatch: 26,  // HIGHEST
      hometownMatch: 6,
      groupOverlap: 4,
      connectionGroupOverlap: 6,  // Phase 9 - Connection groups
      // Context: 8 points
      location: 8
    }
  },
  local: {
    id: 'local',
    name: 'Local Community',
    description: 'Find connections in your area',
    icon: 'MapPin',
    weights: {
      // Network & Activity: 25 points
      mutualConnections: 12,
      engagement: 5,
      reputation: 4,
      profileCompleteness: 4,
      // Professional Alignment: 18 points
      industryMatch: 6,
      skillsOverlap: 6,
      goalsAlignment: 6,
      // Personal Connection: 27 points
      interestOverlap: 6,
      hobbiesAlignment: 4,
      educationMatch: 5,
      hometownMatch: 6,  // Higher
      groupOverlap: 4,
      connectionGroupOverlap: 4,  // Phase 9 - Connection groups
      // Context: 30 points (LOCATION EMPHASIZED)
      location: 28
    }
  }
};

/**
 * Factor categories for UI grouping
 *
 * @phase Phase 8D
 */
export type FactorCategory = 'network' | 'professional' | 'personal' | 'context';

/**
 * Factor metadata for UI display
 *
 * @phase Phase 8D
 */
export interface FactorMetadata {
  key: keyof RecommendationWeights;
  label: string;
  description: string;
  icon: string;
  category: FactorCategory;
  defaultWeight: number;
}

/**
 * Complete factor metadata for all 13 factors
 *
 * @phase Phase 8D
 */
export const FACTOR_METADATA: FactorMetadata[] = [
  // Network & Activity
  {
    key: 'mutualConnections',
    label: 'Mutual Connections',
    description: 'People you both know',
    icon: 'Users',
    category: 'network',
    defaultWeight: 15
  },
  {
    key: 'engagement',
    label: 'Engagement',
    description: 'Activity level on platform',
    icon: 'Activity',
    category: 'network',
    defaultWeight: 6
  },
  {
    key: 'reputation',
    label: 'Reputation',
    description: 'Trust and quality score',
    icon: 'Award',
    category: 'network',
    defaultWeight: 5
  },
  {
    key: 'profileCompleteness',
    label: 'Profile Quality',
    description: 'How complete their profile is',
    icon: 'UserCheck',
    category: 'network',
    defaultWeight: 6
  },
  // Professional Alignment
  {
    key: 'industryMatch',
    label: 'Industry Match',
    description: 'Same or similar industry',
    icon: 'Building2',
    category: 'professional',
    defaultWeight: 8
  },
  {
    key: 'skillsOverlap',
    label: 'Skills Overlap',
    description: 'Shared professional skills',
    icon: 'Wrench',
    category: 'professional',
    defaultWeight: 8
  },
  {
    key: 'goalsAlignment',
    label: 'Goals Alignment',
    description: 'Similar career goals',
    icon: 'Target',
    category: 'professional',
    defaultWeight: 7
  },
  // Personal Connection
  {
    key: 'interestOverlap',
    label: 'Shared Interests',
    description: 'Common interest categories',
    icon: 'Sparkles',
    category: 'personal',
    defaultWeight: 10
  },
  {
    key: 'hobbiesAlignment',
    label: 'Similar Hobbies',
    description: 'Shared hobbies and activities',
    icon: 'Palette',
    category: 'personal',
    defaultWeight: 5
  },
  {
    key: 'educationMatch',
    label: 'Education Match',
    description: 'Same school or field of study',
    icon: 'GraduationCap',
    category: 'personal',
    defaultWeight: 8
  },
  {
    key: 'hometownMatch',
    label: 'Hometown Match',
    description: 'From the same area',
    icon: 'Home',
    category: 'personal',
    defaultWeight: 4
  },
  {
    key: 'groupOverlap',
    label: 'Shared Groups',
    description: 'Common group memberships',
    icon: 'UsersRound',
    category: 'personal',
    defaultWeight: 3
  },
  // Context
  {
    key: 'location',
    label: 'Location',
    description: 'Current geographic proximity',
    icon: 'MapPin',
    category: 'context',
    defaultWeight: 15
  }
];

/**
 * Factors grouped by category for UI rendering
 *
 * @phase Phase 8D
 */
export const FACTORS_BY_CATEGORY: Record<FactorCategory, FactorMetadata[]> = {
  network: FACTOR_METADATA.filter(f => f.category === 'network'),
  professional: FACTOR_METADATA.filter(f => f.category === 'professional'),
  personal: FACTOR_METADATA.filter(f => f.category === 'personal'),
  context: FACTOR_METADATA.filter(f => f.category === 'context')
};

/**
 * Category metadata for UI display
 *
 * @phase Phase 8D
 */
export const CATEGORY_METADATA: Record<FactorCategory, { label: string; description: string; icon: string }> = {
  network: {
    label: 'Network & Activity',
    description: 'Who you know and how active they are',
    icon: 'Network'
  },
  professional: {
    label: 'Professional Alignment',
    description: 'Skills, industry, and career goals',
    icon: 'Briefcase'
  },
  personal: {
    label: 'Personal Connection',
    description: 'Interests, education, and background',
    icon: 'Heart'
  },
  context: {
    label: 'Context',
    description: 'Location and environment',
    icon: 'Globe'
  }
};

/**
 * Factor metadata for UI display (Legacy type)
 */
export interface RecommendationFactorInfo {
  key: keyof RecommendationWeights;
  label: string;
  description: string;
  icon: string;
}

/**
 * Options for fetching recommendations
 */
export interface RecommendationOptions {
  limit?: number;
  offset?: number;
  minScore?: number;
  industry?: string;
  location?: string;
}

/**
 * User feedback on recommendations
 */
export interface RecommendationFeedback {
  user_id: number;
  recommended_user_id: number;
  action: 'connected' | 'dismissed' | 'not_interested';
  // GOVERNANCE: Must match DB enum - enum('dont_know','not_relevant','spam','already_contacted','other')
  not_interested_reason?: 'dont_know' | 'not_relevant' | 'spam' | 'already_contacted' | 'other';
  other_reason?: string;
}

/**
 * Recommendation reason types for categorization and display
 * @phase Phase 8A - Professional alignment
 * @phase Phase 8B - Personal connection
 * @phase Phase 8C - Education & community
 * @phase Phase 9 - Connection groups
 */
export type RecommendationReasonType =
  | 'mutual_connections'
  | 'same_industry'
  | 'same_location'
  | 'skills_overlap'
  | 'goals_alignment'
  | 'shared_interests'
  | 'similar_hobbies'
  | 'same_college'
  | 'same_degree_field'
  | 'same_hometown'
  | 'shared_groups'
  | 'shared_connection_group';  // NEW Phase 9: User-created connection groups

/**
 * Enhanced reason with type for frontend categorization
 * @phase Phase 8A
 */
export interface CategorizedReason {
  type: RecommendationReasonType;
  text: string;
  category: 'network' | 'professional' | 'personal' | 'context';
}

// =============================================================================
// PHASE 3: Trust & Quality Signals
// =============================================================================

/**
 * User trust score calculation result
 */
export interface TrustScore {
  userId: number;
  score: number;
  tier: 'gold' | 'silver' | 'bronze' | 'none';
  factors: {
    verificationStatus: number;
    profileCompleteness: number;
    reputation: number;
    acceptanceRate: number;
  };
  calculatedAt: Date;
}

/**
 * Connection request quality score
 */
export interface QualityScore {
  requestId: number;
  score: number;
  level: 'high' | 'medium' | 'low';
  factors: {
    senderTrust: number;
    messageQuality: number;
    intentSpecificity: number;
    mutualConnections: number;
  };
}

// =============================================================================
// PHASE 4: Privacy Controls & Follow System
// =============================================================================

/**
 * User's connection privacy settings
 */
export interface ConnectionPrivacySettings {
  whoCanConnect: 'everyone' | 'connections_of_connections' | 'nobody';
  requireMessage: boolean;
  autoDeclineNoMessage: boolean;
  showConnectionCount: boolean;
  allowFollows: boolean;
}

/**
 * Follow relationship record
 */
export interface FollowRelationship {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: Date;
  // Joined profile info
  follower_username?: string;
  follower_display_name?: string | null;
  follower_avatar_url?: string | null;
  following_username?: string;
  following_display_name?: string | null;
  following_avatar_url?: string | null;
}

// =============================================================================
// PHASE 5: Advanced Features
// =============================================================================

/**
 * Connection request template
 */
export interface ConnectionTemplate {
  id: number;
  user_id: number;
  name: string;
  message: string;
  connection_type: 'business' | 'professional' | 'personal';
  intent_type: ConnectionIntentType;
  is_default: boolean;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Connection health metrics
 */
export interface ConnectionHealth {
  userId: number;
  healthScore: number;
  totalConnections: number;
  activeConnections: number;
  staleConnections: number;
  averageInteractionFrequency: number;
  lastCalculated: Date;
  recommendations: string[];
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    id: number;
    error: string;
  }>;
}

// =============================================================================
// PHASE 6: Dismissed Connections
// =============================================================================

/**
 * Source of a dismissed connection
 */
export type DismissedSource = 'pymk_dismissed' | 'request_declined';

/**
 * Dismissed connection record
 * Combines PYMK dismissals (from recommendation_feedback) and
 * declined connection requests (from connection_request)
 */
export interface DismissedConnection {
  id: number;
  source: DismissedSource;
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  /** @governance AVATAR_DISPLAY_GOVERNANCE.md - Avatar background color for fallback */
  avatar_bg_color: string | null;
  // For PYMK dismissals
  dismiss_reason?: 'dont_know' | 'not_relevant' | 'spam' | 'already_contacted' | 'other' | null;
  other_reason?: string | null;
  // For declined requests
  request_message?: string | null;
  request_intent?: string | null;
  // Common
  dismissed_at: Date;
}

// =============================================================================
// PHASE 7: User Blocking / Blacklist
// =============================================================================

/**
 * Block area flags - which features the user is blocked from
 */
export interface BlockAreas {
  messages: boolean;
  connections: boolean;
  pymk: boolean;
}

/**
 * Input for blocking a user
 */
export interface BlockUserInput {
  blocked_user_id: number;
  block_messages: boolean;
  block_connections: boolean;
  block_pymk: boolean;
  block_reason?: string;
}

/**
 * Blocked user record with profile information
 */
export interface BlockedUser {
  id: number;
  blocked_user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  /** @governance AVATAR_DISPLAY_GOVERNANCE.md - Avatar background color for fallback */
  avatar_bg_color: string | null;
  block_messages: boolean;
  block_connections: boolean;
  block_pymk: boolean;
  block_reason: string | null;
  blocked_at: Date;
}

// =============================================================================
// PHASE 8E: Mobile Optimization
// =============================================================================

/**
 * Mobile payload optimization - lighter version of RecommendedConnection
 * Used for mobile list views and offline caching
 *
 * @phase Phase 8E
 */
export interface MobileRecommendedConnection {
  // Core data (always included)
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarBgColor: string | null;
  score: number;

  // Compact data (included by default)
  headline: string | null;
  mutualConnectionCount: number;
  primaryReason: string | null;  // Single reason for compact display

  // Extended data (opt-in via expand=full)
  industry?: string;
  location?: string;
  reasons?: string[];
  mutualConnections?: MutualConnectionSample[];
}

/**
 * Offline cache entry with metadata
 *
 * @phase Phase 8E
 */
export interface CachedRecommendations {
  userId: number;
  recommendations: MobileRecommendedConnection[];
  total: number;
  cachedAt: number;  // Unix timestamp
  expiresAt: number; // Unix timestamp
  syncToken: string; // ETag for sync
}

/**
 * Swipe gesture direction for recommendation interactions
 *
 * @phase Phase 8E
 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Swipe action mapping
 *
 * @phase Phase 8E
 */
export interface SwipeActionConfig {
  left: 'dismiss' | 'not_interested' | null;
  right: 'connect' | 'message' | null;
  threshold: number;  // Minimum swipe distance (px)
  velocityThreshold: number;  // Minimum velocity for quick swipe
}

/**
 * Default swipe configuration
 *
 * @phase Phase 8E
 */
export const DEFAULT_SWIPE_CONFIG: SwipeActionConfig = {
  left: 'dismiss',
  right: 'connect',
  threshold: 100,
  velocityThreshold: 0.5
};

/**
 * Mobile display variant for recommendation cards
 *
 * @phase Phase 8E
 */
export type MobileCardVariant = 'full' | 'compact' | 'minimal';

/**
 * Pull-to-refresh state
 *
 * @phase Phase 8E
 */
export interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
}

/**
 * Offline sync status
 *
 * @phase Phase 8E
 */
export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingActions: number;
  cacheAge: number;  // Minutes since last cache update
}

// =============================================================================
// PHASE 8F: Analytics & A/B Testing
// =============================================================================

/**
 * Recommendation analytics event types
 * @phase Phase 8F
 */
export type RecommendationAnalyticsEventType =
  | 'impression'           // Card viewed (in viewport)
  | 'click_profile'        // Clicked to view profile
  | 'click_connect'        // Clicked connect button
  | 'click_dismiss'        // Clicked dismiss/not interested
  | 'swipe_connect'        // Mobile swipe right
  | 'swipe_dismiss'        // Mobile swipe left
  | 'feedback_submitted'   // User submitted relevance feedback
  | 'connection_accepted'  // Recommendation led to accepted connection
  | 'connection_declined'  // Recommendation led to declined request
  | 'message_sent';        // First message sent after connection

/**
 * Recommendation analytics event
 * @phase Phase 8F
 */
export interface RecommendationAnalyticsEvent {
  eventType: RecommendationAnalyticsEventType;
  userId: number;                           // Current user
  recommendedUserId: number;                // Recommended user
  score: number;                            // Recommendation score at time of event
  position: number;                         // Position in list (0-indexed)
  source: 'homepage_widget' | 'connections_page' | 'mobile_list' | 'profile_sidebar';
  variantId: string | null;                 // A/B test variant
  sessionId: string;                        // Session identifier
  dwellTimeMs?: number;                     // Time spent viewing (for impressions)
  reasons?: string[];                       // Reasons shown at time of event
  metadata?: Record<string, unknown>;       // Additional context
  timestamp: Date;
}

/**
 * User feedback on recommendation relevance
 * @phase Phase 8F
 */
export interface RecommendationRelevanceFeedback {
  userId: number;
  recommendedUserId: number;
  action: 'connected' | 'dismissed' | 'not_interested';
  relevanceRating: 1 | 2 | 3 | 4 | 5 | null;  // 1=Not relevant, 5=Very relevant
  reasonsHelpful: boolean | null;             // Were the match reasons helpful?
  feedbackText?: string;                      // Optional text feedback
  variantId: string | null;
  timestamp: Date;
}

/**
 * A/B test variant for recommendation algorithm
 * @phase Phase 8F
 */
export interface RecommendationAlgorithmVariant {
  variantId: string;
  name: string;
  description: string;
  weightOverrides: Partial<RecommendationWeights>;
  isControl: boolean;
  createdAt: Date;
}

/**
 * Conversion funnel stage
 * @phase Phase 8F
 */
export type FunnelStage =
  | 'impression'       // User saw recommendation
  | 'interaction'      // User clicked/swiped
  | 'request_sent'     // Connection request sent
  | 'request_accepted' // Connection accepted
  | 'first_message';   // First message exchanged

/**
 * Conversion funnel metrics
 * @phase Phase 8F
 */
export interface RecommendationFunnelMetrics {
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  variantId: string | null;
  stages: {
    impressions: number;
    interactions: number;
    requestsSent: number;
    requestsAccepted: number;
    firstMessages: number;
  };
  conversionRates: {
    impressionToInteraction: number;    // %
    interactionToRequest: number;       // %
    requestToAccepted: number;          // %
    acceptedToMessage: number;          // %
    overallConversion: number;          // impression to message %
  };
}

/**
 * Algorithm performance summary
 * @phase Phase 8F
 */
export interface AlgorithmPerformanceSummary {
  variantId: string;
  variantName: string;
  period: 'day' | 'week' | 'month';
  metrics: {
    totalRecommendations: number;
    uniqueUsersServed: number;
    avgScore: number;
    avgReasonsCount: number;
    connectionRequestRate: number;      // % of recommendations → request
    acceptanceRate: number;             // % of requests → accepted
    avgRelevanceRating: number | null;  // User feedback average
    reasonsHelpfulRate: number | null;  // % finding reasons helpful
  };
  topPerformingFactors: Array<{
    factor: keyof RecommendationWeights;
    contributionScore: number;
  }>;
  bottomPerformingFactors: Array<{
    factor: keyof RecommendationWeights;
    contributionScore: number;
  }>;
}

/**
 * Real-time recommendation metrics
 * @phase Phase 8F
 */
export interface RealtimeRecommendationMetrics {
  lastHour: {
    impressions: number;
    interactions: number;
    requests: number;
  };
  today: {
    impressions: number;
    interactions: number;
    requests: number;
    acceptances: number;
  };
  activeVariants: Array<{
    variantId: string;
    name: string;
    rolloutPercentage: number;
    impressions: number;
  }>;
  topRecommendedUsers: Array<{
    userId: number;
    displayName: string | null;
    impressions: number;
    interactionRate: number;
  }>;
}
