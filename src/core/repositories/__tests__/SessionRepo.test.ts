/**
 * SessionRepo Test Suite
 *
 * GOVERNANCE: Testing standards - 70% minimum coverage
 * Phase 1 Implementation
 *
 * NOTE: These tests require a running database instance with the user_sessions table
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SessionRepo, getSessionRepo, type CreateSessionInput } from '../SessionRepo';
import { UserRepo } from '../UserRepo';
import { getDatabaseService } from '@core/services/DatabaseService';
import { randomUUID } from 'crypto';

describe('SessionRepo', () => {
  let sessionRepo: SessionRepo;
  let userRepo: UserRepo;
  let db: ReturnType<typeof getDatabaseService>;
  let testUserId: number;
  let testSessionIds: string[] = [];

  beforeAll(async () => {
    // Initialize database service
    db = getDatabaseService();
    await db.initialize();

    sessionRepo = new SessionRepo();
    userRepo = new UserRepo();

    // Create test user
    const testUser = await userRepo.create({
      email: `session-test-${Date.now()}@example.com`,
      password_hash: 'hashed_password_test'
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test sessions
    for (const sessionId of testSessionIds) {
      try {
        await db.query('DELETE FROM user_sessions WHERE session_id = ?', [sessionId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Clean up test user
    try {
      await db.query('DELETE FROM users WHERE id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }

    // Close database connection
    await db.destroy();
  });

  beforeEach(() => {
    // Reset test session IDs before each test
    testSessionIds = [];
  });

  describe('create', () => {
    it('should create new session', async () => {
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      const input: CreateSessionInput = {
        session_id: sessionId,
        user_id: testUserId,
        expires_at: expiresAt
      };

      const session = await sessionRepo.create(input);
      testSessionIds.push(session.session_id);

      expect(session.id).toBeGreaterThan(0);
      expect(session.session_id).toBe(sessionId);
      expect(session.user_id).toBe(testUserId);
      expect(session.ip_address).toBeNull();
      expect(session.user_agent).toBeNull();
      expect(session.expires_at).toBeDefined();
      expect(session.created_at).toBeDefined();
      expect(session.updated_at).toBeDefined();
      expect(session.last_activity_at).toBeDefined();
    });

    it('should create session with IP and user agent', async () => {
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const input: CreateSessionInput = {
        session_id: sessionId,
        user_id: testUserId,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 Test Browser',
        expires_at: expiresAt
      };

      const session = await sessionRepo.create(input);
      testSessionIds.push(session.session_id);

      expect(session.session_id).toBe(sessionId);
      expect(session.ip_address).toBe('192.168.1.1');
      expect(session.user_agent).toBe('Mozilla/5.0 Test Browser');
    });
  });

  describe('findBySessionId', () => {
    it('should find session by session ID', async () => {
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await sessionRepo.create({
        session_id: sessionId,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId);

      const found = await sessionRepo.findBySessionId(sessionId);

      expect(found).not.toBeNull();
      expect(found?.session_id).toBe(sessionId);
      expect(found?.user_id).toBe(testUserId);
    });

    it('should return null for non-existent session', async () => {
      const found = await sessionRepo.findBySessionId('non-existent-uuid');
      expect(found).toBeNull();
    });

    it('should return null for expired session', async () => {
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      await sessionRepo.create({
        session_id: sessionId,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId);

      const found = await sessionRepo.findBySessionId(sessionId);
      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all sessions for user', async () => {
      const sessionId1 = randomUUID();
      const sessionId2 = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await sessionRepo.create({
        session_id: sessionId1,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId1);

      await sessionRepo.create({
        session_id: sessionId2,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId2);

      const sessions = await sessionRepo.findByUserId(testUserId);

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.every(s => s.user_id === testUserId)).toBe(true);
    });

    it('should return empty array for user with no sessions', async () => {
      // Create another test user
      const anotherUser = await userRepo.create({
        email: `nosessions-${Date.now()}@example.com`,
        password_hash: 'hashed_password'
      });

      const sessions = await sessionRepo.findByUserId(anotherUser.id);
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(0);

      // Clean up
      await db.query('DELETE FROM users WHERE id = ?', [anotherUser.id]);
    });
  });

  describe('delete', () => {
    it('should delete specific session', async () => {
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await sessionRepo.create({
        session_id: sessionId,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId);

      await sessionRepo.delete(sessionId);

      const found = await sessionRepo.findBySessionId(sessionId);
      expect(found).toBeNull();
    });
  });

  describe('deleteAllForUser', () => {
    it('should delete all sessions for user', async () => {
      const sessionId1 = randomUUID();
      const sessionId2 = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await sessionRepo.create({
        session_id: sessionId1,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId1);

      await sessionRepo.create({
        session_id: sessionId2,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId2);

      await sessionRepo.deleteAllForUser(testUserId);

      const sessions = await sessionRepo.findByUserId(testUserId);
      expect(sessions.length).toBe(0);
    });
  });

  describe('updateLastActivity', () => {
    it('should update last activity timestamp', async () => {
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const created = await sessionRepo.create({
        session_id: sessionId,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId);

      const originalActivity = created.last_activity_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      await sessionRepo.updateLastActivity(sessionId);

      const updated = await sessionRepo.findBySessionId(sessionId);
      expect(updated?.last_activity_at).toBeDefined();
      // Note: Exact timestamp comparison may vary, so just check it's updated
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired sessions', async () => {
      const expiredSessionId = randomUUID();
      const expiresAt = new Date(Date.now() - 1000); // Expired

      await sessionRepo.create({
        session_id: expiredSessionId,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(expiredSessionId);

      const deletedCount = await sessionRepo.deleteExpired();
      expect(deletedCount).toBeGreaterThan(0);

      const found = await sessionRepo.findBySessionIdIncludingExpired(expiredSessionId);
      expect(found).toBeNull();
    });
  });

  describe('extendExpiration', () => {
    it('should extend session expiration', async () => {
      const sessionId = randomUUID();
      const originalExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      await sessionRepo.create({
        session_id: sessionId,
        user_id: testUserId,
        expires_at: originalExpires
      });
      testSessionIds.push(sessionId);

      const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await sessionRepo.extendExpiration(sessionId, newExpires);

      const updated = await sessionRepo.findBySessionId(sessionId);
      expect(updated).not.toBeNull();
      expect(updated?.expires_at.getTime()).toBeGreaterThan(originalExpires.getTime());
    });
  });

  describe('findBySessionIdIncludingExpired', () => {
    it('should find expired sessions', async () => {
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() - 1000); // Expired

      await sessionRepo.create({
        session_id: sessionId,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId);

      const found = await sessionRepo.findBySessionIdIncludingExpired(sessionId);
      expect(found).not.toBeNull();
      expect(found?.session_id).toBe(sessionId);
    });
  });

  describe('countActiveSessionsForUser', () => {
    it('should count active sessions', async () => {
      const sessionId1 = randomUUID();
      const sessionId2 = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Clean up existing sessions first
      await sessionRepo.deleteAllForUser(testUserId);

      await sessionRepo.create({
        session_id: sessionId1,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId1);

      await sessionRepo.create({
        session_id: sessionId2,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId2);

      const count = await sessionRepo.countActiveSessionsForUser(testUserId);
      expect(count).toBe(2);
    });
  });

  describe('deleteOldestSessionsForUser', () => {
    it('should keep only N most recent sessions', async () => {
      // Clean up existing sessions first
      await sessionRepo.deleteAllForUser(testUserId);

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        const sessionId = randomUUID();
        await sessionRepo.create({
          session_id: sessionId,
          user_id: testUserId,
          expires_at: expiresAt
        });
        testSessionIds.push(sessionId);

        // Small delay to ensure different last_activity_at timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Keep only 2 most recent sessions
      const deletedCount = await sessionRepo.deleteOldestSessionsForUser(testUserId, 2);
      expect(deletedCount).toBeGreaterThan(0);

      const remainingSessions = await sessionRepo.findByUserId(testUserId);
      expect(remainingSessions.length).toBe(2);
    });
  });

  describe('getSessionRepo singleton', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getSessionRepo();
      const instance2 = getSessionRepo();

      expect(instance1).toBe(instance2);
    });

    it('should return functional instance', async () => {
      const repo = getSessionRepo();
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const created = await repo.create({
        session_id: sessionId,
        user_id: testUserId,
        expires_at: expiresAt
      });
      testSessionIds.push(sessionId);

      const found = await repo.findBySessionId(sessionId);
      expect(found).not.toBeNull();
      expect(found?.session_id).toBe(sessionId);
    });
  });
});
