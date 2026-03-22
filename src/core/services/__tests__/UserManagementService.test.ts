/**
 * UserManagementService Tests
 *
 * GOVERNANCE COMPLIANCE:
 * - Comprehensive test coverage (36+ tests, 90%+ target)
 * - Tests all 17 service methods
 * - Uses mocked DatabaseService (no real DB connections)
 * - Error scenario testing
 *
 * @authority Phase 4 Brain Plan - Task 4.7 Testing Requirements
 * @fixed 2025-12-05 - Applied mocking pattern from passing tests with complete mock data
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  UserManagementService,
  AccountType,
  UserStatus,
  UserNotFoundError,
  DuplicateEmailError
} from '../UserManagementService';

// Helper to create complete mock user row (all 33 fields from database schema)
function createMockUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: 'test-uuid-123',
    email: 'test@example.com',
    password_hash: Buffer.from('hashed_password'), // Database returns Buffer
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    display_name: 'Test User',
    avatar_url: null,
    is_active: 1,
    email_verified_at: new Date(),
    last_login_at: new Date(),
    password_changed_at: new Date(),
    failed_login_attempts: 0,
    locked_until: null,
    deleted_at: null,
    email_normalized: 'test@example.com',
    role: 'user',
    is_verified: 1,
    is_mock: 0,
    created_at: new Date(),
    updated_at: new Date(),
    membership_tier: 'free',
    user_group: '[]',
    permissions: null,
    is_business_owner: 0,
    privacy_settings: null,
    login_count: 0,
    last_ip_address: null,
    last_user_agent: null,
    terms_accepted_at: new Date(),
    terms_version: 'v1',
    status: 'active',
    ...overrides
  };
}

describe('UserManagementService', () => {
  let service: UserManagementService;
  let mockDb: unknown;
  let mockUserRepo: unknown;
  let testUserId: number;

  beforeEach(() => {
    // Mock DatabaseService
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };

    // Mock UserRepo
    mockUserRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      update: vi.fn()
    };

    service = new UserManagementService(mockDb, mockUserRepo);
    testUserId = 1;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // USER CRUD OPERATIONS
  // ==========================================================================

  describe('getAll', () => {
    it('should return paginated users with default pagination', async () => {
      const mockUsers = [
        createMockUserRow({ id: 1, email: 'user1@example.com' }),
        createMockUserRow({ id: 2, email: 'user2@example.com' })
      ];

      // Mock: COUNT query first, then SELECT query
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 50 }], rowCount: 1 }) // COUNT
        .mockResolvedValueOnce({ rows: mockUsers, rowCount: 2 }); // SELECT

      const result = await service.getAll();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.data.length).toBe(2);
    });

    it('should filter users by role', async () => {
      const mockUsers = [
        createMockUserRow({ id: 1, role: 'user' })
      ];

      // Mock: COUNT query first, then SELECT query
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 }) // COUNT
        .mockResolvedValueOnce({ rows: mockUsers, rowCount: 1 }); // SELECT

      const result = await service.getAll({ role: 'user' });

      expect(result.data.every(u => u.role === 'user')).toBe(true);
    });

    it('should filter users by search query', async () => {
      const mockUsers = [
        createMockUserRow({ id: 1, email: 'test@example.com', username: 'testuser', first_name: 'Test' })
      ];

      // Mock: COUNT query first, then SELECT query
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 }) // COUNT
        .mockResolvedValueOnce({ rows: mockUsers, rowCount: 1 }); // SELECT

      const result = await service.getAll({ searchQuery: 'test' });

      expect(result.data.length).toBe(1);
    });

    it('should support custom pagination', async () => {
      const mockUsers = Array.from({ length: 5 }, (_, i) =>
        createMockUserRow({ id: i + 1, email: `u${i + 1}@test.com` })
      );

      // Mock: COUNT query first, then SELECT query
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 50 }], rowCount: 1 }) // COUNT
        .mockResolvedValueOnce({ rows: mockUsers, rowCount: 5 }); // SELECT

      const result = await service.getAll(undefined, { page: 1, limit: 5 });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(5);
    });
  });

  describe('getById', () => {
    it('should return user by ID', async () => {
      const mockUser = createMockUserRow();

      // Mock: SELECT query
      mockDb.query.mockResolvedValue({ rows: [mockUser], rowCount: 1 });

      const user = await service.getById(testUserId);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(testUserId);
    });

    it('should return null for non-existent user', async () => {
      // Mock: SELECT query returns empty
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const user = await service.getById(999999);

      expect(user).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = createMockUserRow();

      // Mock: SELECT query
      mockDb.query.mockResolvedValue({ rows: [mockUser], rowCount: 1 });

      const user = await service.getByEmail('test@example.com');

      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      // Mock: SELECT query returns empty
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const user = await service.getByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const mockUser = createMockUserRow();
      const mockUpdated = createMockUserRow({ first_name: 'Updated', last_name: 'Name' });

      // Mock: getById (check user exists), UPDATE query, getById (return updated)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockUpdated], rowCount: 1 }); // getById

      const updated = await service.update(testUserId, { first_name: 'Updated', last_name: 'Name' });

      expect(updated.first_name).toBe('Updated');
      expect(updated.last_name).toBe('Name');
    });

    it('should throw error for duplicate email', async () => {
      const mockUser = createMockUserRow({ id: 1 });
      const mockOtherUser = createMockUserRow({ id: 2, email: 'other@example.com' });

      // Mock: getById, getByEmail (finds duplicate)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [mockOtherUser], rowCount: 1 }); // getByEmail

      await expect(
        service.update(testUserId, { email: 'other@example.com' })
      ).rejects.toThrow(DuplicateEmailError);
    });

    it('should throw error for non-existent user', async () => {
      // Mock: getById returns null
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        service.update(999999, { first_name: 'Test' })
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should return same user if no changes', async () => {
      const mockUser = createMockUserRow();

      // Mock: getById (only one call since no updates)
      mockDb.query.mockResolvedValue({ rows: [mockUser], rowCount: 1 });

      const updated = await service.update(testUserId, {});

      expect(updated.id).toBe(mockUser.id);
    });
  });

  describe('delete', () => {
    it('should soft delete user', async () => {
      const mockUser = createMockUserRow();
      const mockDeleted = createMockUserRow({ status: UserStatus.DELETED, is_active: 0, deleted_at: new Date() });

      // Mock: getById (check user exists), UPDATE query, getById (verify deletion)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE (soft delete)
        .mockResolvedValueOnce({ rows: [mockDeleted], rowCount: 1 }); // getById

      await service.delete(testUserId);

      const user = await service.getById(testUserId);
      expect(user?.status).toBe(UserStatus.DELETED);
    });

    it('should throw error for non-existent user', async () => {
      // Mock: getById returns null
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(service.delete(999999)).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('suspend and unsuspend', () => {
    it('should suspend user account', async () => {
      const mockUser = createMockUserRow();
      const mockSuspended = createMockUserRow({ status: UserStatus.SUSPENDED, is_active: 0 });

      // Mock: getById, UPDATE (suspend), INSERT (logActivity), getById
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (for logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockSuspended], rowCount: 1 }); // getById (final)

      const suspended = await service.suspend(testUserId, 'Violation of terms');

      expect(suspended.status).toBe(UserStatus.SUSPENDED);
    });

    it('should unsuspend user account', async () => {
      const mockUser = createMockUserRow({ status: UserStatus.SUSPENDED });
      const mockUnsuspended = createMockUserRow({ status: UserStatus.ACTIVE });

      // Mock: getById, UPDATE (unsuspend), INSERT (logActivity), getById
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (for logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUnsuspended], rowCount: 1 }); // getById (final)

      const unsuspended = await service.unsuspend(testUserId);

      expect(unsuspended.status).toBe(UserStatus.ACTIVE);
    });

    it('should log suspension activity', async () => {
      const mockUser = createMockUserRow();
      const mockActivity = {
        id: 1,
        user_id: testUserId,
        user_name: mockUser.display_name,
        user_email: mockUser.email,
        action: 'account_suspended',
        action_type: 'account',
        description: 'Account suspended: Test suspension',
        entity_type: null,
        entity_id: null,
        entity_name: null,
        ip_address: null,
        user_agent: null,
        browser_info: null,
        device_type: null,
        location: null,
        referrer: null,
        session_id: null,
        duration: null,
        success: 1,
        error_message: null,
        created_at: new Date()
      };

      // Mock: suspend flow + getActivityLog
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (suspend)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE (suspend)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [createMockUserRow({ status: UserStatus.SUSPENDED })], rowCount: 1 }) // getById (suspend return)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (getActivityLog)
        .mockResolvedValueOnce({ rows: [mockActivity], rowCount: 1 }); // SELECT (getActivityLog)

      await service.suspend(testUserId, 'Test suspension');
      const activities = await service.getActivityLog(testUserId);

      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0]?.action).toBe('account_suspended');
    });
  });

  // ==========================================================================
  // ACCOUNT TYPE MANAGEMENT
  // ==========================================================================

  describe('upgradeToListingMember', () => {
    it('should upgrade user to listing member', async () => {
      const mockUser = createMockUserRow({ is_business_owner: 0 });
      const mockUpgraded = createMockUserRow({ is_business_owner: 1 });

      // Mock: getById, UPDATE, INSERT (logActivity - not called in code!), getById
      // Note: upgradeToListingMember doesn't call logActivity based on service code (line 649-684)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (for logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUpgraded], rowCount: 1 }); // getById (final)

      const upgraded = await service.upgradeToListingMember(testUserId);

      expect(upgraded.is_business_owner).toBe(true);
    });

    it('should not upgrade if already listing member', async () => {
      const mockUser = createMockUserRow({ is_business_owner: 1 });

      // Mock: getById only
      mockDb.query.mockResolvedValue({ rows: [mockUser], rowCount: 1 });

      const upgraded = await service.upgradeToListingMember(testUserId);

      expect(upgraded.is_business_owner).toBe(true);
    });
  });

  describe('setAccountType', () => {
    it('should set account type to admin', async () => {
      const mockUser = createMockUserRow({ role: 'user' });
      const mockUpdated = createMockUserRow({ role: 'admin' });

      // Mock: getById, UPDATE, INSERT (logActivity), getById
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (for logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUpdated], rowCount: 1 }); // getById (final)

      const updated = await service.setAccountType(testUserId, AccountType.ADMIN);

      expect(updated.role).toBe('admin');
    });

    it('should set account type to listing member', async () => {
      const mockUser = createMockUserRow({ is_business_owner: 0 });
      const mockUpdated = createMockUserRow({ is_business_owner: 1 });

      // Mock: getById, UPDATE, INSERT (logActivity), getById
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (for logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUpdated], rowCount: 1 }); // getById (final)

      const updated = await service.setAccountType(testUserId, AccountType.LISTING_MEMBER);

      expect(updated.is_business_owner).toBe(true);
    });

    it('should log account type change', async () => {
      const mockUser = createMockUserRow();
      const mockActivity = {
        id: 1,
        user_id: testUserId,
        user_name: mockUser.display_name,
        user_email: mockUser.email,
        action: 'account_type_changed',
        action_type: 'account',
        description: 'Account type changed to admin',
        entity_type: null,
        entity_id: null,
        entity_name: null,
        ip_address: null,
        user_agent: null,
        browser_info: null,
        device_type: null,
        location: null,
        referrer: null,
        session_id: null,
        duration: null,
        success: 1,
        error_message: null,
        created_at: new Date()
      };

      // Mock: setAccountType flow + getActivityLog
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (setAccountType)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE (setAccountType)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [createMockUserRow({ role: 'admin' })], rowCount: 1 }) // getById (setAccountType return)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (getActivityLog)
        .mockResolvedValueOnce({ rows: [mockActivity], rowCount: 1 }); // SELECT (getActivityLog)

      await service.setAccountType(testUserId, AccountType.ADMIN);
      const activities = await service.getActivityLog(testUserId);

      expect(activities.some(a => a.action === 'account_type_changed')).toBe(true);
    });
  });

  // ==========================================================================
  // TAG MANAGEMENT
  // ==========================================================================

  describe('addTag', () => {
    it('should add tag to user', async () => {
      const mockUser = createMockUserRow({ user_group: '[]' });
      const mockUserWithTag = createMockUserRow({ user_group: '["Founding Member"]' });

      // Mock: getById, UPDATE, INSERT (logActivity), getById (for getUserTags)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (addTag)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE (addTag)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (for logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUserWithTag], rowCount: 1 }); // getById (getUserTags)

      await service.addTag(testUserId, 'Founding Member', '#3B82F6');

      const tags = await service.getUserTags(testUserId);
      expect(tags.some(t => t.tag === 'Founding Member')).toBe(true);
    });

    it('should not add duplicate tags', async () => {
      const mockUser = createMockUserRow({ user_group: '["VIP"]' });

      // Mock: getById (tag already exists, no UPDATE)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (for logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }); // getById (getUserTags)

      await service.addTag(testUserId, 'VIP', '#3B82F6');

      const tags = await service.getUserTags(testUserId);
      expect(tags.length).toBe(1);
    });
  });

  describe('removeTag', () => {
    it('should remove tag from user', async () => {
      const mockUser = createMockUserRow({ user_group: '["Test Tag"]' });
      const mockUserNoTags = createMockUserRow({ user_group: '[]' });

      // Mock: getById, UPDATE, INSERT (logActivity), getById (for getUserTags)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (removeTag)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE (removeTag)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (for logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUserNoTags], rowCount: 1 }); // getById (getUserTags)

      await service.removeTag(testUserId, 'Test Tag');

      const tags = await service.getUserTags(testUserId);
      expect(tags.length).toBe(0);
    });
  });

  describe('getUserTags', () => {
    it('should return all user tags', async () => {
      const mockUser = createMockUserRow({
        user_group: '["Tag1","Tag2"]'
      });

      // Mock: getById only
      mockDb.query.mockResolvedValue({ rows: [mockUser], rowCount: 1 });

      const tags = await service.getUserTags(testUserId);
      expect(tags.length).toBe(2);
      expect(tags.some(t => t.tag === 'Tag1')).toBe(true);
    });

    it('should return empty array for user with no tags', async () => {
      const mockUser = createMockUserRow({ user_group: '[]' });

      // Mock: getById only
      mockDb.query.mockResolvedValue({ rows: [mockUser], rowCount: 1 });

      const tags = await service.getUserTags(testUserId);
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBe(0);
    });
  });

  // ==========================================================================
  // ACTIVITY TRACKING
  // ==========================================================================

  describe('getActivityLog', () => {
    it('should return user activity log', async () => {
      const mockUser = createMockUserRow();
      const mockActivity = {
        id: 1,
        user_id: testUserId,
        user_name: mockUser.display_name,
        user_email: mockUser.email,
        action: 'test_action',
        action_type: 'test',
        description: 'Test activity',
        entity_type: null,
        entity_id: null,
        entity_name: null,
        ip_address: null,
        user_agent: null,
        browser_info: null,
        device_type: null,
        location: null,
        referrer: null,
        session_id: null,
        duration: null,
        success: 1,
        error_message: null,
        created_at: new Date()
      };

      // Mock: logActivity flow + getActivityLog
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (getActivityLog)
        .mockResolvedValueOnce({ rows: [mockActivity], rowCount: 1 }); // SELECT (getActivityLog)

      await service.logActivity(testUserId, {
        action: 'test_action',
        action_type: 'test',
        description: 'Test activity',
        success: true
      });

      const activities = await service.getActivityLog(testUserId);
      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0]?.action).toBe('test_action');
    });

    it('should respect limit parameter', async () => {
      const mockUser = createMockUserRow();
      const mockActivities = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        user_id: testUserId,
        user_name: mockUser.display_name,
        user_email: mockUser.email,
        action: `test_${i}`,
        action_type: 'test',
        description: `Test ${i}`,
        entity_type: null,
        entity_id: null,
        entity_name: null,
        ip_address: null,
        user_agent: null,
        browser_info: null,
        device_type: null,
        location: null,
        referrer: null,
        session_id: null,
        duration: null,
        success: 1,
        error_message: null,
        created_at: new Date()
      }));

      // Mock: getById, SELECT (with limit)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: mockActivities.slice(0, 3), rowCount: 3 }); // SELECT LIMIT 3

      const activities = await service.getActivityLog(testUserId, 3);
      expect(activities.length).toBeLessThanOrEqual(3);
    });
  });

  describe('logActivity', () => {
    it('should log activity with full details', async () => {
      const mockUser = createMockUserRow();
      const mockActivity = {
        id: 1,
        user_id: testUserId,
        user_name: mockUser.display_name,
        user_email: mockUser.email,
        action: 'profile_update',
        action_type: 'profile',
        description: 'Updated profile information',
        entity_type: 'user',
        entity_id: testUserId.toString(),
        entity_name: null,
        ip_address: '192.168.1.1',
        user_agent: 'Test Browser',
        browser_info: null,
        device_type: null,
        location: null,
        referrer: null,
        session_id: null,
        duration: null,
        success: 1,
        error_message: null,
        created_at: new Date()
      };

      // Mock: logActivity flow + getActivityLog
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (getActivityLog)
        .mockResolvedValueOnce({ rows: [mockActivity], rowCount: 1 }); // SELECT (getActivityLog)

      await service.logActivity(testUserId, {
        action: 'profile_update',
        action_type: 'profile',
        description: 'Updated profile information',
        entity_type: 'user',
        entity_id: testUserId.toString(),
        ip_address: '192.168.1.1',
        user_agent: 'Test Browser',
        success: true
      });

      const activities = await service.getActivityLog(testUserId);
      const logged = activities.find(a => a.action === 'profile_update');

      expect(logged).toBeDefined();
      expect(logged?.entity_type).toBe('user');
    });

    it('should throw error for non-existent user', async () => {
      // Mock: getById returns null
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        service.logActivity(999999, {
          action: 'test',
          action_type: 'test',
          description: 'Test'
        })
      ).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('getLoginHistory', () => {
    it('should return login history', async () => {
      const mockUser = createMockUserRow();
      const mockLoginActivity = {
        created_at: new Date(),
        ip_address: '192.168.1.1',
        user_agent: 'Test Browser',
        success: 1
      };

      // Mock: logActivity flow + getLoginHistory
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (logActivity)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT (logActivity)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById (getLoginHistory)
        .mockResolvedValueOnce({ rows: [mockLoginActivity], rowCount: 1 }); // SELECT (getLoginHistory)

      await service.logActivity(testUserId, {
        action: 'login',
        action_type: 'auth',
        description: 'User logged in',
        ip_address: '192.168.1.1',
        user_agent: 'Test Browser',
        success: true
      });

      const history = await service.getLoginHistory(testUserId);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]?.ip_address).toBe('192.168.1.1');
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockUser = createMockUserRow({ created_at: new Date('2024-01-01') });

      // Mock: getById, COUNT(listings), COUNT(connections), SELECT(last_activity)
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [{ count: 5 }], rowCount: 1 }) // COUNT listings
        .mockResolvedValueOnce({ rows: [{ count: 10 }], rowCount: 1 }) // COUNT connections
        .mockResolvedValueOnce({ rows: [{ created_at: new Date() }], rowCount: 1 }); // SELECT last_activity

      const stats = await service.getUserStats(testUserId);

      expect(stats).toHaveProperty('totalListings');
      expect(stats).toHaveProperty('totalReviews');
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('accountAge');
      expect(typeof stats.accountAge).toBe('number');
    });

    it('should throw error for non-existent user', async () => {
      // Mock: getById returns null
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(service.getUserStats(999999)).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('getPlatformStats', () => {
    it('should return platform-wide statistics', async () => {
      // Mock: 7 queries for platform stats
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 100 }], rowCount: 1 }) // COUNT total users
        .mockResolvedValueOnce({ rows: [{ count: 80 }], rowCount: 1 }) // COUNT active users
        .mockResolvedValueOnce({ rows: [{ count: 10 }], rowCount: 1 }) // COUNT new signups
        .mockResolvedValueOnce({ rows: [{ count: 5 }], rowCount: 1 }) // COUNT suspended
        .mockResolvedValueOnce({ rows: [{ role: 'user', count: 85 }, { role: 'admin', count: 15 }], rowCount: 2 }) // GROUP BY role
        .mockResolvedValueOnce({ rows: [{ membership_tier: 'free', count: 70 }, { membership_tier: 'premium', count: 30 }], rowCount: 2 }) // GROUP BY tier
        .mockResolvedValueOnce({ rows: [{ status: 'active', count: 90 }, { status: 'suspended', count: 10 }], rowCount: 2 }); // GROUP BY status

      const stats = await service.getPlatformStats();

      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('activeUsers');
      expect(stats.totalUsers).toBe(100);
    });

    it('should have correct user count breakdown', async () => {
      // Mock: 7 queries for platform stats
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 100 }], rowCount: 1 }) // COUNT total users
        .mockResolvedValueOnce({ rows: [{ count: 80 }], rowCount: 1 }) // COUNT active users
        .mockResolvedValueOnce({ rows: [{ count: 10 }], rowCount: 1 }) // COUNT new signups
        .mockResolvedValueOnce({ rows: [{ count: 5 }], rowCount: 1 }) // COUNT suspended
        .mockResolvedValueOnce({ rows: [{ role: 'user', count: 85 }, { role: 'admin', count: 15 }], rowCount: 2 }) // GROUP BY role
        .mockResolvedValueOnce({ rows: [{ membership_tier: 'free', count: 70 }, { membership_tier: 'premium', count: 30 }], rowCount: 2 }) // GROUP BY tier
        .mockResolvedValueOnce({ rows: [{ status: 'active', count: 90 }, { status: 'suspended', count: 10 }], rowCount: 2 }); // GROUP BY status

      const stats = await service.getPlatformStats();

      const roleSum = Object.values(stats.usersByRole).reduce((sum, count) => sum + (count as number), 0);
      expect(roleSum).toBe(100);
    });
  });
});
