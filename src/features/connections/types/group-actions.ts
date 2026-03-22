/**
 * Group Actions Types
 * @phase Connection Groups Phase 2
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 */

// =============================================================================
// GROUP MESSAGES
// =============================================================================

export interface GroupMessage {
  id: number;
  groupId: number;
  senderUserId: number;
  subject: string | null;
  content: string;
  contentType: 'text' | 'html' | 'markdown';
  attachments: GroupMessageAttachment[] | null;
  metadata: Record<string, unknown> | null;
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: number | null;
  replyToId: number | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined sender data
  senderUsername: string;
  senderDisplayName: string | null;
  senderAvatarUrl: string | null;
  senderAvatarBgColor: string | null;
  // Joined reply-to data (when replyToId is set)
  replyToContent?: string | null;
  replyToSenderUsername?: string | null;
  replyToSenderDisplayName?: string | null;
  // Reactions
  reactions?: GroupMessageReactionSummary[];
}

export interface GroupMessageAttachment {
  id: string;
  type: 'image' | 'file' | 'link';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface SendGroupMessageInput {
  groupId: number;
  subject?: string;
  content: string;
  contentType?: 'text' | 'html' | 'markdown';
  attachments?: GroupMessageAttachment[];
  metadata?: Record<string, unknown>;
  replyToId?: number;
}

/** Aggregated reaction summary for group message display */
export interface GroupMessageReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  users: { userId: number; username: string }[];
}

export interface GroupMessageThread {
  groupId: number;
  groupName: string;
  groupColor: string;
  groupIcon: string;
  latestMessage: GroupMessage | null;
  unreadCount: number;
  totalMessages: number;
  memberCount: number;
}

export interface GroupMessageReadStatus {
  groupId: number;
  userId: number;
  lastReadMessageId: number;
  lastReadAt: Date;
  unreadCount: number;
}

// =============================================================================
// GROUP LISTING RECOMMENDATIONS
// =============================================================================

export interface GroupListingRecommendation {
  id: number;
  groupId: number;
  senderUserId: number;
  listingId: number;
  message: string | null;
  viewCount: number;
  clickCount: number;
  createdAt: Date;
  // Joined sender data
  senderUsername: string;
  senderDisplayName: string | null;
  senderAvatarUrl: string | null;
  // Joined listing data
  listingTitle: string;
  listingSlug: string;
  listingImageUrl: string | null;
  listingCategory: string | null;
}

export interface SendGroupListingRecommendationInput {
  groupId: number;
  listingId: number;
  message?: string;
}

// =============================================================================
// GROUP ACTIVITY
// =============================================================================

export type GroupActivityType =
  | 'message_posted'
  | 'member_added'
  | 'member_removed'
  | 'listing_recommended'
  | 'group_updated'
  | 'member_joined'
  | 'member_left'
  | 'member_suggested';

export interface GroupActivity {
  id: number;
  groupId: number;
  actorUserId: number;
  activityType: GroupActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  targetType: string | null;
  targetId: number | null;
  createdAt: Date;
  // Joined actor data
  actorUsername: string;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
}

// =============================================================================
// MEMBER NOTIFICATION PREFERENCES
// =============================================================================

export interface GroupMemberNotificationPreferences {
  notifyMessages: boolean;
  notifyActivity: boolean;
  notifyRecommendations: boolean;
}

export interface UpdateMemberNotificationPreferencesInput {
  notifyMessages?: boolean;
  notifyActivity?: boolean;
  notifyRecommendations?: boolean;
}

// =============================================================================
// MEMBER SUGGESTIONS
// =============================================================================

export interface GroupMemberSuggestion {
  id: number;
  groupId: number;
  suggestedByUserId: number;
  suggestedUserId: number;
  message: string | null;
  status: 'pending' | 'approved' | 'denied';
  reviewedByUserId: number | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  // Joined data
  suggestedByUsername?: string;
  suggestedByDisplayName?: string | null;
  suggestedUsername?: string;
  suggestedDisplayName?: string | null;
  suggestedAvatarUrl?: string | null;
}

export interface SuggestMemberInput {
  suggestedUserId: number;
  message?: string;
}

export interface ReviewSuggestionInput {
  status: 'approved' | 'denied';
  reviewNote?: string;
}
