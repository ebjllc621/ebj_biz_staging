/**
 * SessionService - AUTH-P2-2E Session Rotation Core Implementation
 *
 * Implements session rotation mechanics with OSI Layer 7 security compliance:
 * - Rotate session IDs on successful login and refresh
 * - Revoke ALL sessions on password change
 * - NO PII storage (hash UA/IP as per security requirements)
 * - DatabaseService boundary compliance (no direct DB drivers)
 * - Atomic session operations with proper error handling
 * - Evidence generation for audit compliance
 *
 * Security Features:
 * - Cryptographically secure session tokens (32-byte random)
 * - SHA-256 hash storage only (never clear tokens)
 * - User agent hashing (no PII)
 * - IP coarsening (/24 IPv4, /64 IPv6, no PII)
 * - Session rotation chain tracking
 * - Atomic transaction-based operations
 *
 * Database Requirements:
 * - user_sessions table with AUTH-P2-2E schema
 * - Proper indexing for performance
 * - DatabaseService for all operations
 *
 * Governance Compliance:
 * - MUST use DatabaseService for all database operations
 * - NO direct database imports (mariadb/mysql2)
 * - Anti-synthetic enforcement (REAL functionality only)
 * - OSI Layer 7 production compliance
 */

import crypto from 'crypto';
import { DatabaseService } from '../DatabaseService';
import { BizError } from '../../errors/BizError';
import { DbConfig } from '../../types/db';
import { bigIntToNumber } from '@core/utils/bigint';

/**
 * Session data structure
 */
export interface SessionData {
  id: string;
  userId: string;
  sessionTokenHash: Buffer;
  userAgentHash?: Buffer;
  ipCoarse?: Buffer;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  rotatedFrom?: string;
}

/**
 * Context for session operations
 */
export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
  timestamp?: Date;
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  valid: boolean;
  session?: SessionData;
  reason?: 'not_found' | 'expired' | 'revoked' | 'invalid';
}

/**
 * Session rotation result
 */
export interface SessionRotationResult {
  success: boolean;
  newSessionToken?: string;
  oldSessionRevoked: boolean;
  rotationId?: string;
  error?: string;
}

/**
 * SessionService configuration
 */
export interface SessionServiceConfig {
  sessionExpiryHours?: number;
  enableRotationChaining?: boolean;
  // DatabaseService config inherited from parent (can accept DatabaseService or DbConfig)
  database: DbConfig | import('../DatabaseService').DatabaseService;
  // Optional service metadata
  name?: string;
  version?: string;
}

/**
 * SessionService Implementation - AUTH-P2-2E Session Rotation Core
 *
 * Provides secure session management with rotation mechanics,
 * OSI Layer 7 compliance, and comprehensive audit capabilities.
 */
export class SessionService extends DatabaseService {
  protected table = "user_sessions";

  private readonly sessionExpiryHours: number;
  private readonly enableRotationChaining: boolean;

  constructor(config: SessionServiceConfig) {
    // Extract DbConfig from DatabaseService or use directly
    const dbConfig = 'host' in config.database
      ? config.database
      : config.database as any; // DatabaseService case - will be handled by parent

    super({
      database: dbConfig as DbConfig,
      name: 'SessionService',
      version: '2.0.0-AUTH-P2-2E'
    });

    this.sessionExpiryHours = config.sessionExpiryHours ?? 24;
    this.enableRotationChaining = config.enableRotationChaining ?? true;

    this.logger.info('SessionService initialized', {
      operation: 'constructor',
      metadata: {
        sessionExpiryHours: this.sessionExpiryHours,
        enableRotationChaining: this.enableRotationChaining,
        version: '2.0.0-AUTH-P2-2E'
      }
    });
  }

  /**
   * Initialize session service
   */
  async initialize(): Promise<void> {
    return this.executeOperation('initialize', async () => {
      // Initialize parent DatabaseService
      await super.initialize();

      // Verify user_sessions table exists with proper schema
      await this.validateSessionTable();

      this.logger.info('SessionService initialized successfully', {
        operation: 'initialize',
        metadata: { version: '2.0.0-AUTH-P2-2E' }
      });
    });
  }

  /**
   * Rotate session on login - creates new session with rotated_from linking and revokes old
   * @param userId - User ID for new session
   * @param prevSessionId - Previous session ID to revoke (optional)
   * @param context - Session context
   * @returns New session token
   */
  async rotateOnLogin(userId: string, prevSessionId?: string, context: SessionContext = {}): Promise<string> {
    return this.executeOperation('rotateOnLogin', async () => {
      const startTime = Date.now();

      try {
        // Start transaction for atomic operation
        await this.query('START TRANSACTION');

        let rotatedFromId: string | undefined;

        // Revoke previous session if provided
        if (prevSessionId) {
          const revokeResult = await this.revokeSession(prevSessionId, false); // Don't commit yet
          if (revokeResult) {
            rotatedFromId = prevSessionId;
          }
        }

        // Create new session with rotation tracking
        const sessionToken = await this.createSession(userId, {
          ...context,
          rotatedFrom: rotatedFromId
        }, false); // Don't commit yet

        // Commit transaction
        await this.query('COMMIT');

        this.logger.info('Session rotated on login', {
          operation: 'rotateOnLogin',
          metadata: {
            userId,
            hadPreviousSession: !!prevSessionId,
            rotatedFromId,
            duration: Date.now() - startTime
          }
        });

        return sessionToken;

      } catch (error) {
        // Rollback transaction on error
        await this.query('ROLLBACK').catch(() => {
          // Ignore rollback errors
        });

        this.logger.error('Session rotation on login failed', error as Error, {
          operation: 'rotateOnLogin',
          metadata: { userId, prevSessionId }
        });

        throw BizError.internalError('SessionService', error as Error);
      }
    });
  }

  /**
   * Rotate session on refresh - rotates token and sets rotated_from
   * @param sessionId - Current session ID
   * @param context - Session context
   * @returns Session rotation result
   */
  async rotateOnRefresh(sessionId: string, context: SessionContext = {}): Promise<SessionRotationResult> {
    return this.executeOperation('rotateOnRefresh', async () => {
      const startTime = Date.now();

      try {
        // Start transaction for atomic operation
        await this.query('START TRANSACTION');

        // Validate current session
        const currentSession = await this.getSessionById(sessionId);
        if (!currentSession || currentSession.revokedAt) {
          await this.query('ROLLBACK');
          return {
            success: false,
            oldSessionRevoked: false,
            error: 'Session not found or already revoked'
          };
        }

        // Create new session token
        const newSessionToken = this.generateSessionToken();
        const newSessionTokenHash = this.hashSessionToken(newSessionToken);
        const newExpiresAt = new Date(Date.now() + (this.sessionExpiryHours * 60 * 60 * 1000));

        // Update current session with new token hash and mark as rotated
        await this.query(
          `UPDATE user_sessions
           SET session_token_hash = ?,
               expires_at = ?,
               rotated_from = ?
           WHERE id = ?`,
          [newSessionTokenHash, newExpiresAt, currentSession.id, sessionId]
        );

        // Commit transaction
        await this.query('COMMIT');

        this.logger.info('Session rotated on refresh', {
          operation: 'rotateOnRefresh',
          metadata: {
            sessionId,
            userId: currentSession.userId,
            duration: Date.now() - startTime
          }
        });

        return {
          success: true,
          newSessionToken,
          oldSessionRevoked: false,
          rotationId: sessionId
        };

      } catch (error) {
        // Rollback transaction on error
        await this.query('ROLLBACK').catch(() => {
          // Ignore rollback errors
        });

        this.logger.error('Session rotation on refresh failed', error as Error, {
          operation: 'rotateOnRefresh',
          metadata: { sessionId }
        });

        return {
          success: false,
          oldSessionRevoked: false,
          error: (error as Error).message
        };
      }
    });
  }

  /**
   * Revoke ALL sessions for user - used on password change
   * @param userId - User ID
   * @param reason - Reason for revocation
   * @returns Number of sessions revoked
   */
  async revokeAllForUser(userId: string, reason: string = 'password_change'): Promise<number> {
    return this.executeOperation('revokeAllForUser', async () => {
      const startTime = Date.now();

      try {
        const revokedAt = new Date();

        // Revoke all active sessions for user
        const result = await this.query(
          `UPDATE user_sessions
           SET revoked_at = ?
           WHERE user_id = ? AND revoked_at IS NULL`,
          [revokedAt, userId]
        );

        const revokedCount = result.rowCount || 0;

        this.logger.info('All user sessions revoked', {
          operation: 'revokeAllForUser',
          metadata: {
            userId,
            reason,
            revokedCount,
            duration: Date.now() - startTime
          }
        });

        return revokedCount;

      } catch (error) {
        this.logger.error('Failed to revoke all user sessions', error as Error, {
          operation: 'revokeAllForUser',
          metadata: { userId, reason }
        });

        throw BizError.internalError('SessionService', error as Error);
      }
    });
  }

  /**
   * Create new session
   * @param userId - User ID
   * @param context - Session context
   * @param autoCommit - Whether to auto-commit transaction
   * @returns Session token
   */
  async createSession(userId: string, context: SessionContext & { rotatedFrom?: string } = {}, autoCommit: boolean = true): Promise<string> {
    return this.executeOperation('createSession', async () => {
      const sessionToken = this.generateSessionToken();
      const sessionTokenHash = this.hashSessionToken(sessionToken);
      const now = context.timestamp || new Date();
      const expiresAt = new Date(now.getTime() + (this.sessionExpiryHours * 60 * 60 * 1000));

      // Process context for privacy compliance
      const userAgentHash = context.userAgent ? this.hashUserAgent(context.userAgent) : null;
      const ipCoarse = context.ipAddress ? this.coarseIp(context.ipAddress) : null;

      try {
        if (autoCommit) {
          await this.query('START TRANSACTION');
        }

        // Generate unique session ID (VARCHAR(255) column requires explicit value)
        const sessionId = crypto.randomUUID();

        // Insert session record
        await this.query(
          `INSERT INTO user_sessions
           (id, user_id, session_token_hash, user_agent_hash, ip_coarse, created_at, expires_at, rotated_from)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [sessionId, userId, sessionTokenHash, userAgentHash, ipCoarse, now, expiresAt, context.rotatedFrom || null]
        );

        if (autoCommit) {
          await this.query('COMMIT');
        }

        this.logger.info('Session created', {
          operation: 'createSession',
          metadata: {
            userId,
            hasUserAgent: !!context.userAgent,
            hasIpAddress: !!context.ipAddress,
            rotatedFrom: context.rotatedFrom,
            expiresAt: expiresAt.toISOString()
          }
        });

        return sessionToken;

      } catch (error) {
        if (autoCommit) {
          await this.query('ROLLBACK').catch(() => {
            // Ignore rollback errors
          });
        }

        this.logger.error('Session creation failed', error as Error, {
          operation: 'createSession',
          metadata: { userId }
        });

        throw BizError.internalError('SessionService', error as Error);
      }
    });
  }

  /**
   * Validate session token
   * @param sessionToken - Session token to validate
   * @param context - Validation context
   * @returns Validation result
   */
  async validateSession(sessionToken: string, context: SessionContext = {}): Promise<SessionValidationResult> {
    return this.executeOperation('validateSession', async () => {
      try {
        const sessionTokenHash = this.hashSessionToken(sessionToken);

        // Find session by token hash
        const result = await this.query<{
          id: string;
          user_id: string;
          user_agent_hash: Buffer | null;
          ip_coarse: Buffer | null;
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
          rotated_from: string | null;
        }>(
          `SELECT id, user_id, user_agent_hash, ip_coarse, created_at, expires_at, revoked_at, rotated_from
           FROM user_sessions
           WHERE session_token_hash = ?`,
          [sessionTokenHash]
        );

        if (result.rows.length === 0) {
          return { valid: false, reason: 'not_found' };
        }

        const row = result.rows[0];
        if (!row) return { valid: false, reason: 'not_found' };

        // Check if revoked
        if (row.revoked_at) {
          return { valid: false, reason: 'revoked' };
        }

        // Check if expired
        const expiresAt = new Date(row.expires_at);
        if (expiresAt <= new Date()) {
          return { valid: false, reason: 'expired' };
        }

        // Create session data
        const session: SessionData = {
          id: row.id,
          userId: row.user_id,
          sessionTokenHash,
          userAgentHash: row.user_agent_hash || undefined,
          ipCoarse: row.ip_coarse || undefined,
          createdAt: new Date(row.created_at),
          expiresAt: expiresAt,
          revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
          rotatedFrom: row.rotated_from || undefined
        };

        // Perform soft-binding validation (informational only)
        this.validateSoftBinding(session, context);

        return { valid: true, session };

      } catch (error) {
        this.logger.error('Session validation failed', error as Error, {
          operation: 'validateSession'
        });

        return { valid: false, reason: 'invalid' };
      }
    });
  }

  /**
   * Revoke specific session
   * @param sessionId - Session ID to revoke
   * @param autoCommit - Whether to auto-commit transaction
   * @returns True if session was revoked
   */
  async revokeSession(sessionId: string, autoCommit: boolean = true): Promise<boolean> {
    return this.executeOperation('revokeSession', async () => {
      try {
        if (autoCommit) {
          await this.query('START TRANSACTION');
        }

        const revokedAt = new Date();
        const result = await this.query(
          `UPDATE user_sessions
           SET revoked_at = ?
           WHERE id = ? AND revoked_at IS NULL`,
          [revokedAt, sessionId]
        );

        if (autoCommit) {
          await this.query('COMMIT');
        }

        const revoked = (result.rowCount || 0) > 0;

        this.logger.info('Session revoked', {
          operation: 'revokeSession',
          metadata: { sessionId, revoked }
        });

        return revoked;

      } catch (error) {
        if (autoCommit) {
          await this.query('ROLLBACK').catch(() => {
            // Ignore rollback errors
          });
        }

        this.logger.error('Session revocation failed', error as Error, {
          operation: 'revokeSession',
          metadata: { sessionId }
        });

        throw BizError.internalError('SessionService', error as Error);
      }
    });
  }

  // Private helper methods

  /**
   * Get session by ID
   */
  private async getSessionById(sessionId: string): Promise<SessionData | null> {
    const result = await this.query<{
      id: string;
      user_id: string;
      session_token_hash: Buffer;
      user_agent_hash: Buffer | null;
      ip_coarse: Buffer | null;
      created_at: string;
      expires_at: string;
      revoked_at: string | null;
      rotated_from: string | null;
    }>(
      `SELECT id, user_id, session_token_hash, user_agent_hash, ip_coarse,
              created_at, expires_at, revoked_at, rotated_from
       FROM user_sessions
       WHERE id = ?`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      sessionTokenHash: row.session_token_hash,
      userAgentHash: row.user_agent_hash || undefined,
      ipCoarse: row.ip_coarse || undefined,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
      rotatedFrom: row.rotated_from || undefined
    };
  }

  /**
   * Validate session table schema
   */
  private async validateSessionTable(): Promise<void> {
    try {
      // Verify table exists with required columns
      const result = await this.query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user_sessions'
         AND COLUMN_NAME IN ('id', 'user_id', 'session_token_hash', 'user_agent_hash',
                             'ip_coarse', 'created_at', 'expires_at', 'revoked_at', 'rotated_from')`
      );

      const requiredColumns = 9;
      if (result.rows.length !== requiredColumns) {
        throw new Error(`user_sessions table missing required columns. Found ${result.rows.length}, expected ${requiredColumns}`);
      }

      this.logger.info('Session table schema validated', {
        operation: 'validateSessionTable',
        metadata: { columnsFound: result.rows.length }
      });

    } catch (error) {
      this.logger.error('Session table validation failed', error as Error, {
        operation: 'validateSessionTable'
      });

      throw BizError.serviceUnavailable('SessionService', error as Error);
    }
  }

  /**
   * Generate cryptographically secure session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash session token using SHA-256
   */
  private hashSessionToken(token: string): Buffer {
    return crypto.createHash('sha256').update(token, 'utf8').digest();
  }

  /**
   * Hash user agent for privacy compliance
   */
  private hashUserAgent(userAgent: string): Buffer {
    const normalized = userAgent.trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized, 'utf8').digest();
  }

  /**
   * Convert IP to coarse representation for privacy compliance
   * /24 for IPv4, /64 for IPv6
   */
  private coarseIp(ipAddress: string): Buffer | null {
    try {
      if (ipAddress.includes(':')) {
        // IPv6 - use /64 prefix
        const parts = ipAddress.split(':');
        if (parts.length >= 4) {
          const prefix = parts.slice(0, 4).join(':') + '::';
          return Buffer.from(prefix, 'utf8');
        }
      } else if (ipAddress.includes('.')) {
        // IPv4 - use /24 prefix
        const parts = ipAddress.split('.');
        if (parts.length === 4) {
          const prefix = parts.slice(0, 3).join('.') + '.0';
          return Buffer.from(prefix, 'utf8');
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate soft-binding (informational only, doesn't fail validation)
   */
  private validateSoftBinding(session: SessionData, context: SessionContext): void {
    // User agent soft-binding check
    if (context.userAgent && session.userAgentHash) {
      const providedUAHash = this.hashUserAgent(context.userAgent);
      const matches = providedUAHash.equals(session.userAgentHash);

      this.logger.debug('User agent soft-binding check', {
        operation: 'validateSoftBinding',
        metadata: { matches, type: 'user_agent' }
      });
    }

    // IP soft-binding check
    if (context.ipAddress && session.ipCoarse) {
      const providedIPCoarse = this.coarseIp(context.ipAddress);
      const matches = providedIPCoarse && providedIPCoarse.equals(session.ipCoarse);

      this.logger.debug('IP soft-binding check', {
        operation: 'validateSoftBinding',
        metadata: { matches, type: 'ip_coarse' }
      });
    }
  }

  /**
   * Health check for session service
   */
  protected async performHealthChecks(): Promise<Record<string, boolean>> {
    try {
      // Check database connectivity
      const dbHealth = await this.query('SELECT 1 as health_check');
      const dbHealthy = dbHealth.rows.length > 0;

      // Check session table access
      const tableHealth = await this.query(
        'SELECT COUNT(*) as count FROM user_sessions LIMIT 1'
      );
      const tableHealthy = tableHealth.rows.length > 0;

      return {
        database: dbHealthy,
        sessionTable: tableHealthy
      };
    } catch {
      return {
        database: false,
        sessionTable: false
      };
    }
  }
}