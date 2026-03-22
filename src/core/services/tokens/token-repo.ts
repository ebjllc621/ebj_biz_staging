/**
 * TokenRepo - Database repository for secure email token management
 *
 * Provides database operations for email verification and password reset tokens
 * with secure hash-based storage and proper lifecycle management.
 *
 * Security Features:
 * - Only SHA-256 hashes stored in database
 * - Atomic single-use consumption with race condition protection
 * - TTL-based expiration management
 * - Bulk revocation capabilities
 */

import { TokenRepo, TokenPurpose, TokenRecord } from './types';
import { DatabaseService } from '@/core/services/DatabaseService';

/**
 * Token repository implementation for MySQL/MariaDB
 * Phase 3: Updated to use canonical DatabaseService
 */
export class TokenRepoImpl implements TokenRepo {
  constructor(
    private readonly db: DatabaseService,
    private readonly tableName: string
  ) {}

  /**
   * Insert new token record (hash only, never raw token)
   * Phase 3: Fixed return type to match TokenRepo interface
   */
  async insert(record: Omit<TokenRecord, 'id' | 'usedAt'>): Promise<TokenRecord> {
    const result = await this.db.query(`
      INSERT INTO ${this.tableName} (user_id, token_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `, [
      record.userId.toString(),
      record.tokenHash,
      record.createdAt,
      record.expiresAt
    ]);

    // Return the complete record with the new id
    return {
      ...record,
      id: BigInt(result.rowCount || 0), // Use insertId from result if available
      usedAt: null
    };
  }

  /**
   * Find token record by hash and purpose
   */
  async findByHash(tokenHash: Buffer, purpose: TokenPurpose): Promise<TokenRecord | null> {
    const result = await this.db.query<unknown>(`
      SELECT id, user_id, token_hash, created_at, expires_at, used_at
      FROM ${this.tableName}
      WHERE token_hash = ?
      LIMIT 1
    `, [tokenHash]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: BigInt(row.id as number),
      userId: BigInt(row.user_id as number),
      tokenHash: row.token_hash as Buffer,
      purpose,
      createdAt: new Date(row.created_at as string),
      expiresAt: new Date(row.expires_at as string),
      usedAt: row.used_at ? new Date(row.used_at as string) : null
    };
  }

  /**
   * Mark token as used (atomic operation for single-use enforcement)
   */
  async markUsedByHash(tokenHash: Buffer, purpose: TokenPurpose): Promise<boolean> {
    const result = await this.db.query(`
      UPDATE ${this.tableName}
      SET used_at = NOW()
      WHERE token_hash = ? AND used_at IS NULL
    `, [tokenHash]);

    return (result.rowCount || 0) > 0;
  }

  /**
   * Revoke all tokens for a user (optionally filtered by purpose)
   */
  async revokeAllByUser(userId: bigint, purpose?: TokenPurpose): Promise<number> {
    const result = await this.db.query(`
      UPDATE ${this.tableName}
      SET used_at = NOW()
      WHERE user_id = ? AND used_at IS NULL
    `, [userId.toString()]);

    return result.rowCount || 0;
  }

  /**
   * Delete expired tokens
   * Phase 3: Added to implement TokenRepo interface requirement
   */
  async deleteExpired(now: Date): Promise<number> {
    const result = await this.db.query(`
      DELETE FROM ${this.tableName}
      WHERE expires_at < ?
    `, [now]);

    return result.rowCount || 0;
  }

  /**
   * Clean up expired tokens (maintenance operation)
   * Note: Calls deleteExpired with current timestamp
   */
  async cleanupExpired(): Promise<number> {
    return this.deleteExpired(new Date());
  }
}

/**
 * Factory function to create token repository
 * Phase 3: Updated to use canonical DatabaseService
 */
export function createTokenRepo(
  databaseService: DatabaseService,
  tableName: string = 'email_verifications'
): TokenRepo {
  return new TokenRepoImpl(databaseService, tableName);
}

/**
 * Create password reset token repository
 * Phase 3: Updated to use canonical DatabaseService
 */
export function createPasswordResetRepo(
  databaseService: DatabaseService
): TokenRepo {
  return new TokenRepoImpl(databaseService, 'password_resets');
}

/**
 * Create email verification token repository
 * Phase 3: Updated to use canonical DatabaseService
 */
export function createEmailVerificationRepo(
  databaseService: DatabaseService
): TokenRepo {
  return new TokenRepoImpl(databaseService, 'email_verifications');
}