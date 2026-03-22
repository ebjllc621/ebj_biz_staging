/**
 * ConnectionGroupService - User Connection Group Management
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 * @reference src/features/connections/services/ConnectionService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { SharingService } from '@features/contacts/services/SharingService';
import { SHARING_POINTS } from '@features/contacts/types/sharing';
import {
  ConnectionGroup,
  GroupMember,
  CreateGroupInput,
  UpdateGroupInput,
  GetGroupsOptions,
  SharedGroupConnection,
  ConnectionGroupRecommendationData,
  AddMembersResult,
  GroupStats,
  QuotePoolInvitation,
  SendQuoteToGroupInput,
  GroupBidComparison,
  QuotePoolMemberBid,
  InviteToQuotePoolInput,
  GroupAnalytics,
  GroupActivityTimelinePoint,
  UserGroupsSummary,
  GroupMemberEngagement,
  AdminGroupAnalytics,
  GroupTemplate,
  SaveAsTemplateInput,
  GroupShareInfo
} from '../types/groups';
import {
  GroupMessage,
  SendGroupMessageInput,
  GroupMessageThread,
  GroupListingRecommendation,
  SendGroupListingRecommendationInput,
  GroupActivity,
  GroupActivityType,
  GroupMemberNotificationPreferences,
  UpdateMemberNotificationPreferencesInput,
  GroupMemberSuggestion,
  SuggestMemberInput,
  ReviewSuggestionInput
} from '../types/group-actions';
import { NotificationService } from '@core/services/NotificationService';
import { safeJsonParse } from '@core/utils/json';

// ============================================================================
// Custom Errors
// ============================================================================

export class ConnectionGroupError extends BizError {
  constructor(message: string) {
    super({ code: 'CONNECTION_GROUP_ERROR', message, userMessage: message });
    this.name = 'ConnectionGroupError';
  }
}

export class ConnectionGroupNotFoundError extends BizError {
  constructor(message = 'Connection group not found') {
    super({ code: 'CONNECTION_GROUP_NOT_FOUND', message, userMessage: message });
    this.name = 'ConnectionGroupNotFoundError';
  }
}

export class GroupMemberNotFoundError extends BizError {
  constructor(message = 'Group member not found') {
    super({ code: 'GROUP_MEMBER_NOT_FOUND', message, userMessage: message });
    this.name = 'GroupMemberNotFoundError';
  }
}

export class UnauthorizedGroupAccessError extends BizError {
  constructor(message = 'Not authorized to access this group') {
    super({ code: 'UNAUTHORIZED_GROUP_ACCESS', message, userMessage: message });
    this.name = 'UnauthorizedGroupAccessError';
  }
}

export class DuplicateGroupMemberError extends BizError {
  constructor(message = 'Member already in group') {
    super({ code: 'DUPLICATE_GROUP_MEMBER', message, userMessage: message });
    this.name = 'DuplicateGroupMemberError';
  }
}

export class NotAConnectionError extends BizError {
  constructor(message = 'User is not a connection') {
    super({ code: 'NOT_A_CONNECTION', message, userMessage: message });
    this.name = 'NotAConnectionError';
  }
}

// ============================================================================
// ConnectionGroupService Implementation
// ============================================================================

export class ConnectionGroupService {
  private db: DatabaseService;
  private sharingService: SharingService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService) {
    this.db = db;
    this.sharingService = new SharingService(db);
    this.notificationService = new NotificationService(db);
  }

  /**
   * Create a new connection group
   */
  async createGroup(userId: number, input: CreateGroupInput): Promise<ConnectionGroup> {
    const {
      name,
      description = null,
      color = '#3B82F6',
      icon = 'users',
      enableMemberRecommendations = true,
      isQuotePool = false,
      quotePoolCategory = null
    } = input;

    const result = await this.db.query(
      `INSERT INTO connection_groups
       (user_id, name, description, color, icon, enable_member_recommendations, is_quote_pool, quote_pool_category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, description, color, icon, enableMemberRecommendations, isQuotePool, quotePoolCategory]
    );

    const groupId = result.insertId;
    if (!groupId) {
      throw new ConnectionGroupError('Failed to create group');
    }

    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupError('Failed to retrieve created group');
    }

    return group;
  }

  /**
   * Get a single group by ID (with ownership check)
   */
  async getGroup(groupId: number, userId: number): Promise<ConnectionGroup | null> {
    const result = await this.db.query(
      `SELECT
        cg.id,
        cg.user_id AS userId,
        cg.name,
        cg.description,
        cg.color,
        cg.icon,
        cg.is_quote_pool AS isQuotePool,
        cg.quote_pool_category AS quotePoolCategory,
        cg.enable_member_recommendations AS enableMemberRecommendations,
        cg.recommendation_visibility AS recommendationVisibility,
        cg.is_archived AS isArchived,
        cg.created_at AS createdAt,
        cg.updated_at AS updatedAt,
        COUNT(cgm.id) AS memberCount
       FROM connection_groups cg
       LEFT JOIN connection_group_members cgm ON cg.id = cgm.group_id
       WHERE cg.id = ? AND (
         cg.user_id = ?
         OR cg.id IN (SELECT cgm2.group_id FROM connection_group_members cgm2 WHERE cgm2.member_user_id = ?)
       )
       GROUP BY cg.id`,
      [groupId, userId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as Record<string, unknown>;
    return {
      ...row,
      memberCount: bigIntToNumber(row.memberCount as bigint | number)
    } as ConnectionGroup;
  }

  /**
   * Get all groups for a user
   */
  async getUserGroups(
    userId: number,
    options: GetGroupsOptions = {}
  ): Promise<ConnectionGroup[]> {
    const {
      includeArchived = false,
      limit = 100,
      offset = 0
    } = options;

    const conditions: string[] = ['cg.user_id = ?'];
    const params: unknown[] = [userId];

    if (!includeArchived) {
      conditions.push('cg.is_archived = FALSE');
    }

    const result = await this.db.query(
      `SELECT
        cg.id,
        cg.user_id AS userId,
        cg.name,
        cg.description,
        cg.color,
        cg.icon,
        cg.is_quote_pool AS isQuotePool,
        cg.quote_pool_category AS quotePoolCategory,
        cg.enable_member_recommendations AS enableMemberRecommendations,
        cg.recommendation_visibility AS recommendationVisibility,
        cg.is_archived AS isArchived,
        cg.created_at AS createdAt,
        cg.updated_at AS updatedAt,
        COUNT(cgm.id) AS memberCount
       FROM connection_groups cg
       LEFT JOIN connection_group_members cgm ON cg.id = cgm.group_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY cg.id
       ORDER BY cg.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const rows = result.rows as Record<string, unknown>[];
    return rows.map((row) => ({
      ...row,
      memberCount: bigIntToNumber(row.memberCount as bigint | number)
    })) as ConnectionGroup[];
  }

  /**
   * Update a group
   */
  async updateGroup(
    groupId: number,
    userId: number,
    input: UpdateGroupInput
  ): Promise<ConnectionGroup> {
    // Verify ownership
    const hasAccess = await this.verifyGroupOwnership(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description);
    }
    if (input.color !== undefined) {
      updates.push('color = ?');
      params.push(input.color);
    }
    if (input.icon !== undefined) {
      updates.push('icon = ?');
      params.push(input.icon);
    }
    if (input.enableMemberRecommendations !== undefined) {
      updates.push('enable_member_recommendations = ?');
      params.push(input.enableMemberRecommendations);
    }
    if (input.recommendationVisibility !== undefined) {
      updates.push('recommendation_visibility = ?');
      params.push(input.recommendationVisibility);
    }

    if (updates.length === 0) {
      throw new ConnectionGroupError('No fields to update');
    }

    params.push(groupId);

    await this.db.query(
      `UPDATE connection_groups SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupNotFoundError();
    }

    return group;
  }

  /**
   * Delete (archive) a group
   */
  async deleteGroup(groupId: number, userId: number): Promise<void> {
    // Verify ownership
    const hasAccess = await this.verifyGroupOwnership(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    await this.db.query(
      'UPDATE connection_groups SET is_archived = TRUE WHERE id = ?',
      [groupId]
    );
  }

  /**
   * Restore (unarchive) a group
   */
  async restoreGroup(groupId: number, userId: number): Promise<ConnectionGroup> {
    const hasAccess = await this.verifyGroupOwnership(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    await this.db.query(
      'UPDATE connection_groups SET is_archived = FALSE WHERE id = ?',
      [groupId]
    );

    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupError('Failed to retrieve restored group');
    }
    return group;
  }

  /**
   * Add members to a group and generate attributed recommendations
   * for unconnected member pairs
   *
   * When members are added:
   * 1. Detects unconnected pairs among ALL group members
   * 2. Creates bidirectional recommendations attributed to group creator
   * 3. Group creator earns 10 points per recommendation (capped at 50 per operation)
   * 4. Tracks recommendations in connection_group_recommendations table
   */
  async addMembers(
    groupId: number,
    userId: number,
    memberIds: number[]
  ): Promise<AddMembersResult> {
    // Verify ownership
    const hasAccess = await this.verifyGroupOwnership(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    // Get the group to check if recommendations are enabled
    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupNotFoundError();
    }

    const members: GroupMember[] = [];

    for (const memberId of memberIds) {
      // Verify member is a connection
      const isConnection = await this.verifyMemberIsConnection(userId, memberId);
      if (!isConnection) {
        throw new NotAConnectionError(`User ${memberId} is not a connection`);
      }

      // Check if already in group
      const existing = await this.db.query(
        'SELECT id FROM connection_group_members WHERE group_id = ? AND member_user_id = ?',
        [groupId, memberId]
      );

      if (existing.rows.length > 0) {
        continue; // Skip duplicates
      }

      // Add member
      await this.db.query(
        `INSERT INTO connection_group_members
         (group_id, member_user_id, added_by)
         VALUES (?, ?, ?)`,
        [groupId, memberId, userId]
      );

      const member = await this.getGroupMember(groupId, memberId);
      if (member) {
        members.push(member);

        // Dispatch notification to the added member
        try {
          await this.notificationService.dispatch({
            type: 'group.member_added',
            recipientId: memberId,
            title: `You've been added to ${group.name}`,
            message: `You were added to a connection group`,
            priority: 'normal',
            actionUrl: `/dashboard/connections/groups/${groupId}`,
            triggeredBy: userId,
            metadata: { groupId, groupName: group.name }
          });
        } catch (error) {
          console.error(`Failed to send member_added notification to ${memberId}:`, error);
        }

        // Log activity for member addition
        await this.logGroupActivity(groupId, userId, 'member_added', 'Added a member', {
          targetType: 'user',
          targetId: memberId
        });
      }
    }

    // Generate recommendations if enabled for this group
    let recommendationsCreated = 0;
    let potentialPoints = 0;

    if (group.enableMemberRecommendations && members.length > 0) {
      // Get ALL members of the group (including newly added)
      const allMembers = await this.getGroupMembers(groupId, userId);
      const allMemberIds = allMembers.map(m => m.memberUserId);

      // Find unconnected pairs
      const unconnectedPairs = await this.findUnconnectedPairs(allMemberIds);

      // Create recommendations for unconnected pairs (cap at 5 pairs = 10 recommendations = 50 pts)
      const MAX_RECOMMENDATIONS = 10; // 5 pairs × 2 directions
      const recommendations = await this.createGroupRecommendations(
        groupId,
        userId,
        group.name,
        unconnectedPairs,
        MAX_RECOMMENDATIONS
      );

      recommendationsCreated = recommendations.length;
      potentialPoints = Math.min(recommendationsCreated * SHARING_POINTS.recommend_user, 50);
    }

    return {
      members,
      recommendationsCreated,
      potentialPoints
    };
  }

  /**
   * Find pairs of users who are not connected to each other
   */
  private async findUnconnectedPairs(userIds: number[]): Promise<[number, number][]> {
    const pairs: [number, number][] = [];

    for (let i = 0; i < userIds.length; i++) {
      for (let j = i + 1; j < userIds.length; j++) {
        const userA = userIds[i]!;
        const userB = userIds[j]!;

        const isConnected = await this.areUsersConnected(userA, userB);
        if (!isConnected) {
          pairs.push([userA, userB]);
        }
      }
    }

    return pairs;
  }

  /**
   * Check if two users are already connected
   */
  private async areUsersConnected(userA: number, userB: number): Promise<boolean> {
    const result = await this.db.query(
      `SELECT id FROM user_connection
       WHERE ((sender_user_id = ? AND receiver_user_id = ?)
           OR (sender_user_id = ? AND receiver_user_id = ?))
         AND status = 'connected'`,
      [userA, userB, userB, userA]
    );

    return result.rows.length > 0;
  }

  /**
   * Create attributed recommendations for unconnected pairs
   * Returns the number of recommendations created
   */
  private async createGroupRecommendations(
    groupId: number,
    creatorUserId: number,
    groupName: string,
    pairs: [number, number][],
    maxRecommendations: number
  ): Promise<{ referralId: number; recipientUserId: number; recommendedUserId: number }[]> {
    const recommendations: { referralId: number; recipientUserId: number; recommendedUserId: number }[] = [];
    let count = 0;

    for (const [userA, userB] of pairs) {
      if (count >= maxRecommendations) break;

      // Check if recommendation A→B already exists from this group
      const existingAtoB = await this.findExistingGroupRecommendation(
        groupId, userA, userB
      );

      if (!existingAtoB) {
        try {
          // Creator recommends userB to userA
          const recAtoB = await this.sharingService.createRecommendation(creatorUserId, {
            recipient_user_id: userA,
            entity_type: 'user',
            entity_id: String(userB),
            message: `You're both in "${groupName}" - you might want to connect!`
          });

          // Track in connection_group_recommendations table
          await this.trackGroupRecommendation(groupId, recAtoB.id, userA, userB);

          recommendations.push({
            referralId: recAtoB.id,
            recipientUserId: userA,
            recommendedUserId: userB
          });
          count++;
        } catch (error) {
          // Log but continue - don't fail entire operation for one recommendation
          console.error(`Failed to create recommendation for pair ${userA}-${userB}:`, error);
        }
      }

      if (count >= maxRecommendations) break;

      // Check reverse direction B→A
      const existingBtoA = await this.findExistingGroupRecommendation(
        groupId, userB, userA
      );

      if (!existingBtoA) {
        try {
          // Creator recommends userA to userB
          const recBtoA = await this.sharingService.createRecommendation(creatorUserId, {
            recipient_user_id: userB,
            entity_type: 'user',
            entity_id: String(userA),
            message: `You're both in "${groupName}" - you might want to connect!`
          });

          // Track in connection_group_recommendations table
          await this.trackGroupRecommendation(groupId, recBtoA.id, userB, userA);

          recommendations.push({
            referralId: recBtoA.id,
            recipientUserId: userB,
            recommendedUserId: userA
          });
          count++;
        } catch (error) {
          console.error(`Failed to create recommendation for pair ${userB}-${userA}:`, error);
        }
      }
    }

    return recommendations;
  }

  /**
   * Check if a group recommendation already exists for this pair
   */
  private async findExistingGroupRecommendation(
    groupId: number,
    recipientUserId: number,
    recommendedUserId: number
  ): Promise<boolean> {
    const result = await this.db.query(
      `SELECT id FROM connection_group_recommendations
       WHERE group_id = ?
         AND recommended_pair_user_a = ?
         AND recommended_pair_user_b = ?`,
      [groupId, recipientUserId, recommendedUserId]
    );

    return result.rows.length > 0;
  }

  /**
   * Track a recommendation in the connection_group_recommendations table
   */
  private async trackGroupRecommendation(
    groupId: number,
    referralId: number,
    recipientUserId: number,
    recommendedUserId: number
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO connection_group_recommendations
       (group_id, referral_id, recommended_pair_user_a, recommended_pair_user_b, recommendation_status)
       VALUES (?, ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE referral_id = VALUES(referral_id)`,
      [groupId, referralId, recipientUserId, recommendedUserId]
    );
  }

  /**
   * Remove a member from a group
   */
  async removeMember(groupId: number, userId: number, memberId: number): Promise<void> {
    // Verify ownership
    const hasAccess = await this.verifyGroupOwnership(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    // Get group info for notification before deleting member
    const group = await this.getGroup(groupId, userId);
    if (group) {
      // Dispatch notification to the removed member
      try {
        await this.notificationService.dispatch({
          type: 'group.member_removed',
          recipientId: memberId,
          title: `Removed from ${group.name}`,
          message: `You've been removed from this connection group`,
          priority: 'normal',
          triggeredBy: userId,
          metadata: { groupId, groupName: group.name }
        });
      } catch (error) {
        console.error(`Failed to send member_removed notification to ${memberId}:`, error);
      }

      // Log activity for member removal
      await this.logGroupActivity(groupId, userId, 'member_removed', 'Removed a member', {
        targetType: 'user',
        targetId: memberId
      });
    }

    await this.db.query(
      'DELETE FROM connection_group_members WHERE group_id = ? AND member_user_id = ?',
      [groupId, memberId]
    );
  }

  /**
   * Get all members of a group
   */
  async getGroupMembers(groupId: number, userId: number): Promise<GroupMember[]> {
    // Verify access (owner or member)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const result = await this.db.query(
      `SELECT
        cgm.id,
        cgm.group_id AS groupId,
        cgm.member_user_id AS memberUserId,
        cgm.added_at AS addedAt,
        cgm.added_by AS addedBy,
        cgm.notes,
        cgm.pymk_opt_out AS pymkOptOut,
        cgm.notify_messages AS notifyMessages,
        cgm.notify_activity AS notifyActivity,
        cgm.notify_recommendations AS notifyRecommendations,
        cgm.tab_access AS tabAccess,
        cgm.is_muted AS isMuted,
        u.username,
        u.display_name AS displayName,
        u.avatar_url AS avatarUrl,
        u.avatar_bg_color AS avatarBgColor
       FROM connection_group_members cgm
       INNER JOIN users u ON cgm.member_user_id = u.id
       WHERE cgm.group_id = ?
       ORDER BY cgm.added_at DESC`,
      [groupId]
    );

    return (result.rows as GroupMember[]).map(m => ({
      ...m,
      tabAccess: typeof m.tabAccess === 'string' ? safeJsonParse<string[]>(m.tabAccess) : (m.tabAccess ?? null)
    }));
  }

  /**
   * Get groups that a user is a member of (not owner)
   */
  async getMemberGroups(userId: number): Promise<ConnectionGroup[]> {
    const result = await this.db.query(
      `SELECT
        cg.id,
        cg.user_id AS userId,
        cg.name,
        cg.description,
        cg.color,
        cg.icon,
        cg.is_quote_pool AS isQuotePool,
        cg.quote_pool_category AS quotePoolCategory,
        cg.enable_member_recommendations AS enableMemberRecommendations,
        cg.recommendation_visibility AS recommendationVisibility,
        cg.is_archived AS isArchived,
        cg.created_at AS createdAt,
        cg.updated_at AS updatedAt,
        COUNT(cgm2.id) AS memberCount
       FROM connection_group_members cgm
       INNER JOIN connection_groups cg ON cgm.group_id = cg.id
       LEFT JOIN connection_group_members cgm2 ON cg.id = cgm2.group_id
       WHERE cgm.member_user_id = ? AND cg.is_archived = FALSE
       GROUP BY cg.id
       ORDER BY cgm.added_at DESC`,
      [userId]
    );

    const rows = result.rows as Record<string, unknown>[];
    return rows.map((row) => ({
      ...row,
      memberCount: bigIntToNumber(row.memberCount as bigint | number)
    })) as ConnectionGroup[];
  }

  /**
   * Get shared group connections for PYMK
   */
  async getSharedGroupConnections(userId: number): Promise<SharedGroupConnection[]> {
    const result = await this.db.query(
      `SELECT
        cgm2.member_user_id AS userId,
        u.username,
        u.display_name AS displayName,
        u.avatar_url AS avatarUrl,
        u.avatar_bg_color AS avatarBgColor,
        GROUP_CONCAT(DISTINCT cg.id) AS groupIds,
        GROUP_CONCAT(DISTINCT cg.name) AS groupNames,
        COUNT(DISTINCT cg.id) AS totalSharedGroups,
        cg.user_id AS curatorUserId,
        curator.username AS curatorUsername,
        curator.display_name AS curatorDisplayName
       FROM connection_group_members cgm1
       INNER JOIN connection_group_members cgm2
         ON cgm1.group_id = cgm2.group_id
         AND cgm1.member_user_id != cgm2.member_user_id
       INNER JOIN connection_groups cg
         ON cgm1.group_id = cg.id
         AND cg.enable_member_recommendations = TRUE
         AND cg.is_archived = FALSE
       INNER JOIN users u ON cgm2.member_user_id = u.id
       INNER JOIN users curator ON cg.user_id = curator.id
       WHERE cgm1.member_user_id = ?
         AND cgm2.pymk_opt_out = FALSE
         AND cgm2.member_user_id NOT IN (
           SELECT receiver_user_id FROM user_connection
           WHERE sender_user_id = ? AND status = 'connected'
           UNION
           SELECT sender_user_id FROM user_connection
           WHERE receiver_user_id = ? AND status = 'connected'
         )
       GROUP BY cgm2.member_user_id, cg.user_id, curator.username, curator.display_name
       ORDER BY totalSharedGroups DESC
       LIMIT 50`,
      [userId, userId, userId]
    );

    const rows = result.rows as Record<string, unknown>[];
    return rows.map((row) => {
      const groupIds = (row.groupIds as string).split(',').map(Number);
      const groupNames = (row.groupNames as string).split(',');
      const sharedGroups = groupIds.map((id, index) => ({
        groupId: id,
        groupName: groupNames[index],
        curatorUserId: row.curatorUserId as number,
        curatorUsername: row.curatorUsername as string,
        curatorDisplayName: row.curatorDisplayName as string | null
      }));

      return {
        userId: row.userId as number,
        username: row.username as string,
        displayName: row.displayName as string | null,
        avatarUrl: row.avatarUrl as string | null,
        avatarBgColor: row.avatarBgColor as string | null,
        sharedGroups,
        totalSharedGroups: bigIntToNumber(row.totalSharedGroups as bigint | number)
      };
    }) as SharedGroupConnection[];
  }

  /**
   * Calculate group recommendation score for PYMK
   */
  async calculateGroupRecommendationScore(
    userId: number,
    candidateId: number,
    weight: number
  ): Promise<{ score: number; data: ConnectionGroupRecommendationData | null }> {
    const result = await this.db.query(
      `SELECT
        cg.id AS groupId,
        cg.name AS groupName,
        cg.user_id AS curatorUserId,
        curator.username AS curatorUsername,
        curator.display_name AS curatorDisplayName,
        COUNT(DISTINCT cg.id) AS sharedGroupCount
       FROM connection_group_members cgm1
       INNER JOIN connection_group_members cgm2
         ON cgm1.group_id = cgm2.group_id
       INNER JOIN connection_groups cg ON cgm1.group_id = cg.id
       INNER JOIN users curator ON cg.user_id = curator.id
       WHERE cgm1.member_user_id = ?
         AND cgm2.member_user_id = ?
         AND cg.enable_member_recommendations = TRUE
         AND cg.is_archived = FALSE
         AND cgm1.pymk_opt_out = FALSE
         AND cgm2.pymk_opt_out = FALSE
       GROUP BY cg.id, cg.name, cg.user_id, curator.username, curator.display_name
       ORDER BY sharedGroupCount DESC
       LIMIT 5`,
      [userId, candidateId]
    );

    if (result.rows.length === 0) {
      return { score: 0, data: null };
    }

    const rows = result.rows as Record<string, unknown>[];
    const sharedGroups = rows.map((row) => ({
      groupId: row.groupId as number,
      groupName: row.groupName as string,
      curatorUserId: row.curatorUserId as number,
      curatorUsername: row.curatorUsername as string,
      curatorDisplayName: row.curatorDisplayName as string | null
    }));

    const totalSharedGroups = sharedGroups.length;
    const score = Math.min(weight, totalSharedGroups * (weight / 3));

    // firstGroup is guaranteed to exist since we checked result.rows.length > 0 above
    const firstGroup = sharedGroups[0]!;
    const data: ConnectionGroupRecommendationData = {
      sharedGroups,
      totalSharedGroups,
      primaryGroup: {
        groupId: firstGroup.groupId,
        groupName: firstGroup.groupName,
        curatorUsername: firstGroup.curatorUsername
      }
    };

    return { score, data };
  }

  /**
   * Set PYMK opt-out for a group member
   */
  async setGroupPymkOptOut(
    groupId: number,
    memberId: number,
    optOut: boolean
  ): Promise<void> {
    await this.db.query(
      'UPDATE connection_group_members SET pymk_opt_out = ? WHERE group_id = ? AND member_user_id = ?',
      [optOut, groupId, memberId]
    );
  }

  /**
   * Verify user owns a group
   */
  async verifyGroupOwnership(groupId: number, userId: number): Promise<boolean> {
    const result = await this.db.query(
      'SELECT id FROM connection_groups WHERE id = ? AND user_id = ?',
      [groupId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Verify a user has access to a group (owner OR member)
   */
  async verifyGroupAccess(groupId: number, userId: number): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM connection_groups WHERE id = ? AND user_id = ?
       UNION
       SELECT 1 FROM connection_group_members WHERE group_id = ? AND member_user_id = ?`,
      [groupId, userId, groupId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Verify a user is a connection of the owner
   */
  async verifyMemberIsConnection(ownerId: number, memberId: number): Promise<boolean> {
    const result = await this.db.query(
      `SELECT id FROM user_connection
       WHERE ((sender_user_id = ? AND receiver_user_id = ?)
           OR (sender_user_id = ? AND receiver_user_id = ?))
         AND status = 'connected'`,
      [ownerId, memberId, memberId, ownerId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get a single group member
   */
  private async getGroupMember(groupId: number, memberId: number): Promise<GroupMember | null> {
    const result = await this.db.query(
      `SELECT
        cgm.id,
        cgm.group_id AS groupId,
        cgm.member_user_id AS memberUserId,
        cgm.added_at AS addedAt,
        cgm.added_by AS addedBy,
        cgm.notes,
        cgm.pymk_opt_out AS pymkOptOut,
        cgm.notify_messages AS notifyMessages,
        cgm.notify_activity AS notifyActivity,
        cgm.notify_recommendations AS notifyRecommendations,
        cgm.tab_access AS tabAccess,
        cgm.is_muted AS isMuted,
        u.username,
        u.display_name AS displayName,
        u.avatar_url AS avatarUrl,
        u.avatar_bg_color AS avatarBgColor
       FROM connection_group_members cgm
       INNER JOIN users u ON cgm.member_user_id = u.id
       WHERE cgm.group_id = ? AND cgm.member_user_id = ?`,
      [groupId, memberId]
    );

    if (result.rows.length === 0) return null;
    const member = result.rows[0] as GroupMember;
    return {
      ...member,
      tabAccess: typeof member.tabAccess === 'string' ? safeJsonParse<string[]>(member.tabAccess) : (member.tabAccess ?? null)
    };
  }

  /**
   * Get group stats for a user
   */
  async getGroupStats(userId: number): Promise<GroupStats> {
    // Get basic group and member counts
    const basicResult = await this.db.query(
      `SELECT
        COUNT(DISTINCT cg.id) AS totalGroups,
        COUNT(DISTINCT cgm.id) AS totalMembers
       FROM connection_groups cg
       LEFT JOIN connection_group_members cgm ON cg.id = cgm.group_id
       WHERE cg.user_id = ? AND cg.is_archived = FALSE`,
      [userId]
    );

    // Get recommendation stats from connection_group_recommendations
    const recResult = await this.db.query(
      `SELECT
        COUNT(*) AS recommendationsCreated,
        COALESCE(SUM(CASE WHEN cgr.recommendation_status = 'connected' THEN 1 ELSE 0 END), 0) AS recommendationsAccepted
       FROM connection_group_recommendations cgr
       INNER JOIN connection_groups cg ON cgr.group_id = cg.id
       WHERE cg.user_id = ? AND cg.is_archived = FALSE`,
      [userId]
    );

    // Get points earned from user_rewards for recommendation_sent related to groups
    // Points are awarded when recommendations are created via SharingService
    const pointsResult = await this.db.query(
      `SELECT COALESCE(SUM(ur.points_earned), 0) AS pointsEarned
       FROM user_rewards ur
       WHERE ur.user_id = ?
         AND ur.reward_type IN ('recommendation_sent', 'recommendation_helpful', 'recommendation_thanked')
         AND ur.referral_id IN (
           SELECT cgr.referral_id
           FROM connection_group_recommendations cgr
           INNER JOIN connection_groups cg ON cgr.group_id = cg.id
           WHERE cg.user_id = ?
         )`,
      [userId, userId]
    );

    const basicRow = basicResult.rows[0] as Record<string, unknown>;
    const recRow = recResult.rows[0] as Record<string, unknown>;
    const pointsRow = pointsResult.rows[0] as Record<string, unknown>;

    return {
      totalGroups: bigIntToNumber(basicRow.totalGroups as bigint | number),
      totalMembers: bigIntToNumber(basicRow.totalMembers as bigint | number),
      recommendationsCreated: bigIntToNumber(recRow.recommendationsCreated as bigint | number),
      recommendationsAccepted: bigIntToNumber(recRow.recommendationsAccepted as bigint | number),
      pointsEarned: bigIntToNumber(pointsRow.pointsEarned as bigint | number)
    };
  }

  // ==========================================================================
  // GROUP MESSAGING (PHASE 2)
  // ==========================================================================

  /**
   * Send a message to all group members
   * @returns Created message with delivery stats
   */
  async sendGroupMessage(
    userId: number,
    input: SendGroupMessageInput
  ): Promise<{ message: GroupMessage; deliveredTo: number }> {
    const { groupId, subject, content, contentType = 'text', attachments, metadata, replyToId } = input;

    // Verify access (owner or member can send messages)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    // Get group and check message permissions
    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupNotFoundError();
    }

    // Create message
    const result = await this.db.query(
      `INSERT INTO group_messages
       (group_id, sender_user_id, subject, content, content_type, attachments, metadata, reply_to_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupId,
        userId,
        subject || null,
        content,
        contentType,
        attachments ? JSON.stringify(attachments) : null,
        metadata ? JSON.stringify(metadata) : null,
        replyToId || null
      ]
    );

    const messageId = result.insertId;
    if (!messageId) {
      throw new ConnectionGroupError('Failed to create group message');
    }

    // Fetch created message
    const message = await this.getGroupMessage(messageId, userId);
    if (!message) {
      throw new ConnectionGroupError('Failed to retrieve created message');
    }

    // Get all group members (excluding sender)
    const members = await this.getGroupMembers(groupId, userId);
    const recipients = members.filter(m => m.memberUserId !== userId && m.notifyMessages !== false);

    // Dispatch notifications to all members
    for (const member of recipients) {
      try {
        await this.notificationService.dispatch({
          type: 'group.message_posted',
          recipientId: member.memberUserId,
          title: `New message in ${group.name}`,
          message: content.substring(0, 100),
          priority: 'normal',
          actionUrl: `/dashboard/connections/groups/${groupId}/messages`,
          triggeredBy: userId,
          metadata: {
            groupId,
            groupName: group.name,
            messageId: message.id
          }
        });
      } catch (error) {
        console.error(`Failed to send notification to member ${member.memberUserId}:`, error);
      }
    }

    // Parse @mentions and dispatch mention notifications
    const mentionRegex = /\B@([a-zA-Z0-9_]+)/g;
    const mentionedUsernames: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      if (username) mentionedUsernames.push(username);
    }

    if (mentionedUsernames.length > 0) {
      for (const username of mentionedUsernames) {
        const mentionedMember = members.find(
          m => m.username.toLowerCase() === username.toLowerCase()
        );
        if (mentionedMember) {
          try {
            await this.notificationService.dispatch({
              type: 'group.member_mentioned',
              recipientId: mentionedMember.memberUserId,
              title: `You were mentioned in ${group.name}`,
              message: content.substring(0, 100),
              priority: 'normal',
              actionUrl: `/dashboard/connections/groups/${groupId}/messages`,
              triggeredBy: userId,
              metadata: {
                groupId,
                groupName: group.name,
                messageId: message.id,
                mentionedUsername: username
              }
            });
          } catch (error) {
            console.error(`Failed to send mention notification to ${username}:`, error);
          }
        }
      }
    }

    // Log activity
    await this.logGroupActivity(
      groupId,
      userId,
      'message_posted',
      'Posted a message',
      {
        description: subject || content.substring(0, 50),
        targetType: 'message',
        targetId: messageId
      }
    );

    return {
      message,
      deliveredTo: recipients.length
    };
  }

  /**
   * Get messages for a group
   * @returns Paginated messages with sender info
   */
  async getGroupMessages(
    groupId: number,
    userId: number,
    options?: { limit?: number; before?: number }
  ): Promise<{ messages: GroupMessage[]; hasMore: boolean }> {
    // Verify access (owner or member)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const { limit = 50, before } = options || {};

    const conditions: string[] = ['gm.group_id = ?', 'gm.is_deleted = FALSE'];
    const params: unknown[] = [groupId];

    if (before) {
      conditions.push('gm.id < ?');
      params.push(before);
    }

    const result = await this.db.query(
      `SELECT
        gm.id,
        gm.group_id AS groupId,
        gm.sender_user_id AS senderUserId,
        gm.subject,
        gm.content,
        gm.content_type AS contentType,
        gm.attachments,
        gm.metadata,
        gm.is_pinned AS isPinned,
        gm.is_deleted AS isDeleted,
        gm.deleted_at AS deletedAt,
        gm.deleted_by AS deletedBy,
        gm.reply_to_id AS replyToId,
        gm.created_at AS createdAt,
        gm.updated_at AS updatedAt,
        u.username AS senderUsername,
        u.display_name AS senderDisplayName,
        u.avatar_url AS senderAvatarUrl,
        u.avatar_bg_color AS senderAvatarBgColor,
        rm.content AS replyToContent,
        ru.username AS replyToSenderUsername,
        ru.display_name AS replyToSenderDisplayName
       FROM group_messages gm
       INNER JOIN users u ON gm.sender_user_id = u.id
       LEFT JOIN group_messages rm ON gm.reply_to_id = rm.id
       LEFT JOIN users ru ON rm.sender_user_id = ru.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY gm.is_pinned DESC, gm.created_at DESC
       LIMIT ?`,
      [...params, limit + 1]
    );
    const rows = result.rows as Record<string, unknown>[];
    const hasMore = rows.length > limit;
    const messageIds = rows.slice(0, limit).map(r => r.id as number);

    // Fetch reactions for all messages in batch
    let reactionsByMessage: Record<number, GroupMessage['reactions']> = {};
    if (messageIds.length > 0) {
      reactionsByMessage = await this.getGroupMessageReactions(messageIds, userId);
    }

    const messages = rows.slice(0, limit).map(row => ({
      ...row,
      attachments: row.attachments ? (safeJsonParse(row.attachments as string) ?? []) : null,
      metadata: row.metadata ? safeJsonParse(row.metadata as string) : null,
      replyToContent: row.replyToContent || null,
      replyToSenderUsername: row.replyToSenderUsername || null,
      replyToSenderDisplayName: row.replyToSenderDisplayName || null,
      reactions: reactionsByMessage[row.id as number] || []
    })) as GroupMessage[];

    return { messages, hasMore };
  }

  /**
   * Batch-fetch reactions for multiple group messages
   */
  private async getGroupMessageReactions(
    messageIds: number[],
    currentUserId: number
  ): Promise<Record<number, GroupMessage['reactions']>> {
    if (messageIds.length === 0) return {};

    const placeholders = messageIds.map(() => '?').join(',');
    const rows = await this.db.query(
      `SELECT r.message_id, r.emoji, r.user_id, u.username
       FROM group_message_reactions r
       JOIN users u ON u.id = r.user_id
       WHERE r.message_id IN (${placeholders})
       ORDER BY r.created_at`,
      messageIds
    );

    const result: Record<number, Record<string, { emoji: string; count: number; reactedByMe: boolean; users: { userId: number; username: string }[] }>> = {};

    for (const row of (rows.rows || rows) as Array<{ message_id: number; emoji: string; user_id: number; username: string }>) {
      if (!result[row.message_id]) result[row.message_id] = {};
      const msgBucket = result[row.message_id]!;
      if (!msgBucket[row.emoji]) {
        msgBucket[row.emoji] = { emoji: row.emoji, count: 0, reactedByMe: false, users: [] };
      }
      const entry = msgBucket[row.emoji]!;
      entry.count++;
      entry.users.push({ userId: row.user_id, username: row.username });
      if (row.user_id === currentUserId) {
        entry.reactedByMe = true;
      }
    }

    const mapped: Record<number, GroupMessage['reactions']> = {};
    for (const msgId of Object.keys(result)) {
      mapped[Number(msgId)] = Object.values(result[Number(msgId)]!);
    }
    return mapped;
  }

  /**
   * Get single group message
   */
  async getGroupMessage(
    messageId: number,
    userId: number
  ): Promise<GroupMessage | null> {
    const result = await this.db.query(
      `SELECT
        gm.id,
        gm.group_id AS groupId,
        gm.sender_user_id AS senderUserId,
        gm.subject,
        gm.content,
        gm.content_type AS contentType,
        gm.attachments,
        gm.metadata,
        gm.is_pinned AS isPinned,
        gm.is_deleted AS isDeleted,
        gm.deleted_at AS deletedAt,
        gm.deleted_by AS deletedBy,
        gm.reply_to_id AS replyToId,
        gm.created_at AS createdAt,
        gm.updated_at AS updatedAt,
        u.username AS senderUsername,
        u.display_name AS senderDisplayName,
        u.avatar_url AS senderAvatarUrl,
        u.avatar_bg_color AS senderAvatarBgColor,
        cg.user_id AS groupOwnerId,
        rm.content AS replyToContent,
        ru.username AS replyToSenderUsername,
        ru.display_name AS replyToSenderDisplayName
       FROM group_messages gm
       INNER JOIN users u ON gm.sender_user_id = u.id
       INNER JOIN connection_groups cg ON gm.group_id = cg.id
       LEFT JOIN group_messages rm ON gm.reply_to_id = rm.id
       LEFT JOIN users ru ON rm.sender_user_id = ru.id
       WHERE gm.id = ?`,
      [messageId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as Record<string, unknown>;

    // Verify user has access (owner or member)
    const groupId = row.groupId as number;
    if (row.groupOwnerId !== userId) {
      const isMember = await this.verifyGroupAccess(groupId, userId);
      if (!isMember) {
        throw new UnauthorizedGroupAccessError();
      }
    }

    return {
      ...row,
      attachments: row.attachments ? (safeJsonParse(row.attachments as string) ?? []) : null,
      metadata: row.metadata ? safeJsonParse(row.metadata as string) : null,
      replyToContent: row.replyToContent || null,
      replyToSenderUsername: row.replyToSenderUsername || null,
      replyToSenderDisplayName: row.replyToSenderDisplayName || null
    } as GroupMessage;
  }

  /**
   * Delete a group message (soft delete)
   * Only sender or group owner can delete
   */
  async deleteGroupMessage(
    messageId: number,
    userId: number
  ): Promise<void> {
    // Get message to verify permissions
    const message = await this.getGroupMessage(messageId, userId);
    if (!message) {
      throw new ConnectionGroupError('Message not found');
    }

    // Verify user is sender or group owner
    const isOwner = await this.verifyGroupOwnership(message.groupId, userId);
    if (!isOwner && message.senderUserId !== userId) {
      throw new UnauthorizedGroupAccessError('Only message sender or group owner can delete');
    }

    await this.db.query(
      `UPDATE group_messages
       SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = ?
       WHERE id = ?`,
      [userId, messageId]
    );
  }

  /**
   * Pin/unpin a group message
   * Only group owner can pin
   */
  async toggleMessagePin(
    messageId: number,
    userId: number,
    pinned: boolean
  ): Promise<void> {
    // Get message to verify permissions
    const message = await this.getGroupMessage(messageId, userId);
    if (!message) {
      throw new ConnectionGroupError('Message not found');
    }

    // Verify user is group owner
    const isOwner = await this.verifyGroupOwnership(message.groupId, userId);
    if (!isOwner) {
      throw new UnauthorizedGroupAccessError('Only group owner can pin messages');
    }

    await this.db.query(
      'UPDATE group_messages SET is_pinned = ? WHERE id = ?',
      [pinned, messageId]
    );
  }

  /**
   * Mark messages as read up to a specific message
   */
  async markGroupMessagesRead(
    groupId: number,
    userId: number,
    lastReadMessageId: number
  ): Promise<void> {
    // Verify access (owner or member)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    await this.db.query(
      `INSERT INTO group_message_reads
       (group_id, user_id, last_read_message_id, last_read_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         last_read_message_id = VALUES(last_read_message_id),
         last_read_at = NOW()`,
      [groupId, userId, lastReadMessageId]
    );
  }

  /**
   * Get unread count for a group
   */
  async getGroupUnreadCount(
    groupId: number,
    userId: number
  ): Promise<number> {
    // Verify access (owner or member)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    // Get last read message ID
    const readResult = await this.db.query(
      `SELECT last_read_message_id
       FROM group_message_reads
       WHERE group_id = ? AND user_id = ?`,
      [groupId, userId]
    );

    const lastReadId = readResult.rows.length > 0
      ? (readResult.rows[0] as { last_read_message_id: number }).last_read_message_id
      : 0;

    // Count unread messages
    const countResult = await this.db.query(
      `SELECT COUNT(*) AS unreadCount
       FROM group_messages
       WHERE group_id = ?
         AND id > ?
         AND sender_user_id != ?
         AND is_deleted = FALSE`,
      [groupId, lastReadId, userId]
    );

    const row = countResult.rows[0] as Record<string, unknown>;
    return bigIntToNumber(row.unreadCount as bigint | number);
  }

  /**
   * Get message threads (groups with messages) for user
   */
  async getUserGroupMessageThreads(
    userId: number
  ): Promise<GroupMessageThread[]> {
    const result = await this.db.query(
      `SELECT
        cg.id AS groupId,
        cg.name AS groupName,
        cg.color AS groupColor,
        cg.icon AS groupIcon,
        COUNT(DISTINCT cgm.id) AS memberCount,
        COUNT(DISTINCT gm.id) AS totalMessages,
        MAX(gm.id) AS latestMessageId
       FROM connection_groups cg
       INNER JOIN group_messages gm ON cg.id = gm.group_id AND gm.is_deleted = FALSE
       LEFT JOIN connection_group_members cgm ON cg.id = cgm.group_id
       WHERE cg.user_id = ? AND cg.is_archived = FALSE
       GROUP BY cg.id
       ORDER BY MAX(gm.created_at) DESC`,
      [userId]
    );

    const rows = result.rows as Record<string, unknown>[];
    const threads: GroupMessageThread[] = [];

    for (const row of rows) {
      const groupId = row.groupId as number;
      const latestMessageId = row.latestMessageId as number;

      // Get latest message
      let latestMessage: GroupMessage | null = null;
      if (latestMessageId) {
        latestMessage = await this.getGroupMessage(latestMessageId, userId);
      }

      // Get unread count
      const unreadCount = await this.getGroupUnreadCount(groupId, userId);

      threads.push({
        groupId,
        groupName: row.groupName as string,
        groupColor: row.groupColor as string,
        groupIcon: row.groupIcon as string,
        latestMessage,
        unreadCount,
        totalMessages: bigIntToNumber(row.totalMessages as bigint | number),
        memberCount: bigIntToNumber(row.memberCount as bigint | number)
      });
    }

    return threads;
  }

  // ==========================================================================
  // GROUP LISTING RECOMMENDATIONS (PHASE 2)
  // ==========================================================================

  /**
   * Recommend a listing to all group members
   */
  async recommendListingToGroup(
    userId: number,
    input: SendGroupListingRecommendationInput
  ): Promise<{ recommendation: GroupListingRecommendation; sentTo: number }> {
    const { groupId, listingId, message } = input;

    // Verify access (owner or member can recommend)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    // Get group
    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupNotFoundError();
    }

    // Verify listing exists
    const listingResult = await this.db.query(
      'SELECT id FROM listings WHERE id = ?',
      [listingId]
    );

    if (listingResult.rows.length === 0) {
      throw new ConnectionGroupError('Listing not found');
    }

    // Create recommendation
    const result = await this.db.query(
      `INSERT INTO group_listing_recommendations
       (group_id, sender_user_id, listing_id, message)
       VALUES (?, ?, ?, ?)`,
      [groupId, userId, listingId, message || null]
    );

    const recommendationId = result.insertId;
    if (!recommendationId) {
      throw new ConnectionGroupError('Failed to create listing recommendation');
    }

    // Fetch created recommendation
    const recommendations = await this.getGroupListingRecommendations(groupId, userId, { limit: 1 });
    const recommendation = recommendations[0];

    if (!recommendation) {
      throw new ConnectionGroupError('Failed to retrieve created recommendation');
    }

    // Get all group members (excluding sender)
    const members = await this.getGroupMembers(groupId, userId);
    const recipients = members.filter(m => m.memberUserId !== userId && m.notifyRecommendations !== false);

    // Dispatch notifications
    for (const member of recipients) {
      try {
        await this.notificationService.dispatch({
          type: 'group.listing_recommended',
          recipientId: member.memberUserId,
          title: `${group.name}: Listing recommended`,
          message: message || 'Check out this listing',
          entityType: 'listing',
          entityId: listingId,
          priority: 'normal',
          actionUrl: `/listings/${recommendation.listingSlug}`,
          triggeredBy: userId,
          metadata: {
            groupId,
            groupName: group.name,
            listingId,
            recommendationId
          }
        });
      } catch (error) {
        console.error(`Failed to send notification to member ${member.memberUserId}:`, error);
      }
    }

    // Log activity
    await this.logGroupActivity(
      groupId,
      userId,
      'listing_recommended',
      'Recommended a listing',
      {
        description: recommendation.listingTitle,
        targetType: 'listing',
        targetId: listingId
      }
    );

    return {
      recommendation,
      sentTo: recipients.length
    };
  }

  /**
   * Get listing recommendations for a group
   */
  async getGroupListingRecommendations(
    groupId: number,
    userId: number,
    options?: { limit?: number; offset?: number }
  ): Promise<GroupListingRecommendation[]> {
    // Verify access (owner or member)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const { limit = 50, offset = 0 } = options || {};

    const result = await this.db.query(
      `SELECT
        glr.id,
        glr.group_id AS groupId,
        glr.sender_user_id AS senderUserId,
        glr.listing_id AS listingId,
        glr.message,
        glr.view_count AS viewCount,
        glr.click_count AS clickCount,
        glr.created_at AS createdAt,
        u.username AS senderUsername,
        u.display_name AS senderDisplayName,
        u.avatar_url AS senderAvatarUrl,
        l.name AS listingTitle,
        l.slug AS listingSlug,
        l.gallery_images AS listingImages,
        l.category_id AS listingCategoryId
       FROM group_listing_recommendations glr
       INNER JOIN users u ON glr.sender_user_id = u.id
       INNER JOIN listings l ON glr.listing_id = l.id
       WHERE glr.group_id = ?
       ORDER BY glr.created_at DESC
       LIMIT ? OFFSET ?`,
      [groupId, limit, offset]
    );

    const rows = result.rows as Record<string, unknown>[];
    return rows.map(row => {
      const images = row.listingImages ? (safeJsonParse(row.listingImages as string) ?? []) as string[] : [];
      return {
        ...row,
        listingImageUrl: images.length > 0 ? images[0] : null
      };
    }) as GroupListingRecommendation[];
  }

  /**
   * Track recommendation view/click
   */
  async trackRecommendationEngagement(
    recommendationId: number,
    userId: number,
    action: 'view' | 'click'
  ): Promise<void> {
    const field = action === 'view' ? 'view_count' : 'click_count';

    await this.db.query(
      `UPDATE group_listing_recommendations
       SET ${field} = ${field} + 1
       WHERE id = ?`,
      [recommendationId]
    );
  }

  // ==========================================================================
  // GROUP ACTIVITY (PHASE 2)
  // ==========================================================================

  /**
   * Log group activity
   */
  async logGroupActivity(
    groupId: number,
    actorUserId: number,
    activityType: GroupActivityType,
    title: string,
    options?: {
      description?: string;
      metadata?: Record<string, unknown>;
      targetType?: string;
      targetId?: number;
    }
  ): Promise<GroupActivity> {
    const { description, metadata, targetType, targetId } = options || {};

    const result = await this.db.query(
      `INSERT INTO group_activity
       (group_id, actor_user_id, activity_type, title, description, metadata, target_type, target_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupId,
        actorUserId,
        activityType,
        title,
        description || null,
        metadata ? JSON.stringify(metadata) : null,
        targetType || null,
        targetId || null
      ]
    );

    const activityId = result.insertId;

    // Fetch created activity
    const activityResult = await this.db.query(
      `SELECT
        ga.id,
        ga.group_id AS groupId,
        ga.actor_user_id AS actorUserId,
        ga.activity_type AS activityType,
        ga.title,
        ga.description,
        ga.metadata,
        ga.target_type AS targetType,
        ga.target_id AS targetId,
        ga.created_at AS createdAt,
        u.username AS actorUsername,
        u.display_name AS actorDisplayName,
        u.avatar_url AS actorAvatarUrl
       FROM group_activity ga
       INNER JOIN users u ON ga.actor_user_id = u.id
       WHERE ga.id = ?`,
      [activityId]
    );

    const row = activityResult.rows[0] as Record<string, unknown>;
    return {
      ...row,
      metadata: row.metadata ? safeJsonParse(row.metadata as string) : null
    } as GroupActivity;
  }

  /**
   * Get group activity feed
   */
  async getGroupActivity(
    groupId: number,
    userId: number,
    options?: { limit?: number; offset?: number }
  ): Promise<GroupActivity[]> {
    // Verify access (owner or member)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const { limit = 50, offset = 0 } = options || {};

    const result = await this.db.query(
      `SELECT
        ga.id,
        ga.group_id AS groupId,
        ga.actor_user_id AS actorUserId,
        ga.activity_type AS activityType,
        ga.title,
        ga.description,
        ga.metadata,
        ga.target_type AS targetType,
        ga.target_id AS targetId,
        ga.created_at AS createdAt,
        u.username AS actorUsername,
        u.display_name AS actorDisplayName,
        u.avatar_url AS actorAvatarUrl
       FROM group_activity ga
       INNER JOIN users u ON ga.actor_user_id = u.id
       WHERE ga.group_id = ?
       ORDER BY ga.created_at DESC
       LIMIT ? OFFSET ?`,
      [groupId, limit, offset]
    );

    const rows = result.rows as Record<string, unknown>[];
    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? safeJsonParse(row.metadata as string) : null
    })) as GroupActivity[];
  }

  // ==========================================================================
  // MEMBER NOTIFICATION PREFERENCES (PHASE 2)
  // ==========================================================================

  /**
   * Update member notification preferences for a group
   */
  async updateMemberNotificationPreferences(
    groupId: number,
    userId: number,
    preferences: UpdateMemberNotificationPreferencesInput
  ): Promise<void> {
    // Verify access (owner or member can update own prefs)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (preferences.notifyMessages !== undefined) {
      updates.push('notify_messages = ?');
      params.push(preferences.notifyMessages);
    }
    if (preferences.notifyActivity !== undefined) {
      updates.push('notify_activity = ?');
      params.push(preferences.notifyActivity);
    }
    if (preferences.notifyRecommendations !== undefined) {
      updates.push('notify_recommendations = ?');
      params.push(preferences.notifyRecommendations);
    }

    if (updates.length === 0) {
      return;
    }

    params.push(groupId, userId);

    await this.db.query(
      `UPDATE connection_group_members
       SET ${updates.join(', ')}
       WHERE group_id = ? AND member_user_id = ?`,
      params
    );
  }

  /**
   * Get member notification preferences
   */
  async getMemberNotificationPreferences(
    groupId: number,
    userId: number
  ): Promise<GroupMemberNotificationPreferences> {
    // Verify access (owner or member)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const result = await this.db.query(
      `SELECT
        notify_messages AS notifyMessages,
        notify_activity AS notifyActivity,
        notify_recommendations AS notifyRecommendations
       FROM connection_group_members
       WHERE group_id = ? AND member_user_id = ?`,
      [groupId, userId]
    );

    if (result.rows.length === 0) {
      // Return defaults if no record exists
      return {
        notifyMessages: true,
        notifyActivity: true,
        notifyRecommendations: true
      };
    }

    return result.rows[0] as GroupMemberNotificationPreferences;
  }

  // ==========================================================================
  // QUOTE POOL MANAGEMENT (PHASE 3B)
  // ==========================================================================

  /**
   * Enable quote pool on a group
   */
  async enableQuotePool(
    groupId: number,
    userId: number,
    category?: string
  ): Promise<ConnectionGroup> {
    const hasAccess = await this.verifyGroupOwnership(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    await this.db.query(
      `UPDATE connection_groups
       SET is_quote_pool = TRUE, quote_pool_category = ?
       WHERE id = ?`,
      [category || null, groupId]
    );

    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupNotFoundError();
    }

    return group;
  }

  /**
   * Disable quote pool on a group
   */
  async disableQuotePool(groupId: number, userId: number): Promise<ConnectionGroup> {
    const hasAccess = await this.verifyGroupOwnership(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    await this.db.query(
      `UPDATE connection_groups
       SET is_quote_pool = FALSE, quote_pool_category = NULL
       WHERE id = ?`,
      [groupId]
    );

    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupNotFoundError();
    }

    return group;
  }

  /**
   * Get all quote pool groups for a user
   */
  async getQuotePools(userId: number): Promise<ConnectionGroup[]> {
    const result = await this.db.query(
      `SELECT
        cg.id,
        cg.user_id AS userId,
        cg.name,
        cg.description,
        cg.color,
        cg.icon,
        cg.is_quote_pool AS isQuotePool,
        cg.quote_pool_category AS quotePoolCategory,
        cg.enable_member_recommendations AS enableMemberRecommendations,
        cg.recommendation_visibility AS recommendationVisibility,
        cg.is_archived AS isArchived,
        cg.created_at AS createdAt,
        cg.updated_at AS updatedAt,
        COUNT(cgm.id) AS memberCount
       FROM connection_groups cg
       LEFT JOIN connection_group_members cgm ON cg.id = cgm.group_id
       WHERE cg.user_id = ?
         AND cg.is_quote_pool = TRUE
         AND cg.is_archived = FALSE
       GROUP BY cg.id
       ORDER BY cg.created_at DESC`,
      [userId]
    );

    const rows = result.rows as Record<string, unknown>[];
    return rows.map((row) => ({
      ...row,
      memberCount: bigIntToNumber(row.memberCount as bigint | number)
    })) as ConnectionGroup[];
  }

  // ==========================================================================
  // GROUP-QUOTE INTEGRATION (PHASE 3B)
  // ==========================================================================

  /**
   * Send a quote to all group members' listings.
   * Creates individual quote_requests for each member's listings.
   */
  async sendQuoteToGroup(userId: number, input: SendQuoteToGroupInput): Promise<void> {
    const { quoteId, groupId, message } = input;

    // Verify access (owner or member can submit quotes)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    // Verify the group is a quote pool
    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupNotFoundError();
    }
    if (!group.isQuotePool) {
      throw new ConnectionGroupError('Group is not a quote pool');
    }

    // Verify quote belongs to user
    const quoteResult = await this.db.query(
      'SELECT id, title FROM quotes WHERE id = ? AND requester_user_id = ?',
      [quoteId, userId]
    );
    if (quoteResult.rows.length === 0) {
      throw new ConnectionGroupError('Quote not found or not owned by user');
    }

    // Get all group members
    const members = await this.getGroupMembers(groupId, userId);

    for (const member of members) {
      // Find listings owned by this member
      const listingsResult = await this.db.query(
        `SELECT id FROM listings WHERE user_id = ? AND status = 'active' LIMIT 10`,
        [member.memberUserId]
      );

      if (listingsResult.rows.length === 0) {
        // No active listings - create a request targeting the user directly
        const existing = await this.db.query(
          `SELECT id FROM quote_requests
           WHERE quote_id = ? AND target_type = 'user' AND target_user_id = ?`,
          [quoteId, member.memberUserId]
        );
        if (existing.rows.length === 0) {
          await this.db.query(
            `INSERT INTO quote_requests
             (quote_id, target_type, target_group_id, target_user_id, status)
             VALUES (?, 'user', ?, ?, 'pending')`,
            [quoteId, groupId, member.memberUserId]
          );
        }
      } else {
        // Create requests for each listing
        for (const listingRow of listingsResult.rows as Array<{ id: number }>) {
          const existing = await this.db.query(
            `SELECT id FROM quote_requests
             WHERE quote_id = ? AND target_type = 'listing' AND target_listing_id = ?`,
            [quoteId, listingRow.id]
          );
          if (existing.rows.length === 0) {
            await this.db.query(
              `INSERT INTO quote_requests
               (quote_id, target_type, target_group_id, target_listing_id, status)
               VALUES (?, 'listing', ?, ?, 'pending')`,
              [quoteId, groupId, listingRow.id]
            );
          }
        }
      }

      // Notify each member
      try {
        await this.notificationService.dispatch({
          type: 'group.listing_recommended',
          recipientId: member.memberUserId,
          title: `New quote request in ${group.name}`,
          message: message || 'You have a new quote request from the group',
          priority: 'normal',
          actionUrl: `/dashboard/quotes`,
          triggeredBy: userId,
          metadata: { groupId, groupName: group.name, quoteId }
        });
      } catch (error) {
        console.error(`Failed to notify member ${member.memberUserId} of quote:`, error);
      }
    }

    // Log activity (using group_updated as a general event type for quote pool sends)
    await this.logGroupActivity(
      groupId,
      userId,
      'group_updated',
      'Sent a quote request to the group',
      { targetType: 'quote', targetId: quoteId }
    );
  }

  /**
   * Compare all bids from group members for a specific quote
   */
  async getGroupBidComparison(
    groupId: number,
    quoteId: number,
    userId: number
  ): Promise<GroupBidComparison> {
    // Verify access (owner or member)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupNotFoundError();
    }

    // Verify quote exists and belongs to user
    const quoteResult = await this.db.query(
      'SELECT id, title FROM quotes WHERE id = ? AND requester_user_id = ?',
      [quoteId, userId]
    );
    if (quoteResult.rows.length === 0) {
      throw new ConnectionGroupError('Quote not found');
    }

    const quoteRow = quoteResult.rows[0] as { id: number; title: string };

    // Get members of the group
    const members = await this.getGroupMembers(groupId, userId);
    const memberUserIds = members.map(m => m.memberUserId);
    const totalMembers = memberUserIds.length;

    if (totalMembers === 0) {
      return {
        quoteId,
        quoteTitle: quoteRow.title,
        groupId,
        groupName: group.name,
        totalMembers: 0,
        totalResponses: 0,
        bids: [],
        lowestBid: null,
        highestBid: null,
        averageBid: null
      };
    }

    // Get all responses for this quote from group members
    const placeholders = memberUserIds.map(() => '?').join(', ');
    const bidsResult = await this.db.query(
      `SELECT
        qr.responder_user_id AS memberId,
        u.display_name AS memberName,
        u.avatar_url AS memberAvatarUrl,
        qr.responder_listing_id AS listingId,
        l.name AS listingName,
        qr.bid_amount AS bidAmount,
        qr.bid_description AS bidDescription,
        qr.estimated_duration AS estimatedDuration,
        qr.status,
        qr.created_at AS submittedAt
       FROM quote_responses qr
       INNER JOIN users u ON qr.responder_user_id = u.id
       LEFT JOIN listings l ON qr.responder_listing_id = l.id
       WHERE qr.quote_id = ?
         AND qr.responder_user_id IN (${placeholders})
       ORDER BY qr.bid_amount ASC, qr.created_at ASC`,
      [quoteId, ...memberUserIds]
    );

    const bids = (bidsResult.rows as Record<string, unknown>[]).map((row) => ({
      memberId: row.memberId as number,
      memberName: (row.memberName as string) || 'Unknown',
      memberAvatarUrl: row.memberAvatarUrl as string | null,
      listingId: row.listingId as number | null,
      listingName: row.listingName as string | null,
      bidAmount: row.bidAmount as number | null,
      bidDescription: row.bidDescription as string,
      estimatedDuration: row.estimatedDuration as string | null,
      status: row.status as string,
      submittedAt: row.submittedAt as Date
    })) as QuotePoolMemberBid[];

    const numericBids = bids.map(b => b.bidAmount).filter((b): b is number => b !== null);

    const lowestBid = numericBids.length > 0 ? Math.min(...numericBids) : null;
    const highestBid = numericBids.length > 0 ? Math.max(...numericBids) : null;
    const averageBid =
      numericBids.length > 0
        ? Math.round(numericBids.reduce((a, b) => a + b, 0) / numericBids.length)
        : null;

    return {
      quoteId,
      quoteTitle: quoteRow.title,
      groupId,
      groupName: group.name,
      totalMembers,
      totalResponses: bids.length,
      bids,
      lowestBid,
      highestBid,
      averageBid
    };
  }

  // ==========================================================================
  // VIRAL GROWTH - EMAIL INVITATIONS (PHASE 3B)
  // ==========================================================================

  /**
   * Send email invitations to non-users to join a quote pool group
   */
  async inviteToQuotePool(
    userId: number,
    input: InviteToQuotePoolInput
  ): Promise<QuotePoolInvitation[]> {
    const { groupId, emails, quoteId } = input;

    const hasAccess = await this.verifyGroupOwnership(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const group = await this.getGroup(groupId, userId);
    if (!group) {
      throw new ConnectionGroupNotFoundError();
    }
    if (!group.isQuotePool) {
      throw new ConnectionGroupError('Group is not a quote pool');
    }

    // Validate email limit
    if (emails.length === 0) {
      throw new ConnectionGroupError('At least one email is required');
    }
    if (emails.length > 20) {
      throw new ConnectionGroupError('Cannot invite more than 20 people at once');
    }

    const invitations: QuotePoolInvitation[] = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiry

    for (const email of emails) {
      const normalizedEmail = email.trim().toLowerCase();

      // Generate a secure random token
      const token = `qpi_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;

      // Upsert: if invitation exists and is pending, skip; if cancelled/expired, re-invite
      const existing = await this.db.query(
        `SELECT id, status FROM quote_pool_invitations
         WHERE group_id = ? AND invitee_email = ?`,
        [groupId, normalizedEmail]
      );

      if (existing.rows.length > 0) {
        const existingRow = existing.rows[0] as { id: number; status: string };
        if (existingRow.status === 'pending') {
          // Already invited - skip silently
          continue;
        }
        // Re-invite: update existing record
        await this.db.query(
          `UPDATE quote_pool_invitations
           SET status = 'pending', token = ?, expires_at = ?, quote_id = ?, created_at = NOW()
           WHERE id = ?`,
          [token, expiresAt, quoteId || null, existingRow.id]
        );
        const inv = await this.getInvitationById(existingRow.id);
        if (inv) invitations.push(inv);
      } else {
        // New invitation
        const result = await this.db.query(
          `INSERT INTO quote_pool_invitations
           (group_id, quote_id, inviter_user_id, invitee_email, token, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [groupId, quoteId || null, userId, normalizedEmail, token, expiresAt]
        );

        if (result.insertId) {
          const inv = await this.getInvitationById(result.insertId);
          if (inv) invitations.push(inv);
        }
      }
    }

    return invitations;
  }

  /**
   * Get all pending invitations for a group
   */
  async getQuotePoolInvitations(
    groupId: number,
    userId: number
  ): Promise<QuotePoolInvitation[]> {
    // Verify access (owner or member)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    const result = await this.db.query(
      `SELECT
        qpi.id,
        qpi.group_id AS groupId,
        qpi.quote_id AS quoteId,
        qpi.inviter_user_id AS inviterUserId,
        qpi.invitee_email AS inviteeEmail,
        qpi.invitee_name AS inviteeName,
        qpi.status,
        qpi.token,
        qpi.expires_at AS expiresAt,
        qpi.accepted_at AS acceptedAt,
        qpi.accepted_user_id AS acceptedUserId,
        qpi.created_at AS createdAt,
        u.display_name AS inviterName,
        cg.name AS groupName
       FROM quote_pool_invitations qpi
       INNER JOIN users u ON qpi.inviter_user_id = u.id
       INNER JOIN connection_groups cg ON qpi.group_id = cg.id
       WHERE qpi.group_id = ?
         AND qpi.status = 'pending'
         AND qpi.expires_at > NOW()
       ORDER BY qpi.created_at DESC`,
      [groupId]
    );

    return result.rows as QuotePoolInvitation[];
  }

  /**
   * Accept a quote pool invitation by token
   */
  async acceptQuotePoolInvitation(token: string, userId: number): Promise<void> {
    // Find the invitation
    const result = await this.db.query(
      `SELECT id, group_id AS groupId, status, expires_at AS expiresAt
       FROM quote_pool_invitations
       WHERE token = ?`,
      [token]
    );

    if (result.rows.length === 0) {
      throw new ConnectionGroupError('Invitation not found');
    }

    const invitation = result.rows[0] as {
      id: number;
      groupId: number;
      status: string;
      expiresAt: Date;
    };

    if (invitation.status !== 'pending') {
      throw new ConnectionGroupError('Invitation is no longer valid');
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await this.db.query(
        'UPDATE quote_pool_invitations SET status = ? WHERE id = ?',
        ['expired', invitation.id]
      );
      throw new ConnectionGroupError('Invitation has expired');
    }

    // Mark as accepted
    await this.db.query(
      `UPDATE quote_pool_invitations
       SET status = 'accepted', accepted_at = NOW(), accepted_user_id = ?
       WHERE id = ?`,
      [userId, invitation.id]
    );

    // Notify group owner
    const groupResult = await this.db.query(
      'SELECT user_id, name FROM connection_groups WHERE id = ?',
      [invitation.groupId]
    );

    if (groupResult.rows.length > 0) {
      const groupRow = groupResult.rows[0] as { user_id: number; name: string };
      try {
        await this.notificationService.dispatch({
          type: 'group.member_added',
          recipientId: groupRow.user_id,
          title: `Quote pool invitation accepted`,
          message: `Someone accepted your invitation to join ${groupRow.name}`,
          priority: 'normal',
          actionUrl: `/dashboard/connections/groups/${invitation.groupId}`,
          triggeredBy: userId,
          metadata: { groupId: invitation.groupId, groupName: groupRow.name }
        });
      } catch (error) {
        console.error('Failed to send invitation accepted notification:', error);
      }
    }
  }

  /**
   * Cancel a pending quote pool invitation
   */
  async cancelQuotePoolInvitation(invitationId: number, userId: number): Promise<void> {
    // Verify the invitation belongs to a group owned by the user
    const result = await this.db.query(
      `SELECT qpi.id, qpi.status
       FROM quote_pool_invitations qpi
       INNER JOIN connection_groups cg ON qpi.group_id = cg.id
       WHERE qpi.id = ? AND cg.user_id = ?`,
      [invitationId, userId]
    );

    if (result.rows.length === 0) {
      throw new ConnectionGroupError('Invitation not found or not authorized');
    }

    const inv = result.rows[0] as { id: number; status: string };
    if (inv.status !== 'pending') {
      throw new ConnectionGroupError('Only pending invitations can be cancelled');
    }

    await this.db.query(
      'UPDATE quote_pool_invitations SET status = ? WHERE id = ?',
      ['cancelled', invitationId]
    );
  }

  // ============================================================================
  // Phase 4A: Analytics Methods
  // ============================================================================

  /** Cast a single result row for COUNT/SUM queries */
  private rowCount(rows: unknown[]): bigint | number {
    return ((rows[0] as Record<string, unknown>)?.count ?? 0) as bigint | number;
  }

  private rowTotal(rows: unknown[]): bigint | number {
    return ((rows[0] as Record<string, unknown>)?.total ?? 0) as bigint | number;
  }

  /**
   * Get analytics for a single group (owner or member)
   */
  async getGroupAnalytics(groupId: number, userId: number): Promise<GroupAnalytics> {
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new ConnectionGroupNotFoundError();
    }

    const groupResult = await this.db.query(
      'SELECT id, name, created_at AS createdAt FROM connection_groups WHERE id = ?',
      [groupId]
    );
    if (groupResult.rows.length === 0) {
      throw new ConnectionGroupNotFoundError();
    }
    const group = groupResult.rows[0] as { id: number; name: string; createdAt: Date };

    const memberCount = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM connection_group_members WHERE group_id = ?',
      [groupId]
    )).rows));

    const totalMessages = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM group_messages WHERE group_id = ?',
      [groupId]
    )).rows));

    const totalRecommendations = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM group_listing_recommendations WHERE group_id = ?',
      [groupId]
    )).rows));

    const acceptedRecommendations = bigIntToNumber(this.rowCount((await this.db.query(
      `SELECT COUNT(*) AS count FROM group_listing_recommendations
       WHERE group_id = ? AND click_count > 0`,
      [groupId]
    )).rows));

    const totalActivities = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM group_activity WHERE group_id = ?',
      [groupId]
    )).rows));

    const pymkConnectionsCreated = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM connection_group_recommendations WHERE group_id = ? AND recommendation_status = ?',
      [groupId, 'connected']
    )).rows));

    const pointsEarned = 0;

    const growthResult = await this.db.query(
      `SELECT DATE(added_at) AS date, COUNT(*) AS count
       FROM connection_group_members
       WHERE group_id = ? AND added_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(added_at)
       ORDER BY date ASC`,
      [groupId]
    );
    const memberGrowth = (growthResult.rows as { date: string; count: bigint | number }[]).map(r => ({
      date: String(r.date),
      count: bigIntToNumber(r.count)
    }));

    const actByTypeResult = await this.db.query(
      `SELECT activity_type AS type, COUNT(*) AS count
       FROM group_activity
       WHERE group_id = ?
       GROUP BY activity_type
       ORDER BY count DESC`,
      [groupId]
    );
    const activityByType = (actByTypeResult.rows as { type: string; count: bigint | number }[]).map(r => ({
      type: r.type,
      count: bigIntToNumber(r.count)
    }));

    const engagementScore = memberCount > 0
      ? Math.min(100, Math.round(((totalMessages + totalRecommendations + totalActivities) / memberCount) * 10))
      : 0;

    return {
      groupId,
      groupName: group.name,
      memberCount,
      totalMessages,
      totalRecommendations,
      acceptedRecommendations,
      totalActivities,
      engagementScore,
      pymkConnectionsCreated,
      pointsEarned,
      memberGrowth,
      activityByType,
      createdAt: group.createdAt
    };
  }

  /**
   * Get activity timeline for a group (owner only)
   */
  async getGroupActivityTimeline(
    groupId: number, userId: number, days: number = 30
  ): Promise<GroupActivityTimelinePoint[]> {
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new ConnectionGroupNotFoundError();
    }

    const messagesResult = await this.db.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM group_messages
       WHERE group_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)`,
      [groupId, days]
    );
    const messagesByDate = new Map<string, number>();
    for (const row of messagesResult.rows as { date: string; count: bigint | number }[]) {
      messagesByDate.set(String(row.date), bigIntToNumber(row.count));
    }

    const recsResult = await this.db.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM group_listing_recommendations
       WHERE group_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)`,
      [groupId, days]
    );
    const recsByDate = new Map<string, number>();
    for (const row of recsResult.rows as { date: string; count: bigint | number }[]) {
      recsByDate.set(String(row.date), bigIntToNumber(row.count));
    }

    const memberResult = await this.db.query(
      `SELECT DATE(added_at) AS date, COUNT(*) AS count
       FROM connection_group_members
       WHERE group_id = ? AND added_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(added_at)`,
      [groupId, days]
    );
    const membersByDate = new Map<string, number>();
    for (const row of memberResult.rows as { date: string; count: bigint | number }[]) {
      membersByDate.set(String(row.date), bigIntToNumber(row.count));
    }

    const timeline: GroupActivityTimelinePoint[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0] ?? '';
      timeline.push({
        date: dateStr,
        messages: messagesByDate.get(dateStr) ?? 0,
        recommendations: recsByDate.get(dateStr) ?? 0,
        memberChanges: membersByDate.get(dateStr) ?? 0
      });
    }

    return timeline;
  }

  /**
   * Get summary analytics across all groups owned by a user
   */
  async getUserGroupsSummaryAnalytics(userId: number): Promise<UserGroupsSummary> {
    const totalGroups = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM connection_groups WHERE user_id = ? AND is_archived = 0',
      [userId]
    )).rows));

    const totalMembers = bigIntToNumber(this.rowCount((await this.db.query(
      `SELECT COUNT(*) AS count FROM connection_group_members cgm
       INNER JOIN connection_groups cg ON cgm.group_id = cg.id
       WHERE cg.user_id = ?`,
      [userId]
    )).rows));

    const totalMessages = bigIntToNumber(this.rowCount((await this.db.query(
      `SELECT COUNT(*) AS count FROM group_messages gm
       INNER JOIN connection_groups cg ON gm.group_id = cg.id
       WHERE cg.user_id = ?`,
      [userId]
    )).rows));

    const totalRecommendations = bigIntToNumber(this.rowCount((await this.db.query(
      `SELECT COUNT(*) AS count FROM group_listing_recommendations glr
       INNER JOIN connection_groups cg ON glr.group_id = cg.id
       WHERE cg.user_id = ?`,
      [userId]
    )).rows));

    const totalPointsEarned = 0;

    const engagementResult = await this.db.query(
      `SELECT cg.id, cg.name,
         (SELECT COUNT(*) FROM connection_group_members WHERE group_id = cg.id) AS members,
         (SELECT COUNT(*) FROM group_messages WHERE group_id = cg.id) AS messages,
         (SELECT COUNT(*) FROM group_listing_recommendations WHERE group_id = cg.id) AS recs,
         (SELECT COUNT(*) FROM group_activity WHERE group_id = cg.id) AS activities
       FROM connection_groups cg
       WHERE cg.user_id = ? AND cg.is_archived = 0
       ORDER BY cg.id`,
      [userId]
    );

    type EngagementRow = { id: number; name: string; members: bigint | number; messages: bigint | number; recs: bigint | number; activities: bigint | number };
    const groups = (engagementResult.rows as EngagementRow[]).map(r => {
      const m = bigIntToNumber(r.members);
      const msgs = bigIntToNumber(r.messages);
      const rcs = bigIntToNumber(r.recs);
      const acts = bigIntToNumber(r.activities);
      const score = m > 0 ? Math.min(100, Math.round(((msgs + rcs + acts) / m) * 10)) : 0;
      return { id: Number(r.id), name: String(r.name), engagementScore: score };
    });

    const sorted = [...groups].sort((a, b) => b.engagementScore - a.engagementScore);
    const mostActiveGroup: { id: number; name: string; engagementScore: number } | null = sorted.length > 0 ? (sorted[0] ?? null) : null;
    const leastActiveGroup: { id: number; name: string; engagementScore: number } | null = sorted.length > 0 ? (sorted[sorted.length - 1] ?? null) : null;

    const recentMembers = bigIntToNumber(this.rowCount((await this.db.query(
      `SELECT COUNT(*) AS count FROM connection_group_members cgm
       INNER JOIN connection_groups cg ON cgm.group_id = cg.id
       WHERE cg.user_id = ? AND cgm.added_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [userId]
    )).rows));

    const prevMembers = bigIntToNumber(this.rowCount((await this.db.query(
      `SELECT COUNT(*) AS count FROM connection_group_members cgm
       INNER JOIN connection_groups cg ON cgm.group_id = cg.id
       WHERE cg.user_id = ? AND cgm.added_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND cgm.added_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [userId]
    )).rows));

    const memberGrowthTrend = prevMembers > 0
      ? Math.round(((recentMembers - prevMembers) / prevMembers) * 100)
      : recentMembers > 0 ? 100 : 0;

    return {
      totalGroups,
      totalMembers,
      totalMessages,
      totalRecommendations,
      totalPointsEarned,
      mostActiveGroup,
      leastActiveGroup,
      memberGrowthTrend
    };
  }

  /**
   * Get per-member engagement metrics for a group (owner only)
   */
  async getGroupMemberEngagement(
    groupId: number, userId: number
  ): Promise<GroupMemberEngagement[]> {
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new ConnectionGroupNotFoundError();
    }

    const result = await this.db.query(
      `SELECT
         cgm.member_user_id AS memberId,
         COALESCE(u.display_name, u.username) AS memberName,
         u.avatar_url AS avatarUrl,
         (SELECT COUNT(*) FROM group_messages WHERE group_id = ? AND sender_user_id = cgm.member_user_id) AS messagesSent,
         (SELECT COUNT(*) FROM group_listing_recommendations WHERE group_id = ? AND sender_user_id = cgm.member_user_id) AS recommendationsViewed,
         (SELECT MAX(created_at) FROM group_activity WHERE group_id = ? AND actor_user_id = cgm.member_user_id) AS lastActiveDate
       FROM connection_group_members cgm
       INNER JOIN users u ON cgm.member_user_id = u.id
       WHERE cgm.group_id = ?
       ORDER BY messagesSent DESC`,
      [groupId, groupId, groupId, groupId]
    );

    return (result.rows as Array<{
      memberId: number;
      memberName: string;
      avatarUrl: string | null;
      messagesSent: bigint | number;
      recommendationsViewed: bigint | number;
      lastActiveDate: Date | null;
    }>).map(r => {
      const msgs = bigIntToNumber(r.messagesSent);
      const recs = bigIntToNumber(r.recommendationsViewed);
      return {
        memberId: r.memberId,
        memberName: r.memberName,
        avatarUrl: r.avatarUrl,
        messagesSent: msgs,
        recommendationsViewed: recs,
        lastActiveDate: r.lastActiveDate,
        engagementScore: Math.min(100, (msgs * 5) + (recs * 10))
      };
    });
  }

  /**
   * Get platform-wide group analytics (admin only)
   */
  async getAdminGroupAnalytics(dateRange: { start: Date; end: Date }): Promise<AdminGroupAnalytics> {
    const totalGroups = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM connection_groups',
      []
    )).rows));

    const activeGroups = bigIntToNumber(this.rowCount((await this.db.query(
      `SELECT COUNT(DISTINCT group_id) AS count FROM group_activity
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      []
    )).rows));

    const totalMembers = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM connection_group_members',
      []
    )).rows));

    const averageMembersPerGroup = totalGroups > 0 ? Math.round((totalMembers / totalGroups) * 10) / 10 : 0;

    const quotePoolCount = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM connection_groups WHERE is_quote_pool = 1',
      []
    )).rows));
    const quotePoolAdoptionRate = totalGroups > 0 ? Math.round((quotePoolCount / totalGroups) * 100) : 0;

    const sizeResult = await this.db.query(
      `SELECT
         CASE
           WHEN mc = 0 THEN '0'
           WHEN mc BETWEEN 1 AND 5 THEN '1-5'
           WHEN mc BETWEEN 6 AND 10 THEN '6-10'
           WHEN mc BETWEEN 11 AND 20 THEN '11-20'
           ELSE '20+'
         END AS \`range\`,
         COUNT(*) AS count
       FROM (
         SELECT cg.id, COUNT(cgm.id) AS mc
         FROM connection_groups cg
         LEFT JOIN connection_group_members cgm ON cgm.group_id = cg.id
         GROUP BY cg.id
       ) AS group_sizes
       GROUP BY \`range\`
       ORDER BY MIN(mc)`,
      []
    );
    const groupSizeDistribution = (sizeResult.rows as { range: string; count: bigint | number }[]).map(r => ({
      range: r.range,
      count: bigIntToNumber(r.count)
    }));

    const creatorsResult = await this.db.query(
      `SELECT cg.user_id AS userId, u.username, COUNT(*) AS groupCount
       FROM connection_groups cg
       INNER JOIN users u ON cg.user_id = u.id
       GROUP BY cg.user_id, u.username
       ORDER BY groupCount DESC
       LIMIT 10`,
      []
    );
    const topCreators = (creatorsResult.rows as { userId: number; username: string; groupCount: bigint | number }[]).map(r => ({
      userId: Number(r.userId),
      username: String(r.username),
      groupCount: bigIntToNumber(r.groupCount)
    }));

    const pymkTotal = bigIntToNumber(this.rowCount((await this.db.query(
      'SELECT COUNT(*) AS count FROM connection_group_recommendations',
      []
    )).rows));
    const pymkAccepted = bigIntToNumber(this.rowCount((await this.db.query(
      `SELECT COUNT(*) AS count FROM connection_group_recommendations WHERE recommendation_status = 'connected'`,
      []
    )).rows));
    const pymkConversionRate = pymkTotal > 0 ? Math.round((pymkAccepted / pymkTotal) * 100) : 0;

    const timelineResult = await this.db.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM connection_groups
       WHERE created_at BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [dateRange.start, dateRange.end]
    );
    const groupsByDate = new Map<string, number>();
    for (const row of timelineResult.rows as { date: string; count: bigint | number }[]) {
      groupsByDate.set(String(row.date), bigIntToNumber(row.count));
    }

    const membersTimelineResult = await this.db.query(
      `SELECT DATE(added_at) AS date, COUNT(*) AS count
       FROM connection_group_members
       WHERE added_at BETWEEN ? AND ?
       GROUP BY DATE(added_at)
       ORDER BY date ASC`,
      [dateRange.start, dateRange.end]
    );
    const membersByDate = new Map<string, number>();
    for (const row of membersTimelineResult.rows as { date: string; count: bigint | number }[]) {
      membersByDate.set(String(row.date), bigIntToNumber(row.count));
    }

    const allDates = new Set([...groupsByDate.keys(), ...membersByDate.keys()]);
    const timeline = Array.from(allDates).sort().map(date => ({
      date,
      groupsCreated: groupsByDate.get(date) ?? 0,
      membersAdded: membersByDate.get(date) ?? 0
    }));

    return {
      totalGroups,
      activeGroups,
      totalMembers,
      averageMembersPerGroup,
      quotePoolCount,
      quotePoolAdoptionRate,
      groupSizeDistribution,
      topCreators,
      pymkConversionRate,
      timeline
    };
  }

  // ============================================================================
  // Phase 4B: Group Sharing & Templates
  // ============================================================================

  async duplicateGroup(groupId: number, userId: number, newName?: string): Promise<ConnectionGroup> {
    // Verify ownership
    const group = await this.getGroup(groupId, userId);
    if (!group) throw new ConnectionGroupNotFoundError();
    if (group.userId !== userId) throw new UnauthorizedGroupAccessError();

    // Create new group with same settings
    const result = await this.db.query(
      `INSERT INTO connection_groups (user_id, name, description, color, icon, is_quote_pool, quote_pool_category, enable_member_recommendations, recommendation_visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, newName || `${group.name} (Copy)`, group.description, group.color, group.icon, group.isQuotePool, group.quotePoolCategory, group.enableMemberRecommendations, group.recommendationVisibility]
    );

    const newGroupId = result.insertId;
    if (!newGroupId) throw new ConnectionGroupError('Failed to duplicate group');

    const newGroup = await this.getGroup(newGroupId, userId);
    if (!newGroup) throw new ConnectionGroupError('Failed to retrieve duplicated group');
    return newGroup;
  }

  async saveGroupAsTemplate(groupId: number, userId: number, input: SaveAsTemplateInput = {}): Promise<GroupTemplate> {
    const group = await this.getGroup(groupId, userId);
    if (!group) throw new ConnectionGroupNotFoundError();
    if (group.userId !== userId) throw new UnauthorizedGroupAccessError();

    const templateName = input.name || group.name;
    const isPublic = input.isPublic ?? false;

    const result = await this.db.query(
      `INSERT INTO connection_group_templates (user_id, name, description, color, icon, is_quote_pool, quote_pool_category, enable_member_recommendations, recommendation_visibility, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, templateName, group.description, group.color, group.icon, group.isQuotePool, group.quotePoolCategory, group.enableMemberRecommendations, group.recommendationVisibility, isPublic]
    );

    const templateId = result.insertId;
    if (!templateId) throw new ConnectionGroupError('Failed to save template');

    const template = await this.getTemplateById(templateId);
    if (!template) throw new ConnectionGroupError('Failed to retrieve saved template');
    return template;
  }

  async getUserTemplates(userId: number): Promise<GroupTemplate[]> {
    const result = await this.db.query(
      `SELECT
        t.id, t.user_id AS userId, t.name, t.description, t.color, t.icon,
        t.is_quote_pool AS isQuotePool, t.quote_pool_category AS quotePoolCategory,
        t.enable_member_recommendations AS enableMemberRecommendations,
        t.recommendation_visibility AS recommendationVisibility,
        t.is_public AS isPublic, t.usage_count AS usageCount,
        t.created_at AS createdAt, t.updated_at AS updatedAt,
        u.username AS creatorUsername, u.display_name AS creatorDisplayName
       FROM connection_group_templates t
       INNER JOIN users u ON t.user_id = u.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [userId]
    );
    return result.rows as GroupTemplate[];
  }

  async getPublicTemplates(options: { limit?: number; offset?: number } = {}): Promise<{ templates: GroupTemplate[]; total: number }> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const countResult = await this.db.query(
      `SELECT COUNT(*) AS total FROM connection_group_templates WHERE is_public = TRUE`,
      []
    );
    const total = bigIntToNumber((countResult.rows[0] as { total: bigint | number }).total);

    const result = await this.db.query(
      `SELECT
        t.id, t.user_id AS userId, t.name, t.description, t.color, t.icon,
        t.is_quote_pool AS isQuotePool, t.quote_pool_category AS quotePoolCategory,
        t.enable_member_recommendations AS enableMemberRecommendations,
        t.recommendation_visibility AS recommendationVisibility,
        t.is_public AS isPublic, t.usage_count AS usageCount,
        t.created_at AS createdAt, t.updated_at AS updatedAt,
        u.username AS creatorUsername, u.display_name AS creatorDisplayName
       FROM connection_group_templates t
       INNER JOIN users u ON t.user_id = u.id
       WHERE t.is_public = TRUE
       ORDER BY t.usage_count DESC, t.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return { templates: result.rows as GroupTemplate[], total };
  }

  async createGroupFromTemplate(templateId: number, userId: number, name: string, description?: string): Promise<ConnectionGroup> {
    // Get the template
    const template = await this.getTemplateById(templateId);
    if (!template) throw new ConnectionGroupError('Template not found');
    // Only allow if template is public or user owns it
    if (!template.isPublic && template.userId !== userId) {
      throw new UnauthorizedGroupAccessError('Cannot use this template');
    }

    // Create group from template settings
    const result = await this.db.query(
      `INSERT INTO connection_groups (user_id, name, description, color, icon, is_quote_pool, quote_pool_category, enable_member_recommendations, recommendation_visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, description || template.description, template.color, template.icon, template.isQuotePool, template.quotePoolCategory, template.enableMemberRecommendations, template.recommendationVisibility]
    );

    const groupId = result.insertId;
    if (!groupId) throw new ConnectionGroupError('Failed to create group from template');

    // Increment usage count
    await this.db.query(
      `UPDATE connection_group_templates SET usage_count = usage_count + 1 WHERE id = ?`,
      [templateId]
    );

    const group = await this.getGroup(groupId, userId);
    if (!group) throw new ConnectionGroupError('Failed to retrieve created group');
    return group;
  }

  async deleteTemplate(templateId: number, userId: number): Promise<void> {
    const template = await this.getTemplateById(templateId);
    if (!template) throw new ConnectionGroupError('Template not found');
    if (template.userId !== userId) throw new UnauthorizedGroupAccessError('Cannot delete this template');

    await this.db.query(
      `DELETE FROM connection_group_templates WHERE id = ? AND user_id = ?`,
      [templateId, userId]
    );
  }

  async generateShareLink(groupId: number, userId: number): Promise<GroupShareInfo> {
    const group = await this.getGroup(groupId, userId);
    if (!group) throw new ConnectionGroupNotFoundError();
    if (group.userId !== userId) throw new UnauthorizedGroupAccessError();

    // Get owner info
    const ownerResult = await this.db.query(
      `SELECT username, display_name AS displayName FROM users WHERE id = ?`,
      [userId]
    );
    const owner = ownerResult.rows[0] as { username: string; displayName: string | null } | undefined;

    return {
      groupId: group.id,
      groupName: group.name,
      description: group.description,
      memberCount: group.memberCount,
      ownerUsername: owner?.username || 'unknown',
      ownerDisplayName: owner?.displayName || null,
      color: group.color,
      icon: group.icon,
      isQuotePool: group.isQuotePool
    };
  }

  // Private helper
  private async getTemplateById(templateId: number): Promise<GroupTemplate | null> {
    const result = await this.db.query(
      `SELECT
        t.id, t.user_id AS userId, t.name, t.description, t.color, t.icon,
        t.is_quote_pool AS isQuotePool, t.quote_pool_category AS quotePoolCategory,
        t.enable_member_recommendations AS enableMemberRecommendations,
        t.recommendation_visibility AS recommendationVisibility,
        t.is_public AS isPublic, t.usage_count AS usageCount,
        t.created_at AS createdAt, t.updated_at AS updatedAt,
        u.username AS creatorUsername, u.display_name AS creatorDisplayName
       FROM connection_group_templates t
       INNER JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [templateId]
    );
    return result.rows.length > 0 ? (result.rows[0] as GroupTemplate) : null;
  }

  /**
   * Get a single invitation by ID (internal helper)
   */
  private async getInvitationById(id: number): Promise<QuotePoolInvitation | null> {
    const result = await this.db.query(
      `SELECT
        qpi.id,
        qpi.group_id AS groupId,
        qpi.quote_id AS quoteId,
        qpi.inviter_user_id AS inviterUserId,
        qpi.invitee_email AS inviteeEmail,
        qpi.invitee_name AS inviteeName,
        qpi.status,
        qpi.token,
        qpi.expires_at AS expiresAt,
        qpi.accepted_at AS acceptedAt,
        qpi.accepted_user_id AS acceptedUserId,
        qpi.created_at AS createdAt,
        u.display_name AS inviterName,
        cg.name AS groupName
       FROM quote_pool_invitations qpi
       INNER JOIN users u ON qpi.inviter_user_id = u.id
       INNER JOIN connection_groups cg ON qpi.group_id = cg.id
       WHERE qpi.id = ?`,
      [id]
    );

    return result.rows.length > 0 ? (result.rows[0] as QuotePoolInvitation) : null;
  }

  // ============================================================================
  // Tab Access Permissions
  // ============================================================================

  /**
   * Valid restricted tabs that can be granted to members
   */
  private static readonly RESTRICTED_TABS = ['recommendations', 'activity', 'quote-pool', 'analytics'] as const;

  /**
   * Update tab access permissions for a group member
   * Only the group owner can grant/revoke tab access
   */
  async updateMemberTabAccess(
    groupId: number,
    memberUserId: number,
    ownerId: number,
    tabs: string[]
  ): Promise<GroupMember> {
    const isOwner = await this.verifyGroupOwnership(groupId, ownerId);
    if (!isOwner) {
      throw new UnauthorizedGroupAccessError('Only the group owner can manage tab permissions');
    }

    // Validate tab names
    const validTabs = tabs.filter(t =>
      (ConnectionGroupService.RESTRICTED_TABS as readonly string[]).includes(t)
    );

    const tabAccessJson = validTabs.length > 0 ? JSON.stringify(validTabs) : null;

    await this.db.query(
      `UPDATE connection_group_members
       SET tab_access = ?
       WHERE group_id = ? AND member_user_id = ?`,
      [tabAccessJson, groupId, memberUserId]
    );

    const member = await this.getGroupMember(groupId, memberUserId);
    if (!member) {
      throw new GroupMemberNotFoundError();
    }

    await this.logGroupActivity(groupId, ownerId, 'group_updated',
      'Tab permissions updated', {
        description: `Updated tab access for ${member.displayName || member.username}`,
        metadata: { memberUserId, tabs: validTabs }
      });

    return member;
  }

  /**
   * Get the tab access for the current user in a group
   * Returns all restricted tabs for owner, or the granted tabs for members
   */
  async getMemberTabAccess(groupId: number, userId: number): Promise<string[]> {
    const isOwner = await this.verifyGroupOwnership(groupId, userId);
    if (isOwner) {
      return [...ConnectionGroupService.RESTRICTED_TABS];
    }

    const result = await this.db.query(
      `SELECT tab_access AS tabAccess
       FROM connection_group_members
       WHERE group_id = ? AND member_user_id = ?`,
      [groupId, userId]
    );

    if (result.rows.length === 0) {
      return [];
    }

    const raw = (result.rows[0] as { tabAccess: unknown }).tabAccess;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = safeJsonParse<string[]>(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  }

  // ============================================================================
  // Member Suggestions
  // ============================================================================

  /**
   * Suggest a member to be added to the group (non-owner action)
   * Notifies all group members and the owner
   */
  async suggestMember(
    groupId: number,
    userId: number,
    input: SuggestMemberInput
  ): Promise<GroupMemberSuggestion> {
    // Verify user is a member (not necessarily owner)
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    // Check the suggested user isn't already a member
    const existingMember = await this.getGroupMember(groupId, input.suggestedUserId);
    if (existingMember) {
      throw new ConnectionGroupError('This user is already a member of the group');
    }

    // Check for duplicate pending suggestion
    const existing = await this.db.query(
      `SELECT id FROM group_member_suggestions
       WHERE group_id = ? AND suggested_user_id = ? AND status = 'pending'`,
      [groupId, input.suggestedUserId]
    );
    if (existing.rows.length > 0) {
      throw new ConnectionGroupError('A suggestion for this user is already pending');
    }

    const result = await this.db.query(
      `INSERT INTO group_member_suggestions
       (group_id, suggested_by_user_id, suggested_user_id, message)
       VALUES (?, ?, ?, ?)`,
      [groupId, userId, input.suggestedUserId, input.message || null]
    );

    const suggestionId = bigIntToNumber(result.insertId);

    // Get group info for notifications
    const group = await this.getGroup(groupId, userId);
    const suggestor = await this.getGroupMember(groupId, userId);
    const suggestorName = suggestor?.displayName || suggestor?.username || 'A member';

    if (group) {
      // Notify the group owner
      try {
        await this.notificationService.dispatch({
          type: 'group.member_suggested',
          recipientId: group.userId,
          title: `Member suggested for ${group.name}`,
          message: `${suggestorName} suggested adding a new member to the group`,
          priority: 'normal',
          actionUrl: `/dashboard/connections/groups/${groupId}`,
          triggeredBy: userId,
          metadata: { groupId, groupName: group.name, suggestionId }
        });
      } catch (error) {
        console.error('Failed to send member suggestion notification:', error);
      }

      // Log activity
      await this.logGroupActivity(groupId, userId, 'member_suggested',
        'Suggested a new member', {
          description: input.message || undefined,
          metadata: { suggestedUserId: input.suggestedUserId, suggestionId }
        });
    }

    return this.getMemberSuggestion(suggestionId);
  }

  /**
   * Get a single member suggestion by ID
   */
  private async getMemberSuggestion(suggestionId: number): Promise<GroupMemberSuggestion> {
    const result = await this.db.query(
      `SELECT
        gms.id,
        gms.group_id AS groupId,
        gms.suggested_by_user_id AS suggestedByUserId,
        gms.suggested_user_id AS suggestedUserId,
        gms.message,
        gms.status,
        gms.reviewed_by_user_id AS reviewedByUserId,
        gms.reviewed_at AS reviewedAt,
        gms.review_note AS reviewNote,
        gms.created_at AS createdAt,
        sb.username AS suggestedByUsername,
        sb.display_name AS suggestedByDisplayName,
        su.username AS suggestedUsername,
        su.display_name AS suggestedDisplayName,
        su.avatar_url AS suggestedAvatarUrl
       FROM group_member_suggestions gms
       INNER JOIN users sb ON gms.suggested_by_user_id = sb.id
       INNER JOIN users su ON gms.suggested_user_id = su.id
       WHERE gms.id = ?`,
      [suggestionId]
    );

    if (result.rows.length === 0) {
      throw new ConnectionGroupError('Suggestion not found');
    }

    return result.rows[0] as GroupMemberSuggestion;
  }

  /**
   * Get pending suggestions for a group (owner-only)
   */
  async getGroupSuggestions(groupId: number, userId: number): Promise<GroupMemberSuggestion[]> {
    const isOwner = await this.verifyGroupOwnership(groupId, userId);
    if (!isOwner) {
      throw new UnauthorizedGroupAccessError('Only the group owner can view suggestions');
    }

    const result = await this.db.query(
      `SELECT
        gms.id,
        gms.group_id AS groupId,
        gms.suggested_by_user_id AS suggestedByUserId,
        gms.suggested_user_id AS suggestedUserId,
        gms.message,
        gms.status,
        gms.reviewed_by_user_id AS reviewedByUserId,
        gms.reviewed_at AS reviewedAt,
        gms.review_note AS reviewNote,
        gms.created_at AS createdAt,
        sb.username AS suggestedByUsername,
        sb.display_name AS suggestedByDisplayName,
        su.username AS suggestedUsername,
        su.display_name AS suggestedDisplayName,
        su.avatar_url AS suggestedAvatarUrl
       FROM group_member_suggestions gms
       INNER JOIN users sb ON gms.suggested_by_user_id = sb.id
       INNER JOIN users su ON gms.suggested_user_id = su.id
       WHERE gms.group_id = ? AND gms.status = 'pending'
       ORDER BY gms.created_at DESC`,
      [groupId]
    );

    return result.rows as GroupMemberSuggestion[];
  }

  /**
   * Review (approve/deny) a member suggestion (owner-only)
   * If approved, the suggested user is added to the group
   */
  async reviewSuggestion(
    suggestionId: number,
    userId: number,
    input: ReviewSuggestionInput
  ): Promise<GroupMemberSuggestion> {
    const suggestion = await this.getMemberSuggestion(suggestionId);

    const isOwner = await this.verifyGroupOwnership(suggestion.groupId, userId);
    if (!isOwner) {
      throw new UnauthorizedGroupAccessError('Only the group owner can review suggestions');
    }

    if (suggestion.status !== 'pending') {
      throw new ConnectionGroupError('This suggestion has already been reviewed');
    }

    await this.db.query(
      `UPDATE group_member_suggestions
       SET status = ?, reviewed_by_user_id = ?, reviewed_at = NOW(), review_note = ?
       WHERE id = ?`,
      [input.status, userId, input.reviewNote || null, suggestionId]
    );

    // If approved, add the member to the group
    if (input.status === 'approved') {
      try {
        await this.addMembers(suggestion.groupId, userId, [suggestion.suggestedUserId]);
      } catch (error) {
        // If adding fails (e.g., already a member or not a connection), still mark as reviewed
        console.error('Failed to add suggested member:', error);
      }
    }

    // Notify the person who made the suggestion
    const group = await this.getGroup(suggestion.groupId, userId);
    if (group) {
      try {
        await this.notificationService.dispatch({
          type: 'group.suggestion_reviewed',
          recipientId: suggestion.suggestedByUserId,
          title: `Suggestion ${input.status} for ${group.name}`,
          message: input.status === 'approved'
            ? `Your member suggestion was approved and they've been added to the group`
            : `Your member suggestion was declined${input.reviewNote ? ': ' + input.reviewNote : ''}`,
          priority: 'normal',
          actionUrl: `/dashboard/connections/groups/${suggestion.groupId}`,
          triggeredBy: userId,
          metadata: { groupId: suggestion.groupId, groupName: group.name, suggestionId }
        });
      } catch (error) {
        console.error('Failed to send suggestion review notification:', error);
      }
    }

    return this.getMemberSuggestion(suggestionId);
  }

  // ============================================================================
  // Leave Group
  // ============================================================================

  /**
   * Member voluntarily leaves a group
   */
  async leaveGroup(groupId: number, userId: number, reason?: string): Promise<void> {
    // Verify user is a member
    const member = await this.getGroupMember(groupId, userId);
    if (!member) {
      throw new GroupMemberNotFoundError('You are not a member of this group');
    }

    // Owner cannot leave their own group
    const isOwner = await this.verifyGroupOwnership(groupId, userId);
    if (isOwner) {
      throw new ConnectionGroupError('The group owner cannot leave the group. Transfer ownership or delete the group instead.');
    }

    // Record the departure with reason
    await this.db.query(
      `INSERT INTO group_member_departures (group_id, user_id, reason) VALUES (?, ?, ?)`,
      [groupId, userId, reason || null]
    );

    // Remove from group
    await this.db.query(
      'DELETE FROM connection_group_members WHERE group_id = ? AND member_user_id = ?',
      [groupId, userId]
    );

    // Get group info for notifications
    const group = await this.getGroupById(groupId);
    if (group) {
      // Notify the owner
      try {
        await this.notificationService.dispatch({
          type: 'group.member_left',
          recipientId: group.userId,
          title: `Member left ${group.name}`,
          message: `${member.displayName || member.username} has left the group${reason ? ': ' + reason : ''}`,
          priority: 'normal',
          actionUrl: `/dashboard/connections/groups/${groupId}`,
          triggeredBy: userId,
          metadata: { groupId, groupName: group.name }
        });
      } catch (error) {
        console.error('Failed to send member_left notification:', error);
      }

      // Log activity
      await this.logGroupActivity(groupId, userId, 'member_left',
        `${member.displayName || member.username} left the group`, {
          description: reason || undefined,
          targetType: 'user',
          targetId: userId
        });
    }
  }

  /**
   * Get group by ID without access check (internal use for notifications after member removal)
   */
  private async getGroupById(groupId: number): Promise<ConnectionGroup | null> {
    const result = await this.db.query(
      `SELECT
        cg.id, cg.user_id AS userId, cg.name, cg.description, cg.color, cg.icon,
        cg.is_quote_pool AS isQuotePool, cg.quote_pool_category AS quotePoolCategory,
        cg.enable_member_recommendations AS enableMemberRecommendations,
        cg.recommendation_visibility AS recommendationVisibility,
        cg.is_archived AS isArchived,
        (SELECT COUNT(*) FROM connection_group_members WHERE group_id = cg.id) AS memberCount,
        cg.created_at AS createdAt, cg.updated_at AS updatedAt
       FROM connection_groups cg
       WHERE cg.id = ?`,
      [groupId]
    );

    if (result.rows.length === 0) return null;
    const group = result.rows[0] as ConnectionGroup;
    return { ...group, memberCount: bigIntToNumber(group.memberCount) };
  }

  // ============================================================================
  // Mute Group
  // ============================================================================

  /**
   * Toggle mute status for a group member
   * When muted, all notifications are suppressed and activity runs silently
   */
  async toggleMuteGroup(groupId: number, userId: number, muted: boolean): Promise<void> {
    const hasAccess = await this.verifyGroupAccess(groupId, userId);
    if (!hasAccess) {
      throw new UnauthorizedGroupAccessError();
    }

    // Owner shouldn't need to mute, but we allow it
    await this.db.query(
      `UPDATE connection_group_members
       SET is_muted = ?
       WHERE group_id = ? AND member_user_id = ?`,
      [muted, groupId, userId]
    );
  }
}
