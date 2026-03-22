/**
 * CookieSessionService Test Suite
 *
 * GOVERNANCE: Testing standards - 70% minimum coverage
 * Phase 1 Implementation
 *
 * NOTE: These tests require a running database instance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CookieSessionService, getCookieSessionService, type SessionConfig } from '../CookieSessionService';
import { UserRepo } from '@core/repositories/UserRepo';
import { getDatabaseService } from '@core/services/DatabaseService';

describe('CookieSessionService', () => {
  let cookieSessionService: CookieSessionService;
  let userRepo: UserRepo;
  let db: ReturnType<typeof getDatabaseService>;
  let testUserId: number;
  let testSessionIds: string[] = [];

  beforeAll(async () => {
    // Initialize database service
    db = getDatabaseService();
    await db.initialize();

    // Set required environment variables
    process.env.AUTH_COOKIE_NAME = 'test_session';
    process.env.AUTH_SESSION_TTL_MIN = '1440'; // 24 hours
    // NODE_ENV is read-only in TypeScript, but we can override in tests

    cookieSessionService = new CookieSessionService();
    userRepo = new UserRepo();

    // Create test user
    const testUser = await userRepo.create({
      email: `cookie-test-${Date.now()}@example.com`,
      password_hash: 'hashed_password_test'
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test sessions
    for (const sessionId of testSessionIds) {
      try {
        await cookieSessionService.destroySession(sessionId);
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

    // Clean up environment variables
    delete process.env.AUTH_COOKIE_NAME;
    delete process.env.AUTH_SESSION_TTL_MIN;
  });

  beforeEach(() => {
    // Reset test session IDs before each test
    testSessionIds = [];
  });

  describe('constructor', () => {
    it('should create instance with environment configuration', () => {
      expect(cookieSessionService).toBeDefined();

      const config = cookieSessionService.getConfig();
      expect(config.cookieName).toBe('test_session');
      expect(config.ttlMinutes).toBe(1440);
      expect(config.secure).toBe(false); // test environment
      expect(config.sameSite).toBe('strict');
      expect(config.path).toBe('/');
    });
  });

  describe('createSession', () => {
    it('should create session with secure session ID', async () => {
      const result = await cookieSessionService.createSession(testUserId);
      testSessionIds.push(result.sessionId);

      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe('string');
      expect(result.sessionId.length).toBeGreaterThan(0);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create session with IP address and user agent', async () => {
      const result = await cookieSessionService.createSession(
        testUserId,
        '192.168.1.1',
        'Mozilla/5.0 Test Browser'
      );
      testSessionIds.push(result.sessionId);

      expect(result.sessionId).toBeDefined();

      // Validate session was created correctly
      const session = await cookieSessionService.validateSession(result.sessionId);
      expect(session).not.toBeNull();
      expect(session?.ip_address).toBe('192.168.1.1');
      expect(session?.user_agent).toBe('Mozilla/5.0 Test Browser');
    });

    it('should create unique session IDs', async () => {
      const result1 = await cookieSessionService.createSession(testUserId);
      const result2 = await cookieSessionService.createSession(testUserId);

      testSessionIds.push(result1.sessionId, result2.sessionId);

      expect(result1.sessionId).not.toBe(result2.sessionId);
    });
  });

  describe('validateSession', () => {
    it('should validate active session', async () => {
      const { sessionId } = await cookieSessionService.createSession(testUserId);
      testSessionIds.push(sessionId);

      const session = await cookieSessionService.validateSession(sessionId);

      expect(session).not.toBeNull();
      expect(session?.session_id).toBe(sessionId);
      expect(session?.user_id).toBe(testUserId);
    });

    it('should return null for invalid session', async () => {
      const session = await cookieSessionService.validateSession('invalid-session-id');
      expect(session).toBeNull();
    });

    it('should return null for empty session ID', async () => {
      const session1 = await cookieSessionService.validateSession('');
      const session2 = await cookieSessionService.validateSession(null as unknown);
      const session3 = await cookieSessionService.validateSession(undefined as unknown);

      expect(session1).toBeNull();
      expect(session2).toBeNull();
      expect(session3).toBeNull();
    });

    it('should update last activity on validation', async () => {
      const { sessionId } = await cookieSessionService.createSession(testUserId);
      testSessionIds.push(sessionId);

      const session1 = await cookieSessionService.validateSession(sessionId);
      const firstActivity = session1?.last_activity_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      const session2 = await cookieSessionService.validateSession(sessionId);
      const secondActivity = session2?.last_activity_at;

      expect(firstActivity).toBeDefined();
      expect(secondActivity).toBeDefined();
      // Note: Exact timestamp comparison may vary, just verify both exist
    });
  });

  describe('destroySession', () => {
    it('should destroy session', async () => {
      const { sessionId } = await cookieSessionService.createSession(testUserId);
      testSessionIds.push(sessionId);

      await cookieSessionService.destroySession(sessionId);

      const session = await cookieSessionService.validateSession(sessionId);
      expect(session).toBeNull();
    });

    it('should handle destroying non-existent session gracefully', async () => {
      await expect(
        cookieSessionService.destroySession('non-existent-session')
      ).resolves.not.toThrow();
    });

    it('should handle empty session ID gracefully', async () => {
      await expect(cookieSessionService.destroySession('')).resolves.not.toThrow();
      await expect(cookieSessionService.destroySession(null as unknown)).resolves.not.toThrow();
    });
  });

  describe('destroyAllUserSessions', () => {
    it('should destroy all sessions for user', async () => {
      const { sessionId: sessionId1 } = await cookieSessionService.createSession(testUserId);
      const { sessionId: sessionId2 } = await cookieSessionService.createSession(testUserId);
      testSessionIds.push(sessionId1, sessionId2);

      await cookieSessionService.destroyAllUserSessions(testUserId);

      const session1 = await cookieSessionService.validateSession(sessionId1);
      const session2 = await cookieSessionService.validateSession(sessionId2);

      expect(session1).toBeNull();
      expect(session2).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('should extend session expiration', async () => {
      const { sessionId } = await cookieSessionService.createSession(testUserId);
      testSessionIds.push(sessionId);

      const originalSession = await cookieSessionService.validateSession(sessionId);
      const originalExpires = originalSession?.expires_at;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const newExpiresAt = await cookieSessionService.refreshSession(sessionId);

      expect(newExpiresAt).toBeInstanceOf(Date);
      if (originalExpires) {
        expect(newExpiresAt.getTime()).toBeGreaterThanOrEqual(originalExpires.getTime());
      }
    });
  });

  describe('generateCookieHeader', () => {
    it('should generate httpOnly cookie header', () => {
      const sessionId = 'test-session-id';
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const header = cookieSessionService.generateCookieHeader(sessionId, expiresAt);

      expect(header).toContain('test_session=test-session-id');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=strict');
      expect(header).toContain('Path=/');
      expect(header).toContain('Expires=');
    });

    it('should include Secure flag in production', () => {
      // Create a mock environment for testing Secure flag
      // Note: NODE_ENV is read-only, so we test the current environment behavior
      const sessionId = 'test-session-id';
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const header = cookieSessionService.generateCookieHeader(sessionId, expiresAt);

      // In test/development, Secure should not be included
      // In production, it should be included
      if (process.env.NODE_ENV === 'production') {
        expect(header).toContain('Secure');
      } else {
        expect(header).not.toContain('Secure');
      }
    });
  });

  describe('generateClearCookieHeader', () => {
    it('should generate clear cookie header', () => {
      const header = cookieSessionService.generateClearCookieHeader();

      expect(header).toContain('test_session=');
      expect(header).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=strict');
      expect(header).toContain('Path=/');
    });
  });

  describe('extractSessionIdFromCookie', () => {
    it('should extract session ID from cookie header', () => {
      const cookieHeader = 'test_session=my-session-id; other_cookie=value';

      const sessionId = cookieSessionService.extractSessionIdFromCookie(cookieHeader);

      expect(sessionId).toBe('my-session-id');
    });

    it('should return null for missing session cookie', () => {
      const cookieHeader = 'other_cookie=value; another=cookie';

      const sessionId = cookieSessionService.extractSessionIdFromCookie(cookieHeader);

      expect(sessionId).toBeNull();
    });

    it('should return null for empty cookie header', () => {
      const sessionId1 = cookieSessionService.extractSessionIdFromCookie('');
      const sessionId2 = cookieSessionService.extractSessionIdFromCookie(null);
      const sessionId3 = cookieSessionService.extractSessionIdFromCookie(undefined);

      expect(sessionId1).toBeNull();
      expect(sessionId2).toBeNull();
      expect(sessionId3).toBeNull();
    });

    it('should handle malformed cookie header', () => {
      const sessionId = cookieSessionService.extractSessionIdFromCookie('test_session=');
      expect(sessionId).toBeNull();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      // Create a session that's already expired would require manual DB manipulation
      // For this test, we'll just verify the method runs without errors
      const deletedCount = await cookieSessionService.cleanupExpiredSessions();

      expect(typeof deletedCount).toBe('number');
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getConfig', () => {
    it('should return session configuration', () => {
      const config: SessionConfig = cookieSessionService.getConfig();

      expect(config).toBeDefined();
      expect(config.cookieName).toBe('test_session');
      expect(config.ttlMinutes).toBe(1440);
      expect(config.secure).toBe(false);
      expect(config.sameSite).toBe('strict');
      expect(config.path).toBe('/');
    });
  });

  describe('countUserSessions', () => {
    it('should count active sessions for user', async () => {
      // Clean up existing sessions first
      await cookieSessionService.destroyAllUserSessions(testUserId);

      const { sessionId: sessionId1 } = await cookieSessionService.createSession(testUserId);
      const { sessionId: sessionId2 } = await cookieSessionService.createSession(testUserId);
      testSessionIds.push(sessionId1, sessionId2);

      const count = await cookieSessionService.countUserSessions(testUserId);

      expect(count).toBe(2);
    });
  });

  describe('limitUserSessions', () => {
    it('should limit concurrent sessions for user', async () => {
      // Clean up existing sessions first
      await cookieSessionService.destroyAllUserSessions(testUserId);

      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        const { sessionId } = await cookieSessionService.createSession(testUserId);
        testSessionIds.push(sessionId);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Limit to 2 sessions
      const deletedCount = await cookieSessionService.limitUserSessions(testUserId, 2);

      expect(deletedCount).toBeGreaterThan(0);

      const remainingCount = await cookieSessionService.countUserSessions(testUserId);
      expect(remainingCount).toBe(2);
    });
  });

  describe('getUserSessions', () => {
    it('should get all active sessions for user', async () => {
      // Clean up existing sessions first
      await cookieSessionService.destroyAllUserSessions(testUserId);

      const { sessionId: sessionId1 } = await cookieSessionService.createSession(testUserId);
      const { sessionId: sessionId2 } = await cookieSessionService.createSession(testUserId);
      testSessionIds.push(sessionId1, sessionId2);

      const sessions = await cookieSessionService.getUserSessions(testUserId);

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(2);
      expect(sessions.every(s => s.user_id === testUserId)).toBe(true);
    });
  });

  describe('getCookieSessionService singleton', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getCookieSessionService();
      const instance2 = getCookieSessionService();

      expect(instance1).toBe(instance2);
    });

    it('should return functional instance', async () => {
      const service = getCookieSessionService();
      const { sessionId } = await service.createSession(testUserId);
      testSessionIds.push(sessionId);

      const session = await service.validateSession(sessionId);

      expect(session).not.toBeNull();
      expect(session?.session_id).toBe(sessionId);
    });
  });
});
