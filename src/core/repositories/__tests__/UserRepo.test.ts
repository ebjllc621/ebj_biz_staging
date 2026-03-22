/**
 * UserRepo Test Suite
 *
 * GOVERNANCE: Testing standards - 70% minimum coverage
 * Phase 1 Implementation
 *
 * NOTE: These tests require a running database instance with the users table
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { UserRepo, getUserRepo, type CreateUserInput, type UserFilters } from '../UserRepo';
import { getDatabaseService } from '@core/services/DatabaseService';

describe('UserRepo', () => {
  let userRepo: UserRepo;
  let db: ReturnType<typeof getDatabaseService>;
  let testUserIds: number[] = [];

  beforeAll(async () => {
    // Initialize database service
    db = getDatabaseService();
    await db.initialize();

    userRepo = new UserRepo();
  });

  afterAll(async () => {
    // Clean up test users
    for (const id of testUserIds) {
      try {
        await db.query('DELETE FROM users WHERE id = ?', [id]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Close database connection
    await db.destroy();
  });

  beforeEach(() => {
    // Reset test user IDs before each test
    testUserIds = [];
  });

  describe('create', () => {
    it('should create user with default values', async () => {
      const input: CreateUserInput = {
        email: `test-${Date.now()}@example.com`,
        password_hash: 'hashed_password_123'
      };

      const user = await userRepo.create(input);
      testUserIds.push(user.id);

      expect(user.id).toBeGreaterThan(0);
      expect(user.email).toBe(input.email);
      expect(user.password_hash).toBe(input.password_hash);
      expect(user.first_name).toBeNull();
      expect(user.last_name).toBeNull();
      expect(user.role).toBe('general');
      expect(user.tier).toBe('general');
      expect(user.email_verified).toBe(false);
      expect(user.is_active).toBe(true);
      expect(user.is_mock).toBe(false);
      expect(user.last_login).toBeNull();
      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
    });

    it('should create user with custom values', async () => {
      const input: CreateUserInput = {
        email: `admin-${Date.now()}@example.com`,
        password_hash: 'hashed_password_456',
        first_name: 'John',
        last_name: 'Doe',
        role: 'admin',
        tier: 'premium',
        is_mock: true
      };

      const user = await userRepo.create(input);
      testUserIds.push(user.id);

      expect(user.id).toBeGreaterThan(0);
      expect(user.email).toBe(input.email);
      expect(user.first_name).toBe('John');
      expect(user.last_name).toBe('Doe');
      expect(user.role).toBe('admin');
      expect(user.tier).toBe('premium');
      expect(user.is_mock).toBe(true);
    });

    it('should throw error for duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      const input1: CreateUserInput = {
        email,
        password_hash: 'hashed_password_789'
      };

      const user1 = await userRepo.create(input1);
      testUserIds.push(user1.id);

      const input2: CreateUserInput = {
        email, // Same email
        password_hash: 'hashed_password_abc'
      };

      await expect(userRepo.create(input2)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const created = await userRepo.create({
        email: `findbyid-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created.id);

      const found = await userRepo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(created.email);
    });

    it('should return null for non-existent ID', async () => {
      const found = await userRepo.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = `findbyemail-${Date.now()}@example.com`;
      const created = await userRepo.create({
        email,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created.id);

      const found = await userRepo.findByEmail(email);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(email);
    });

    it('should return null for non-existent email', async () => {
      const found = await userRepo.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const created = await userRepo.create({
        email: `update-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created.id);

      const updated = await userRepo.update(created.id, {
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'admin'
      });

      expect(updated.id).toBe(created.id);
      expect(updated.first_name).toBe('Jane');
      expect(updated.last_name).toBe('Smith');
      expect(updated.role).toBe('admin');
      expect(updated.email).toBe(created.email); // Unchanged
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        userRepo.update(999999, { first_name: 'Test' })
      ).rejects.toThrow('User not found after update');
    });

    it('should throw error when no fields to update', async () => {
      const created = await userRepo.create({
        email: `noupdate-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created.id);

      await expect(
        userRepo.update(created.id, {})
      ).rejects.toThrow('No fields to update');
    });
  });

  describe('delete', () => {
    it('should soft delete user', async () => {
      const created = await userRepo.create({
        email: `delete-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created.id);

      await userRepo.delete(created.id);

      const found = await userRepo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.is_active).toBe(false);
    });
  });

  describe('list', () => {
    it('should list users without filters', async () => {
      const created1 = await userRepo.create({
        email: `list1-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created1.id);

      const created2 = await userRepo.create({
        email: `list2-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created2.id);

      const users = await userRepo.list();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should list users with role filter', async () => {
      const created = await userRepo.create({
        email: `admin-list-${Date.now()}@example.com`,
        password_hash: 'hashed_password',
        role: 'admin'
      });
      testUserIds.push(created.id);

      const filters: UserFilters = { role: 'admin' };
      const users = await userRepo.list(filters);

      expect(Array.isArray(users)).toBe(true);
      expect(users.every(u => u.role === 'admin')).toBe(true);
    });

    it('should support pagination', async () => {
      // Create multiple users
      for (let i = 0; i < 5; i++) {
        const user = await userRepo.create({
          email: `page-${i}-${Date.now()}@example.com`,
          password_hash: 'hashed_password'
        });
        testUserIds.push(user.id);
      }

      const page1 = await userRepo.list(undefined, 2, 0);
      const page2 = await userRepo.list(undefined, 2, 2);

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);

      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0]?.id).not.toBe(page2[0]?.id);
      }
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const created = await userRepo.create({
        email: `lastlogin-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created.id);

      expect(created.last_login).toBeNull();

      await userRepo.updateLastLogin(created.id);

      const updated = await userRepo.findById(created.id);
      expect(updated?.last_login).not.toBeNull();
    });
  });

  describe('count', () => {
    it('should count users without filters', async () => {
      const created = await userRepo.create({
        email: `count-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created.id);

      const count = await userRepo.count();
      expect(count).toBeGreaterThan(0);
    });

    it('should count users with filters', async () => {
      const created = await userRepo.create({
        email: `count-premium-${Date.now()}@example.com`,
        password_hash: 'hashed_password',
        tier: 'premium'
      });
      testUserIds.push(created.id);

      const filters: UserFilters = { tier: 'premium' };
      const count = await userRepo.count(filters);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      const email = `exists-${Date.now()}@example.com`;
      const created = await userRepo.create({
        email,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created.id);

      const exists = await userRepo.emailExists(email);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await userRepo.emailExists('nonexistent@example.com');
      expect(exists).toBe(false);
    });
  });

  describe('getUserRepo singleton', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getUserRepo();
      const instance2 = getUserRepo();

      expect(instance1).toBe(instance2);
    });

    it('should return functional instance', async () => {
      const repo = getUserRepo();
      const created = await repo.create({
        email: `singleton-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });
      testUserIds.push(created.id);

      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });
  });
});
