/**
 * Connection Group Types
 *
 * GOVERNANCE COMPLIANCE:
 * - Type definitions for Connection Groups feature
 * - STANDARD tier component types
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 */

export interface ConnectionGroup {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isQuotePool: boolean;
  quotePoolCategory: string | null;
  enableMemberRecommendations: boolean;
  recommendationVisibility: 'all_members' | 'owner_only' | 'none';
  isArchived: boolean;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: number;
  groupId: number;
  memberUserId: number;
  addedAt: Date;
  addedBy: number;
  notes: string | null;
  pymkOptOut: boolean;
  // Phase 2: Notification preferences
  notifyMessages?: boolean;
  notifyActivity?: boolean;
  notifyRecommendations?: boolean;
  // Tab access permissions (granted by owner)
  tabAccess?: string[] | null;
  // Mute status
  isMuted?: boolean;
  // Joined user data
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarBgColor: string | null;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  enableMemberRecommendations?: boolean;
  isQuotePool?: boolean;
  quotePoolCategory?: string;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  enableMemberRecommendations?: boolean;
  recommendationVisibility?: 'all_members' | 'owner_only' | 'none';
}

export interface GetGroupsOptions {
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface SharedGroupConnection {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarBgColor: string | null;
  sharedGroups: Array<{
    groupId: number;
    groupName: string;
    curatorUserId: number;
    curatorUsername: string;
    curatorDisplayName: string | null;
  }>;
  totalSharedGroups: number;
}

export interface ConnectionGroupRecommendationData {
  sharedGroups: Array<{
    groupId: number;
    groupName: string;
    curatorUserId: number;
    curatorUsername: string;
    curatorDisplayName: string | null;
  }>;
  totalSharedGroups: number;
  primaryGroup: {
    groupId: number;
    groupName: string;
    curatorUsername: string;
  };
}

export interface AddMembersResult {
  members: GroupMember[];
  recommendationsCreated: number;
  potentialPoints: number;
}

export interface GroupStats {
  totalGroups: number;
  totalMembers: number;
  recommendationsCreated: number;
  recommendationsAccepted: number;
  pointsEarned: number;
}

// ============================================================================
// Phase 3B: Quote Pool Integration Types
// ============================================================================

export interface QuotePoolSettings {
  isQuotePool: boolean;
  quotePoolCategory: string | null;
}

export interface UpdateQuotePoolInput {
  isQuotePool: boolean;
  quotePoolCategory?: string;
}

export interface QuotePoolInvitation {
  id: number;
  groupId: number;
  quoteId: number | null;
  inviterUserId: number;
  inviteeEmail: string;
  inviteeName: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedUserId: number | null;
  createdAt: Date;
  // Joined
  inviterName?: string;
  groupName?: string;
}

export interface SendQuoteToGroupInput {
  quoteId: number;
  groupId: number;
  message?: string;
}

export interface QuotePoolMemberBid {
  memberId: number;
  memberName: string;
  memberAvatarUrl: string | null;
  listingId: number | null;
  listingName: string | null;
  bidAmount: number | null;
  bidDescription: string;
  estimatedDuration: string | null;
  status: string;
  submittedAt: Date;
}

export interface GroupBidComparison {
  quoteId: number;
  quoteTitle: string;
  groupId: number;
  groupName: string;
  totalMembers: number;
  totalResponses: number;
  bids: QuotePoolMemberBid[];
  lowestBid: number | null;
  highestBid: number | null;
  averageBid: number | null;
}

export interface InviteToQuotePoolInput {
  groupId: number;
  emails: string[];
  message?: string;
  quoteId?: number;
}

// ============================================================================
// Phase 4A: Analytics Types
// ============================================================================

export interface GroupAnalytics {
  groupId: number;
  groupName: string;
  memberCount: number;
  totalMessages: number;
  totalRecommendations: number;
  acceptedRecommendations: number;
  totalActivities: number;
  engagementScore: number; // 0-100
  pymkConnectionsCreated: number;
  pointsEarned: number;
  memberGrowth: { date: string; count: number }[];
  activityByType: { type: string; count: number }[];
  createdAt: Date;
}

export interface GroupActivityTimelinePoint {
  date: string;
  messages: number;
  recommendations: number;
  memberChanges: number;
}

export interface UserGroupsSummary {
  totalGroups: number;
  totalMembers: number;
  totalMessages: number;
  totalRecommendations: number;
  totalPointsEarned: number;
  mostActiveGroup: { id: number; name: string; engagementScore: number } | null;
  leastActiveGroup: { id: number; name: string; engagementScore: number } | null;
  memberGrowthTrend: number; // percentage change last 30 days
}

export interface GroupMemberEngagement {
  memberId: number;
  memberName: string;
  avatarUrl: string | null;
  messagesSent: number;
  recommendationsViewed: number;
  lastActiveDate: Date | null;
  engagementScore: number;
}

export interface AdminGroupAnalytics {
  totalGroups: number;
  activeGroups: number;
  totalMembers: number;
  averageMembersPerGroup: number;
  quotePoolCount: number;
  quotePoolAdoptionRate: number;
  groupSizeDistribution: { range: string; count: number }[];
  topCreators: { userId: number; username: string; groupCount: number }[];
  pymkConversionRate: number;
  timeline: { date: string; groupsCreated: number; membersAdded: number }[];
}

// ============================================================================
// Phase 4B: Sharing & Template Types
// ============================================================================

export interface GroupTemplate {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isQuotePool: boolean;
  quotePoolCategory: string | null;
  enableMemberRecommendations: boolean;
  recommendationVisibility: 'all_members' | 'owner_only' | 'none';
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  creatorUsername?: string;
  creatorDisplayName?: string | null;
}

export interface SaveAsTemplateInput {
  isPublic?: boolean;
  name?: string;
}

export interface CreateFromTemplateInput {
  templateId: number;
  name: string;
  description?: string;
}

export interface GroupShareInfo {
  groupId: number;
  groupName: string;
  description: string | null;
  memberCount: number;
  ownerUsername: string;
  ownerDisplayName: string | null;
  color: string;
  icon: string;
  isQuotePool: boolean;
}
