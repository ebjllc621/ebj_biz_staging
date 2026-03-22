/**
 * SessionRepo - Session repository for database operations
 *
 * GOVERNANCE: Repository pattern with DatabaseService boundary
 * GOVERNANCE: Session management for httpOnly cookies
 * GOVERNANCE: Service Architecture v2.0 compliance
 * Phase 1 Implementation
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import type { RowDataPacket, ResultSetHeader } from '@core/types/mariadb-compat';

/**
 * Session entity interface
 * Matches database schema for user_sessions table
 */
export interface Session {
  id: number;
  session_id: string;
  user_id: number;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
}

/**
 * Input for creating a new session
 * Omits auto-generated fields
 */
export interface CreateSessionInput {
  session_id: string;
  user_id: number;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
}

/**
 * Session repository class
 * Provides data access methods for session management
 *
 * GOVERNANCE: Uses DatabaseService singleton for all database operations
 * GOVERNANCE: No direct mysql2/mariadb imports allowed
 */
export class SessionRepo {
  private db = getDatabaseService();

  /**
   * Create new session
   * GOVERNANCE: Generate session_id before calling (use crypto.randomUUID())
   *
   * @param input - Session creation data
   * @returns Promise resolving to created Session
   */
  async create(input: CreateSessionInput): Promise<Session> {
    const sql = `
      INSERT INTO user_sessions (
        session_id,
        user_id,
        ip_address,
        user_agent,
        expires_at,
        last_activity_at
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const result = await this.db.query<ResultSetHeader>(sql, [
      input.session_id,
      input.user_id,
      input.ip_address || null,
      input.user_agent || null,
      input.expires_at
    ]);

    const session = await this.findBySessionId(input.session_id);
    if (!session) {
      throw new Error('Failed to create session: Session not found after insert');
    }

    return session;
  }

  /**
   * Find session by session ID
   * GOVERNANCE: Return null if not found or expired
   *
   * @param sessionId - Session ID to find
   * @returns Promise resolving to Session or null
   */
  async findBySessionId(sessionId: string): Promise<Session | null> {
    const sql = `
      SELECT * FROM user_sessions
      WHERE session_id = ? AND expires_at > NOW()
      LIMIT 1
    `;

    const result = await this.db.query<RowDataPacket[]>(sql, [sessionId]);
    return result.rows.length > 0 ? (result.rows[0] as unknown as Session) : null;
  }

  /**
   * Find all sessions for a user
   * GOVERNANCE: Return active sessions only (not expired)
   *
   * @param userId - User ID to find sessions for
   * @returns Promise resolving to array of Sessions
   */
  async findByUserId(userId: number): Promise<Session[]> {
    const sql = `
      SELECT * FROM user_sessions
      WHERE user_id = ? AND expires_at > NOW()
      ORDER BY created_at DESC
    `;

    const result = await this.db.query<RowDataPacket[]>(sql, [userId]);
    return result.rows as unknown as Session[];
  }

  /**
   * Delete specific session (logout)
   * GOVERNANCE: Hard delete session record
   *
   * @param sessionId - Session ID to delete
   * @returns Promise resolving when complete
   */
  async delete(sessionId: string): Promise<void> {
    const sql = `
      DELETE FROM user_sessions WHERE session_id = ?
    `;

    await this.db.query(sql, [sessionId]);
  }

  /**
   * Delete all sessions for a user (logout all devices)
   * GOVERNANCE: Security feature for compromised accounts
   *
   * @param userId - User ID to delete all sessions for
   * @returns Promise resolving when complete
   */
  async deleteAllForUser(userId: number): Promise<void> {
    const sql = `
      DELETE FROM user_sessions WHERE user_id = ?
    `;

    await this.db.query(sql, [userId]);
  }

  /**
   * Update last activity timestamp
   * GOVERNANCE: Called on each authenticated request
   *
   * @param sessionId - Session ID to update
   * @returns Promise resolving when complete
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    const sql = `
      UPDATE user_sessions
      SET last_activity_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `;

    await this.db.query(sql, [sessionId]);
  }

  /**
   * Delete expired sessions (cleanup task)
   * GOVERNANCE: Run periodically (cron job or on login)
   *
   * @returns Promise resolving to number of sessions deleted
   */
  async deleteExpired(): Promise<number> {
    const sql = `
      DELETE FROM user_sessions WHERE expires_at <= NOW()
    `;

    const result = await this.db.query<ResultSetHeader>(sql);
    return result.rowCount || 0;
  }

  /**
   * Extend session expiration
   * GOVERNANCE: Called on session refresh
   *
   * @param sessionId - Session ID to extend
   * @param newExpiresAt - New expiration timestamp
   * @returns Promise resolving when complete
   */
  async extendExpiration(sessionId: string, newExpiresAt: Date): Promise<void> {
    const sql = `
      UPDATE user_sessions
      SET expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `;

    await this.db.query(sql, [newExpiresAt, sessionId]);
  }

  /**
   * Get session by ID (including expired sessions)
   * Useful for audit/debugging purposes
   *
   * @param sessionId - Session ID to find
   * @returns Promise resolving to Session or null
   */
  async findBySessionIdIncludingExpired(sessionId: string): Promise<Session | null> {
    const sql = `
      SELECT * FROM user_sessions
      WHERE session_id = ?
      LIMIT 1
    `;

    const result = await this.db.query<RowDataPacket[]>(sql, [sessionId]);
    return result.rows.length > 0 ? (result.rows[0] as unknown as Session) : null;
  }

  /**
   * Count active sessions for a user
   * Useful for limiting concurrent sessions
   *
   * @param userId - User ID to count sessions for
   * @returns Promise resolving to count of active sessions
   */
  async countActiveSessionsForUser(userId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count FROM user_sessions
      WHERE user_id = ? AND expires_at > NOW()
    `;

    const result = await this.db.query<RowDataPacket[]>(sql, [userId]);
    return (result.rows[0] as any)?.count || 0;
  }

  /**
   * Delete oldest sessions for a user (keep only N most recent)
   * Useful for enforcing session limits
   *
   * @param userId - User ID to clean up sessions for
   * @param keepCount - Number of sessions to keep
   * @returns Promise resolving to number of sessions deleted
   */
  async deleteOldestSessionsForUser(userId: number, keepCount: number): Promise<number> {
    const sql = `
      DELETE FROM user_sessions
      WHERE user_id = ? AND session_id NOT IN (
        SELECT session_id FROM (
          SELECT session_id FROM user_sessions
          WHERE user_id = ? AND expires_at > NOW()
          ORDER BY last_activity_at DESC
          LIMIT ?
        ) as kept_sessions
      )
    `;

    const result = await this.db.query<ResultSetHeader>(sql, [userId, userId, keepCount]);
    return result.rowCount || 0;
  }
}

/**
 * Singleton instance for application-wide use
 * GOVERNANCE: Singleton pattern for repository reuse
 */
let sessionRepoInstance: SessionRepo | null = null;

/**
 * Get SessionRepo singleton instance
 *
 * @returns Shared SessionRepo instance
 */
export function getSessionRepo(): SessionRepo {
  if (!sessionRepoInstance) {
    sessionRepoInstance = new SessionRepo();
  }
  return sessionRepoInstance;
}

/**
 * Default export for convenience
 */
export default SessionRepo;
