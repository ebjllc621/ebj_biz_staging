/**
 * ConnectionGroupService Unit Tests
 *
 * Tests core functionality of ConnectionGroupService including:
 * - Group CRUD operations
 * - Member management
 * - PYMK recommendation generation
 * - Points attribution
 *
 * @phase Connection Groups Feature - Phase 1
 * @coverage Target: 80%+
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionGroupService } from '../ConnectionGroupService';
import { DatabaseService } from '@core/services/DatabaseService';

// Mock SharingService
vi.mock('@features/contacts/services/SharingService', () => ({
  SharingService: vi.fn().mockImplementation(() => ({
    createRecommendation: vi.fn().mockResolvedValue({ id: 1 })
  }))
}));

describe('ConnectionGroupService', () => {
  let service: ConnectionGroupService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    mockDb = {
      query: vi.fn()
    } as unknown as DatabaseService;
    service = new ConnectionGroupService(mockDb);
  });

  describe('createGroup', () => {
    it('should create a group with default values', async () => {
      const userId = 1;
      const input = { name: 'Test Group' };

      // Mock insert
      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ insertId: 1 })
        // Mock getGroup query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            userId: 1,
            name: 'Test Group',
            description: null,
            color: '#3B82F6',
            icon: 'users',
            isQuotePool: false,
            quotePoolCategory: null,
            enableMemberRecommendations: true,
            recommendationVisibility: 'all_members',
            isArchived: false,
            memberCount: 0n,
            createdAt: new Date(),
            updatedAt: new Date()
          }]
        });

      const result = await service.createGroup(userId, input);

      expect(result.name).toBe('Test Group');
      expect(result.color).toBe('#3B82F6');
      expect(result.icon).toBe('users');
      expect(result.enableMemberRecommendations).toBe(true);
    });

    it('should create a group with custom values', async () => {
      const userId = 1;
      const input = {
        name: 'Custom Group',
        description: 'A custom description',
        color: '#FF0000',
        icon: 'star',
        enableMemberRecommendations: false
      };

      (mockDb.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ insertId: 2 })
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            userId: 1,
            name: 'Custom Group',
            description: 'A custom description',
            color: '#FF0000',
            icon: 'star',
            isQuotePool: false,
            quotePoolCategory: null,
            enableMemberRecommendations: false,
            recommendationVisibility: 'all_members',
            isArchived: false,
            memberCount: 0n,
            createdAt: new Date(),
            updatedAt: new Date()
          }]
        });

      const result = await service.createGroup(userId, input);

      expect(result.color).toBe('#FF0000');
      expect(result.icon).toBe('star');
      expect(result.enableMemberRecommendations).toBe(false);
    });
  });

  describe('getGroup', () => {
    it('should return group with member count', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{
          id: 1,
          userId: 1,
          name: 'Test Group',
          memberCount: 5n
        }]
      });

      const result = await service.getGroup(1, 1);

      expect(result).not.toBeNull();
      expect(result!.memberCount).toBe(5);
    });

    it('should return null for non-existent group', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: []
      });

      const result = await service.getGroup(999, 1);

      expect(result).toBeNull();
    });

    it('should return null for group owned by different user', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: []
      });

      const result = await service.getGroup(1, 999);

      expect(result).toBeNull();
    });
  });

  describe('getUserGroups', () => {
    it('should return groups for user', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Group 1', memberCount: 3n },
          { id: 2, name: 'Group 2', memberCount: 5n }
        ]
      });

      const result = await service.getUserGroups(1);

      expect(result).toHaveLength(2);
      expect(result[0].memberCount).toBe(3);
      expect(result[1].memberCount).toBe(5);
    });

    it('should exclude archived groups by default', async () => {
      const mockQuery = mockDb.query as ReturnType<typeof vi.fn>;
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getUserGroups(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_archived = FALSE'),
        expect.any(Array)
      );
    });

    it('should include archived groups when requested', async () => {
      const mockQuery = mockDb.query as ReturnType<typeof vi.fn>;
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.getUserGroups(1, { includeArchived: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('is_archived = FALSE'),
        expect.any(Array)
      );
    });
  });

  describe('updateGroup', () => {
    it('should update group fields', async () => {
      const mockQuery = mockDb.query as ReturnType<typeof vi.fn>;

      // Mock ownership check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock update
      mockQuery.mockResolvedValueOnce({ affectedRows: 1 });
      // Mock getGroup for return
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          userId: 1,
          name: 'Updated Name',
          memberCount: 0n
        }]
      });

      const result = await service.updateGroup(1, 1, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw UnauthorizedGroupAccessError for non-owner', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: []
      });

      await expect(service.updateGroup(1, 999, { name: 'test' }))
        .rejects.toThrow('Not authorized to access this group');
    });
  });

  describe('deleteGroup', () => {
    it('should archive group (soft delete)', async () => {
      const mockQuery = mockDb.query as ReturnType<typeof vi.fn>;

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

      await service.deleteGroup(1, 1);

      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('is_archived = TRUE'),
        [1]
      );
    });
  });

  describe('addMembers', () => {
    it('should add members and skip duplicates', async () => {
      const mockQuery = mockDb.query as ReturnType<typeof vi.fn>;

      // Mock ownership check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock getGroup (for enableMemberRecommendations check)
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          userId: 1,
          name: 'Test Group',
          enableMemberRecommendations: false,
          memberCount: 0n
        }]
      });
      // Mock connection check for member 10
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock duplicate check for member 10
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock insert
      mockQuery.mockResolvedValueOnce({ insertId: 1 });
      // Mock getGroupMember
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          groupId: 1,
          memberUserId: 10,
          username: 'user10'
        }]
      });
      // Mock connection check for member 11
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // Mock duplicate check for member 11 (already exists)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });

      const result = await service.addMembers(1, 1, [10, 11]);

      expect(result.members).toHaveLength(1);
      expect(result.members[0].memberUserId).toBe(10);
    });

    it('should throw NotAConnectionError for non-connections', async () => {
      const mockQuery = mockDb.query as ReturnType<typeof vi.fn>;

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          enableMemberRecommendations: true,
          memberCount: 0n
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Not a connection

      await expect(service.addMembers(1, 1, [999]))
        .rejects.toThrow('User 999 is not a connection');
    });
  });

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      const mockQuery = mockDb.query as ReturnType<typeof vi.fn>;

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

      await service.removeMember(1, 1, 10);

      expect(mockQuery).toHaveBeenLastCalledWith(
        expect.stringContaining('DELETE FROM connection_group_members'),
        [1, 10]
      );
    });
  });

  describe('getGroupMembers', () => {
    it('should return members with user data', async () => {
      const mockQuery = mockDb.query as ReturnType<typeof vi.fn>;

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            groupId: 1,
            memberUserId: 10,
            username: 'user10',
            displayName: 'User 10',
            avatarUrl: null
          },
          {
            id: 2,
            groupId: 1,
            memberUserId: 11,
            username: 'user11',
            displayName: 'User 11',
            avatarUrl: '/avatar.jpg'
          }
        ]
      });

      const result = await service.getGroupMembers(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('user10');
      expect(result[1].avatarUrl).toBe('/avatar.jpg');
    });
  });

  describe('verifyGroupOwnership', () => {
    it('should return true for owner', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const result = await service.verifyGroupOwnership(1, 1);

      expect(result).toBe(true);
    });

    it('should return false for non-owner', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: []
      });

      const result = await service.verifyGroupOwnership(1, 999);

      expect(result).toBe(false);
    });
  });

  describe('verifyMemberIsConnection', () => {
    it('should return true for connected users', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const result = await service.verifyMemberIsConnection(1, 10);

      expect(result).toBe(true);
    });

    it('should return false for non-connected users', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: []
      });

      const result = await service.verifyMemberIsConnection(1, 999);

      expect(result).toBe(false);
    });
  });

  describe('getGroupStats', () => {
    it('should return aggregated stats', async () => {
      const mockQuery = mockDb.query as ReturnType<typeof vi.fn>;

      // Basic stats
      mockQuery.mockResolvedValueOnce({
        rows: [{ totalGroups: 5n, totalMembers: 25n }]
      });
      // Recommendation stats
      mockQuery.mockResolvedValueOnce({
        rows: [{ recommendationsCreated: 10n, recommendationsAccepted: 3n }]
      });
      // Points earned
      mockQuery.mockResolvedValueOnce({
        rows: [{ pointsEarned: 130n }]
      });

      const result = await service.getGroupStats(1);

      expect(result.totalGroups).toBe(5);
      expect(result.totalMembers).toBe(25);
      expect(result.recommendationsCreated).toBe(10);
      expect(result.recommendationsAccepted).toBe(3);
      expect(result.pointsEarned).toBe(130);
    });
  });

  describe('calculateGroupRecommendationScore', () => {
    it('should return score and data for shared groups', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{
          groupId: 1,
          groupName: 'Church Friends',
          curatorUserId: 5,
          curatorUsername: 'sarah',
          curatorDisplayName: 'Sarah Johnson',
          sharedGroupCount: 1n
        }]
      });

      const result = await service.calculateGroupRecommendationScore(10, 11, 5);

      expect(result.score).toBeGreaterThan(0);
      expect(result.data).not.toBeNull();
      expect(result.data!.primaryGroup.groupName).toBe('Church Friends');
      expect(result.data!.primaryGroup.curatorUsername).toBe('sarah');
    });

    it('should return 0 for users not in shared groups', async () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: []
      });

      const result = await service.calculateGroupRecommendationScore(10, 999, 5);

      expect(result.score).toBe(0);
      expect(result.data).toBeNull();
    });
  });
});
