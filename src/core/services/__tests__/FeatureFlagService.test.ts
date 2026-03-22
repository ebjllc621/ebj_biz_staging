/**
 * FeatureFlagService Tests
 *
 * @authority PHASE_6.1_BRAIN_PLAN.md - Section 7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureFlagService, Environment, FlagNotFoundError, DuplicateFlagError, InvalidRolloutPercentageError } from '../FeatureFlagService';
import { DatabaseService } from '../DatabaseService';

// Mock DatabaseService
const mockQuery = vi.fn();
const mockDb = {
  query: mockQuery
} as unknown as DatabaseService;

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeatureFlagService(mockDb);
  });

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  describe('getAllFlags', () => {
    it('should return all feature flags', async () => {
      const mockRows = [
        {
          id: 1,
          flag_key: 'test_flag',
          name: 'Test Flag',
          description: 'Test description',
          is_enabled: 1,
          rollout_percentage: 100,
          target_tiers: null,
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const flags = await service.getAllFlags();

      expect(flags).toHaveLength(1);
      expect(flags[0].flag_key).toBe('test_flag');
      expect(flags[0].is_enabled).toBe(true);
    });
  });

  describe('getFlagById', () => {
    it('should return flag when found', async () => {
      const mockRow = {
        id: 1,
        flag_key: 'test_flag',
        name: 'Test Flag',
        description: 'Test',
        is_enabled: 1,
        rollout_percentage: 100,
        target_tiers: null,
        target_user_ids: null,
        environment: 'production',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const flag = await service.getFlagById(1);

      expect(flag).not.toBeNull();
      expect(flag?.id).toBe(1);
      expect(flag?.flag_key).toBe('test_flag');
    });

    it('should return null when flag not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const flag = await service.getFlagById(999);

      expect(flag).toBeNull();
    });
  });

  describe('getFlagByName', () => {
    it('should return flag by key name', async () => {
      const mockRow = {
        id: 1,
        flag_key: 'premium_dark_mode',
        name: 'Premium Dark Mode',
        description: null,
        is_enabled: 1,
        rollout_percentage: 100,
        target_tiers: '["premium"]',
        target_user_ids: null,
        environment: 'production',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const flag = await service.getFlagByName('premium_dark_mode');

      expect(flag).not.toBeNull();
      expect(flag?.flag_key).toBe('premium_dark_mode');
      expect(flag?.target_tiers).toEqual(['premium']);
    });

    it('should cache flag results', async () => {
      const mockRow = {
        id: 1,
        flag_key: 'cached_flag',
        name: 'Cached Flag',
        description: null,
        is_enabled: 1,
        rollout_percentage: 100,
        target_tiers: null,
        target_user_ids: null,
        environment: 'production',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      // First call - should query database
      await service.getFlagByName('cached_flag');
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.getFlagByName('cached_flag');
      expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('createFlag', () => {
    it('should create a new feature flag', async () => {
      const mockInsertId = 1;
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Check for duplicate (no existing flag)
      mockQuery.mockResolvedValueOnce({ insertId: mockInsertId }); // INSERT
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: mockInsertId,
          flag_key: 'new_flag',
          name: 'New Flag',
          description: 'Test',
          is_enabled: 0,
          rollout_percentage: 50,
          target_tiers: null,
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      }); // SELECT

      const flag = await service.createFlag({
        flag_key: 'new_flag',
        name: 'New Flag',
        description: 'Test',
        rollout_percentage: 50
      });

      expect(flag.flag_key).toBe('new_flag');
      expect(flag.rollout_percentage).toBe(50);
    });

    it('should throw error for duplicate flag key', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'existing_flag',
          name: 'Existing',
          description: null,
          is_enabled: 1,
          rollout_percentage: 100,
          target_tiers: null,
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      await expect(service.createFlag({
        flag_key: 'existing_flag',
        name: 'Duplicate'
      })).rejects.toThrow(DuplicateFlagError);
    });

    it('should throw error for invalid rollout percentage', async () => {
      await expect(service.createFlag({
        flag_key: 'invalid_flag',
        name: 'Invalid',
        rollout_percentage: 150
      })).rejects.toThrow(InvalidRolloutPercentageError);

      await expect(service.createFlag({
        flag_key: 'invalid_flag',
        name: 'Invalid',
        rollout_percentage: -10
      })).rejects.toThrow(InvalidRolloutPercentageError);
    });
  });

  describe('updateFlag', () => {
    it('should update existing flag', async () => {
      // Mock getFlagById calls (first call)
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'test_flag',
          name: 'Old Name',
          description: null,
          is_enabled: 0,
          rollout_percentage: 50,
          target_tiers: null,
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      mockQuery.mockResolvedValueOnce({ affectedRows: 1, rows: [] }); // UPDATE

      // Mock getFlagById calls (second call)
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'test_flag',
          name: 'New Name',
          description: null,
          is_enabled: 1,
          rollout_percentage: 100,
          target_tiers: null,
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const updated = await service.updateFlag(1, {
        name: 'New Name',
        is_enabled: true,
        rollout_percentage: 100
      });

      expect(updated.name).toBe('New Name');
      expect(updated.is_enabled).toBe(true);
    });

    it('should throw error when updating non-existent flag', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.updateFlag(999, { name: 'Test' })).rejects.toThrow(FlagNotFoundError);
    });
  });

  describe('deleteFlag', () => {
    it('should delete existing flag', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'test_flag',
          name: 'Test',
          description: null,
          is_enabled: 1,
          rollout_percentage: 100,
          target_tiers: null,
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

      await service.deleteFlag(1);

      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM feature_flags WHERE id = ?', [1]);
    });

    it('should throw error when deleting non-existent flag', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.deleteFlag(999)).rejects.toThrow(FlagNotFoundError);
    });
  });

  // ==========================================================================
  // FLAG EVALUATION
  // ==========================================================================

  describe('isFeatureEnabled', () => {
    it('should return false for unknown flag', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const enabled = await service.isFeatureEnabled('unknown_flag');

      expect(enabled).toBe(false);
    });

    it('should return false when flag is globally disabled', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'disabled_flag',
          name: 'Disabled',
          description: null,
          is_enabled: 0,
          rollout_percentage: 100,
          target_tiers: null,
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const enabled = await service.isFeatureEnabled('disabled_flag');

      expect(enabled).toBe(false);
    });

    it('should return true for enabled flag with 100% rollout', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'enabled_flag',
          name: 'Enabled',
          description: null,
          is_enabled: 1,
          rollout_percentage: 100,
          target_tiers: null,
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const enabled = await service.isFeatureEnabled('enabled_flag');

      expect(enabled).toBe(true);
    });

    it('should respect tier targeting', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'premium_flag',
          name: 'Premium Feature',
          description: null,
          is_enabled: 1,
          rollout_percentage: 100,
          target_tiers: '["premium"]',
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      // Should enable for premium tier
      const enabledPremium = await service.isFeatureEnabled('premium_flag', { tier: 'premium' });
      expect(enabledPremium).toBe(true);

      // Clear cache for next call
      service.clearCache();

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'premium_flag',
          name: 'Premium Feature',
          description: null,
          is_enabled: 1,
          rollout_percentage: 100,
          target_tiers: '["premium"]',
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      // Should disable for essentials tier
      const enabledEssentials = await service.isFeatureEnabled('premium_flag', { tier: 'essentials' });
      expect(enabledEssentials).toBe(false);
    });

    it('should respect user targeting', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'beta_flag',
          name: 'Beta Feature',
          description: null,
          is_enabled: 1,
          rollout_percentage: 100,
          target_tiers: null,
          target_user_ids: '[1, 2, 3]',
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      // Should enable for user 1
      const enabledUser1 = await service.isFeatureEnabled('beta_flag', { userId: 1 });
      expect(enabledUser1).toBe(true);

      service.clearCache();

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'beta_flag',
          name: 'Beta Feature',
          description: null,
          is_enabled: 1,
          rollout_percentage: 100,
          target_tiers: null,
          target_user_ids: '[1, 2, 3]',
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      // Should disable for user 999
      const enabledUser999 = await service.isFeatureEnabled('beta_flag', { userId: 999 });
      expect(enabledUser999).toBe(false);
    });

    it('should handle A/B testing with rollout percentage', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          flag_key: 'ab_test_flag',
          name: 'A/B Test',
          description: null,
          is_enabled: 1,
          rollout_percentage: 50,
          target_tiers: null,
          target_user_ids: null,
          environment: 'production',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      // With 50% rollout, some users should be enabled, others disabled
      // This is deterministic based on userId
      const result = await service.isFeatureEnabled('ab_test_flag', { userId: 123 });
      expect(typeof result).toBe('boolean');
    });
  });

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  describe('clearCache', () => {
    it('should clear cached flags', async () => {
      const mockRow = {
        id: 1,
        flag_key: 'cached_flag',
        name: 'Cached',
        description: null,
        is_enabled: 1,
        rollout_percentage: 100,
        target_tiers: null,
        target_user_ids: null,
        environment: 'production',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockRow] });

      // First call - caches result
      await service.getFlagByName('cached_flag');
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache();

      // Next call - should query database again
      await service.getFlagByName('cached_flag');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });
});
