/**
 * Content Follow/Subscription Types
 *
 * Mirrors EventFollowType/EventFollowState pattern from src/features/events/types
 * Extended with content-specific follow types and content_type_filter.
 *
 * @authority TIER_4_CONTENT_SUBSCRIPTION_MASTER_INDEX.md
 * @tier STANDARD
 * @generated dna-v11.4.0
 * @dna-version 11.4.0
 */

/** Follow type — what the user is following */
export type ContentFollowType =
  | 'business'
  | 'category'
  | 'content_type'
  | 'all_content'
  | 'newsletter'
  | 'podcast_show'
  | 'marketer_profile'
  | 'personality_profile'
  | 'podcaster_profile';

/** Notification delivery frequency */
export type ContentNotificationFrequency = 'realtime' | 'daily' | 'weekly';

/** Database row shape for content_follows table */
export interface ContentFollowRow {
  id: number;
  user_id: number;
  follow_type: ContentFollowType;
  target_id: number | null;
  content_type_filter: string | null;
  notification_frequency: ContentNotificationFrequency;
  is_active: number; // TINYINT(1) — 0 or 1
  created_at: Date;
  updated_at: Date | null;
}

/** Application-level follow object (post-processing from row) */
export interface ContentFollow {
  id: number;
  userId: number;
  followType: ContentFollowType;
  targetId: number | null;
  contentTypeFilter: string | null;
  notificationFrequency: ContentNotificationFrequency;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

/** Follow status check result — mirrors EventFollowState */
export interface ContentFollowState {
  isFollowing: boolean;
  followId: number | null;
  frequency: ContentNotificationFrequency;
  isActive: boolean;
}

/** Input for creating/updating a follow */
export interface CreateContentFollowInput {
  followType: ContentFollowType;
  targetId: number | null;
  contentTypeFilter?: string | null;
  frequency?: ContentNotificationFrequency;
}

/** Follower info returned by getFollowersForContent */
export interface ContentFollower {
  userId: number;
  followId: number;
  followType: ContentFollowType;
  notificationFrequency: ContentNotificationFrequency;
  contentTypeFilter: string | null;
}
