/**
 * ConnectionGroupService PYMK Integration Tests
 *
 * Tests the People You May Know integration including:
 * - Recommendation generation when members are added
 * - Points attribution to group creators
 * - Bidirectional recommendation creation
 * - Duplicate prevention
 *
 * @phase Connection Groups Feature - Phase 1
 * @coverage Target: 90%+
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionGroupService } from '../ConnectionGroupService';
import { DatabaseService } from '@core/services/DatabaseService';

// Mock SharingService
const mockCreateRecommendation = vi.fn();
vi.mock('@features/contacts/services/SharingService', () => ({
  SharingService: vi.fn().mockImplementation(() => ({
    createRecommendation: mockCreateRecommendation
  }))
}));

describe('ConnectionGroupService - PYMK Integration', () => {
  let service: ConnectionGroupService;
  let mockDb: DatabaseService;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = vi.fn();
    mockDb = {
      query: mockQuery
    } as unknown as DatabaseService;
    service = new ConnectionGroupService(mockDb);

    // Reset mock implementation
    mockCreateRecommendation.mockReset();
    mockCreateRecommendation.mockResolvedValue({ id: 100 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addMembers with recommendation generation', () => {
    it('should create recommendations for unconnected pairs when enabled', async () => {
      // Setup: Group with recommendations enabled, adding 2 new members who aren't connected
      setupOwnershipCheck();
      setupGroupWithRecommendationsEnabled('Test Group');

      // Member 10: is a connection, not in group, will be added
      setupMemberIsConnection(10);
      setupMemberNotInGroup(10);
      setupMemberInsert();
      setupGetGroupMember(10);

      // Member 11: is a connection, not in group, will be added
      setupMemberIsConnection(11);
      setupMemberNotInGroup(11);
      setupMemberInsert();
      setupGetGroupMember(11);

      // After adding, get all members
      setupGetAllMembers([10, 11]);

      // Check if users are connected (they aren't)
      mockQuery.mockResolvedValueOnce({ rows: [] }); // 10-11 not connected

      // Check for existing recommendations (none exist)
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing rec 10->11
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Track rec 10->11
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing rec 11->10
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Track rec 11->10

      const result = await service.addMembers(1, 1, [10, 11]);

      expect(result.members).toHaveLength(2);
      expect(result.recommendationsCreated).toBe(2); // Bidirectional
      expect(result.potentialPoints).toBe(20); // 2 × 10 points

      // Verify createRecommendation was called twice
      expect(mockCreateRecommendation).toHaveBeenCalledTimes(2);

      // First call: creator recommends 11 to 10
      expect(mockCreateRecommendation).toHaveBeenCalledWith(1, {
        recipient_user_id: 10,
        entity_type: 'user',
        entity_id: '11',
        message: expect.stringContaining('Test Group')
      });

      // Second call: creator recommends 10 to 11
      expect(mockCreateRecommendation).toHaveBeenCalledWith(1, {
        recipient_user_id: 11,
        entity_type: 'user',
        entity_id: '10',
        message: expect.stringContaining('Test Group')
      });
    });

    it('should NOT create recommendations when enableMemberRecommendations is false', async () => {
      setupOwnershipCheck();
      setupGroupWithRecommendationsDisabled();

      setupMemberIsConnection(10);
      setupMemberNotInGroup(10);
      setupMemberInsert();
      setupGetGroupMember(10);

      const result = await service.addMembers(1, 1, [10]);

      expect(result.recommendationsCreated).toBe(0);
      expect(result.potentialPoints).toBe(0);
      expect(mockCreateRecommendation).not.toHaveBeenCalled();
    });

    it('should NOT create recommendations for already connected users', async () => {
      setupOwnershipCheck();
      setupGroupWithRecommendationsEnabled('Test Group');

      // Add two members
      setupMemberIsConnection(10);
      setupMemberNotInGroup(10);
      setupMemberInsert();
      setupGetGroupMember(10);

      setupMemberIsConnection(11);
      setupMemberNotInGroup(11);
      setupMemberInsert();
      setupGetGroupMember(11);

      setupGetAllMembers([10, 11]);

      // Users ARE already connected
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // 10-11 ARE connected

      const result = await service.addMembers(1, 1, [10, 11]);

      expect(result.recommendationsCreated).toBe(0);
      expect(mockCreateRecommendation).not.toHaveBeenCalled();
    });

    it('should cap recommendations at 10 (50 points)', async () => {
      setupOwnershipCheck();
      setupGroupWithRecommendationsEnabled('Large Group');

      // Add 6 members (which creates 15 pairs = 30 potential recommendations)
      const memberIds = [10, 11, 12, 13, 14, 15];

      for (const memberId of memberIds) {
        setupMemberIsConnection(memberId);
        setupMemberNotInGroup(memberId);
        setupMemberInsert();
        setupGetGroupMember(memberId);
      }

      setupGetAllMembers(memberIds);

      // Setup all pairs as unconnected and no existing recommendations
      // For 6 members: 15 pairs
      for (let i = 0; i < 15; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Not connected
      }

      // Setup no existing recommendations (will be called up to 10 times before cap)
      for (let i = 0; i < 20; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing rec
      }

      const result = await service.addMembers(1, 1, memberIds);

      // Should be capped at 10 recommendations
      expect(result.recommendationsCreated).toBe(10);
      expect(result.potentialPoints).toBe(50); // Capped at 50
      expect(mockCreateRecommendation).toHaveBeenCalledTimes(10);
    });

    it('should skip duplicate recommendations', async () => {
      setupOwnershipCheck();
      setupGroupWithRecommendationsEnabled('Test Group');

      setupMemberIsConnection(10);
      setupMemberNotInGroup(10);
      setupMemberInsert();
      setupGetGroupMember(10);

      setupMemberIsConnection(11);
      setupMemberNotInGroup(11);
      setupMemberInsert();
      setupGetGroupMember(11);

      setupGetAllMembers([10, 11]);

      // Not connected
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // First direction: recommendation ALREADY EXISTS
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Existing rec 10->11

      // Second direction: no existing
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing rec 11->10
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Track

      const result = await service.addMembers(1, 1, [10, 11]);

      expect(result.recommendationsCreated).toBe(1); // Only one direction
      expect(mockCreateRecommendation).toHaveBeenCalledTimes(1);
    });

    it('should continue if one recommendation fails', async () => {
      setupOwnershipCheck();
      setupGroupWithRecommendationsEnabled('Test Group');

      setupMemberIsConnection(10);
      setupMemberNotInGroup(10);
      setupMemberInsert();
      setupGetGroupMember(10);

      setupMemberIsConnection(11);
      setupMemberNotInGroup(11);
      setupMemberInsert();
      setupGetGroupMember(11);

      setupGetAllMembers([10, 11]);

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Not connected
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing

      // First recommendation fails
      mockCreateRecommendation.mockRejectedValueOnce(new Error('Network error'));

      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing for second
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Track for second

      // Second recommendation succeeds
      mockCreateRecommendation.mockResolvedValueOnce({ id: 101 });

      const result = await service.addMembers(1, 1, [10, 11]);

      // Should still create 1 recommendation even though first failed
      expect(result.recommendationsCreated).toBe(1);
    });
  });

  describe('getSharedGroupConnections', () => {
    it('should return users in shared groups who are not connected', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          userId: 20,
          username: 'user20',
          displayName: 'User Twenty',
          avatarUrl: null,
          avatarBgColor: '#FF0000',
          groupIds: '1,2',
          groupNames: 'Church Friends,Neighbors',
          totalSharedGroups: 2n,
          curatorUserId: 5,
          curatorUsername: 'sarah',
          curatorDisplayName: 'Sarah'
        }]
      });

      const result = await service.getSharedGroupConnections(10);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(20);
      expect(result[0].sharedGroups).toHaveLength(2);
      expect(result[0].totalSharedGroups).toBe(2);
    });

    it('should return empty array when no shared groups', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getSharedGroupConnections(10);

      expect(result).toHaveLength(0);
    });
  });

  describe('setGroupPymkOptOut', () => {
    it('should update pymk_opt_out for member', async () => {
      mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

      await service.setGroupPymkOptOut(1, 10, true);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pymk_opt_out'),
        [true, 1, 10]
      );
    });
  });

  // Helper functions for setting up mocks
  function setupOwnershipCheck() {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
  }

  function setupGroupWithRecommendationsEnabled(groupName: string) {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        userId: 1,
        name: groupName,
        enableMemberRecommendations: true,
        recommendationVisibility: 'all_members',
        isArchived: false,
        memberCount: 0n
      }]
    });
  }

  function setupGroupWithRecommendationsDisabled() {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        userId: 1,
        name: 'Test Group',
        enableMemberRecommendations: false,
        memberCount: 0n
      }]
    });
  }

  function setupMemberIsConnection(memberId: number) {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
  }

  function setupMemberNotInGroup(memberId: number) {
    mockQuery.mockResolvedValueOnce({ rows: [] });
  }

  function setupMemberInsert() {
    mockQuery.mockResolvedValueOnce({ insertId: 1 });
  }

  function setupGetGroupMember(memberId: number) {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        groupId: 1,
        memberUserId: memberId,
        username: `user${memberId}`,
        displayName: `User ${memberId}`
      }]
    });
  }

  function setupGetAllMembers(memberIds: number[]) {
    // First for ownership check
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    // Then for actual members
    mockQuery.mockResolvedValueOnce({
      rows: memberIds.map(id => ({
        id,
        groupId: 1,
        memberUserId: id,
        username: `user${id}`
      }))
    });
  }
});
