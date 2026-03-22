/**
 * CookieSessionService - httpOnly cookie-based session management
 *
 * GOVERNANCE: httpOnly cookie-based session management
 * GOVERNANCE: MANDATORY per CLAUDE.md security standards
 * GOVERNANCE: NO localStorage for auth tokens
 * GOVERNANCE: Service Architecture v2.0 compliance
 * Phase 1 Implementation
 */

import { SessionRepo, getSessionRepo, type Session } from '@core/repositories/SessionRepo';
import { randomUUID } from 'crypto';

/**
 * Session configuration interface
 */
export interface SessionConfig {
  cookieName: string;
  ttlMinutes: number;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path: string;
}

/**
 * Session creation result
 */
export interface SessionCreationResult {
  sessionId: string;
  expiresAt: Date;
}

/**
 * Cookie session service class
 * Manages httpOnly cookie-based sessions with MariaDB storage
 *
 * GOVERNANCE: Uses SessionRepo for all database operations
 * GOVERNANCE: Follows httpOnly cookie security best practices
 */
export class CookieSessionService {
  private sessionRepo: SessionRepo;
  private config: SessionConfig;

  constructor() {
    this.sessionRepo = getSessionRepo();

    // GOVERNANCE: Load from environment variables
    this.config = {
      cookieName: process.env.AUTH_COOKIE_NAME || 'bnk_session',
      ttlMinutes: parseInt(process.env.AUTH_SESSION_TTL_MIN || '1440', 10), // 24 hours default
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: process.env.AUTH_COOKIE_DOMAIN,
      path: '/'
    };
  }

  /**
   * Create new session for user
   * GOVERNANCE: Generate cryptographically secure session ID
   * GOVERNANCE: Set httpOnly cookie in response
   *
   * @param userId - User ID to create session for
   * @param ipAddress - Optional IP address of the request
   * @param userAgent - Optional user agent string
   * @returns Promise resolving to session creation result
   */
  async createSession(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionCreationResult> {
    // Generate secure session ID using crypto.randomUUID()
    const sessionId = randomUUID();

    // Calculate expiration timestamp
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.config.ttlMinutes);

    // Create session in database
    await this.sessionRepo.create({
      session_id: sessionId,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt
    });

    return { sessionId, expiresAt };
  }

  /**
   * Validate session and return session data
   * GOVERNANCE: Return null if invalid or expired
   * GOVERNANCE: Update last activity on each validation
   *
   * @param sessionId - Session ID to validate
   * @returns Promise resolving to Session or null
   */
  async validateSession(sessionId: string): Promise<Session | null> {
    if (!sessionId || typeof sessionId !== 'string') {
      return null;
    }

    // Find session in database (automatically excludes expired sessions)
    const session = await this.sessionRepo.findBySessionId(sessionId);

    if (!session) {
      return null;
    }

    // Double-check expiration (redundant with DB query but explicit)
    if (session.expires_at < new Date()) {
      // Delete expired session
      await this.sessionRepo.delete(sessionId);
      return null;
    }

    // Update last activity timestamp
    await this.sessionRepo.updateLastActivity(sessionId);

    return session;
  }

  /**
   * Destroy session (logout)
   * GOVERNANCE: Delete from database and clear cookie
   *
   * @param sessionId - Session ID to destroy
   * @returns Promise resolving when complete
   */
  async destroySession(sessionId: string): Promise<void> {
    if (!sessionId || typeof sessionId !== 'string') {
      return;
    }

    await this.sessionRepo.delete(sessionId);
  }

  /**
   * Destroy all sessions for a user (logout all devices)
   * GOVERNANCE: Security feature for compromised accounts
   *
   * @param userId - User ID to destroy all sessions for
   * @returns Promise resolving when complete
   */
  async destroyAllUserSessions(userId: number): Promise<void> {
    await this.sessionRepo.deleteAllForUser(userId);
  }

  /**
   * Refresh session (extend expiration)
   * GOVERNANCE: Called on authenticated requests to keep session alive
   *
   * @param sessionId - Session ID to refresh
   * @returns Promise resolving to new expiration date
   */
  async refreshSession(sessionId: string): Promise<Date> {
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + this.config.ttlMinutes);

    await this.sessionRepo.extendExpiration(sessionId, newExpiresAt);

    return newExpiresAt;
  }

  /**
   * Generate Set-Cookie header value
   * GOVERNANCE: httpOnly, secure, sameSite=strict
   *
   * @param sessionId - Session ID to set in cookie
   * @param expiresAt - Expiration timestamp
   * @returns Cookie header string
   */
  generateCookieHeader(sessionId: string, expiresAt: Date): string {
    const parts: string[] = [
      `${this.config.cookieName}=${sessionId}`,
      `Expires=${expiresAt.toUTCString()}`,
      `Path=${this.config.path}`,
      'HttpOnly',
      `SameSite=${this.config.sameSite}`
    ];

    // Add Secure flag in production
    if (this.config.secure) {
      parts.push('Secure');
    }

    // Add Domain if configured
    if (this.config.domain) {
      parts.push(`Domain=${this.config.domain}`);
    }

    return parts.join('; ');
  }

  /**
   * Generate Clear-Cookie header value (logout)
   * Used to clear the session cookie from client
   *
   * @returns Cookie header string that clears the cookie
   */
  generateClearCookieHeader(): string {
    const parts: string[] = [
      `${this.config.cookieName}=`,
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      `Path=${this.config.path}`,
      'HttpOnly',
      `SameSite=${this.config.sameSite}`
    ];

    // Add Secure flag in production
    if (this.config.secure) {
      parts.push('Secure');
    }

    // Add Domain if configured
    if (this.config.domain) {
      parts.push(`Domain=${this.config.domain}`);
    }

    return parts.join('; ');
  }

  /**
   * Extract session ID from Cookie header
   * GOVERNANCE: Parse Cookie header string
   *
   * @param cookieHeader - Cookie header string from request
   * @returns Session ID or null if not found
   */
  extractSessionIdFromCookie(cookieHeader: string | null | undefined): string | null {
    if (!cookieHeader) {
      return null;
    }

    // Parse cookies from header
    const cookies = cookieHeader.split(';').map(c => c.trim());

    // Find our session cookie
    const sessionCookie = cookies.find(c => c.startsWith(`${this.config.cookieName}=`));

    if (!sessionCookie) {
      return null;
    }

    // Extract session ID value
    const sessionId = sessionCookie.split('=')[1];

    return sessionId || null;
  }

  /**
   * Cleanup expired sessions (run periodically)
   * GOVERNANCE: Maintenance task to remove expired sessions
   *
   * @returns Promise resolving to number of sessions deleted
   */
  async cleanupExpiredSessions(): Promise<number> {
    return await this.sessionRepo.deleteExpired();
  }

  /**
   * Get session configuration
   * Useful for debugging and testing
   *
   * @returns Current session configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Count active sessions for a user
   * Useful for session limits
   *
   * @param userId - User ID to count sessions for
   * @returns Promise resolving to count of active sessions
   */
  async countUserSessions(userId: number): Promise<number> {
    return await this.sessionRepo.countActiveSessionsForUser(userId);
  }

  /**
   * Limit concurrent sessions for a user
   * Keeps only N most recent sessions
   *
   * @param userId - User ID to limit sessions for
   * @param maxSessions - Maximum number of sessions to keep
   * @returns Promise resolving to number of sessions deleted
   */
  async limitUserSessions(userId: number, maxSessions: number): Promise<number> {
    return await this.sessionRepo.deleteOldestSessionsForUser(userId, maxSessions);
  }

  /**
   * Get all active sessions for a user
   * Useful for session management UI
   *
   * @param userId - User ID to get sessions for
   * @returns Promise resolving to array of sessions
   */
  async getUserSessions(userId: number): Promise<Session[]> {
    return await this.sessionRepo.findByUserId(userId);
  }
}

/**
 * Singleton instance for application-wide use
 * GOVERNANCE: Singleton pattern for service reuse
 */
let cookieSessionServiceInstance: CookieSessionService | null = null;

/**
 * Get CookieSessionService singleton instance
 *
 * @returns Shared CookieSessionService instance
 */
export function getCookieSessionService(): CookieSessionService {
  if (!cookieSessionServiceInstance) {
    cookieSessionServiceInstance = new CookieSessionService();
  }
  return cookieSessionServiceInstance;
}

/**
 * Default export for convenience
 */
export default CookieSessionService;
