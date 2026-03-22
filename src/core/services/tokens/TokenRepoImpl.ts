/**
 * TokenRepoImpl - Database implementation of TokenRepo interface
 *
 * @governance Repository pattern with DatabaseService boundary
 * @governance Service Architecture v2.0 compliance
 * @governance NO direct mysql2/mariadb imports (use DatabaseService)
 *
 * Implements token storage for email verification and password reset workflows.
 * Stores SHA-256 hashes only (never raw tokens) with single-use consumption tracking.
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import type { RowDataPacket, ResultSetHeader } from '@core/types/mariadb-compat';
import type {
  TokenRepo,
  TokenRecord,
  TokenPurpose
} from './types';

/**
 * TokenRepoImpl - MariaDB implementation of token repository
 *
 * GOVERNANCE: Uses DatabaseService singleton for all operations
 * GOVERNANCE: Supports both email_verifications and password_resets tables
 *
 * Table mapping:
 * - email_verify → email_verifications table
 * - password_reset → password_resets table
 */
export class TokenRepoImpl implements TokenRepo {
  private db = getDatabaseService();

  /**
   * Get table name based on token purpose
   * GOVERNANCE: Maps purpose to correct database table
   *
   * @param purpose - Token purpose
   * @returns Database table name
   */
  private getTableName(purpose: TokenPurpose): string {
    return purpose === 'email_verify' ? 'email_verifications' : 'password_resets';
  }

  /**
   * Insert a new token record
   *
   * @param record - Token record without id and usedAt
   * @returns Complete token record with assigned id
   */
  async insert(record: Omit<TokenRecord, 'id' | 'usedAt'>): Promise<TokenRecord> {
    const tableName = this.getTableName(record.purpose);

    const sql = `
      INSERT INTO ${tableName} (
        user_id,
        token_hash,
        created_at,
        expires_at
      )
      VALUES (?, ?, ?, ?)
    `;

    const result = await this.db.query<ResultSetHeader>(sql, [
      record.userId.toString(), // Convert bigint to string for MariaDB
      record.tokenHash,
      record.createdAt,
      record.expiresAt
    ]);

    const insertId = BigInt(result.insertId || 0);

    // Return complete record
    return {
      ...record,
      id: insertId,
      usedAt: null
    };
  }

  /**
   * Mark a token as used by its hash
   * GOVERNANCE: Atomic operation to prevent double-use
   *
   * @param tokenHash - SHA-256 hash of the token
   * @param purpose - Token purpose for table selection
   * @returns True if token was successfully marked as used
   */
  async markUsedByHash(tokenHash: Buffer, purpose: TokenPurpose): Promise<boolean> {
    const tableName = this.getTableName(purpose);

    // Atomic update: only mark if not already used
    const sql = `
      UPDATE ${tableName}
      SET used_at = CURRENT_TIMESTAMP(3)
      WHERE token_hash = ?
        AND used_at IS NULL
    `;

    const result = await this.db.query<ResultSetHeader>(sql, [tokenHash]);

    // Return true if exactly one row was updated
    return result.rowCount === 1;
  }

  /**
   * Find token record by hash and purpose
   *
   * @param tokenHash - SHA-256 hash of the token
   * @param purpose - Token purpose for table selection
   * @returns Token record if found, null otherwise
   */
  async findByHash(tokenHash: Buffer, purpose: TokenPurpose): Promise<TokenRecord | null> {
    const tableName = this.getTableName(purpose);

    const sql = `
      SELECT
        id,
        user_id,
        token_hash,
        created_at,
        expires_at,
        used_at
      FROM ${tableName}
      WHERE token_hash = ?
      LIMIT 1
    `;

    const result = await this.db.query<RowDataPacket>(sql, [tokenHash]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: BigInt(row.id),
      userId: BigInt(row.user_id),
      tokenHash: row.token_hash as Buffer,
      purpose,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedAt: row.used_at || null
    };
  }

  /**
   * Delete expired tokens
   * GOVERNANCE: Maintenance operation for token cleanup
   *
   * @param now - Current timestamp for expiration comparison
   * @returns Number of deleted records
   */
  async deleteExpired(now: Date): Promise<number> {
    let totalDeleted = 0;

    // Delete from both tables
    for (const purpose of ['email_verify', 'password_reset'] as TokenPurpose[]) {
      const tableName = this.getTableName(purpose);

      const sql = `
        DELETE FROM ${tableName}
        WHERE expires_at < ?
      `;

      const result = await this.db.query<ResultSetHeader>(sql, [now]);
      totalDeleted += result.rowCount || 0;
    }

    return totalDeleted;
  }

  /**
   * Revoke all tokens for a user
   * GOVERNANCE: Security feature for account security
   *
   * @param userId - User ID
   * @param purpose - Optional purpose filter
   * @returns Number of revoked tokens
   */
  async revokeAllByUser(userId: bigint, purpose?: TokenPurpose): Promise<number> {
    let totalRevoked = 0;

    const purposes: TokenPurpose[] = purpose
      ? [purpose]
      : ['email_verify', 'password_reset'];

    for (const p of purposes) {
      const tableName = this.getTableName(p);

      // Mark all unused tokens as used (revoked)
      const sql = `
        UPDATE ${tableName}
        SET used_at = CURRENT_TIMESTAMP(3)
        WHERE user_id = ?
          AND used_at IS NULL
      `;

      const result = await this.db.query<ResultSetHeader>(sql, [userId.toString()]);
      totalRevoked += result.rowCount || 0;
    }

    return totalRevoked;
  }

  /**
   * Count active tokens for a user
   * Useful for rate limiting and debugging
   *
   * @param userId - User ID
   * @param purpose - Token purpose
   * @returns Count of active (unused, non-expired) tokens
   */
  async countActiveForUser(userId: bigint, purpose: TokenPurpose): Promise<number> {
    const tableName = this.getTableName(purpose);

    const sql = `
      SELECT COUNT(*) as count
      FROM ${tableName}
      WHERE user_id = ?
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP(3)
    `;

    const result = await this.db.query<RowDataPacket>(sql, [userId.toString()]);
    return (result.rows[0] as Record<string, unknown>)?.count as number || 0;
  }

  /**
   * Get most recent token for user (for debugging)
   *
   * @param userId - User ID
   * @param purpose - Token purpose
   * @returns Most recent token record or null
   */
  async getMostRecentForUser(userId: bigint, purpose: TokenPurpose): Promise<TokenRecord | null> {
    const tableName = this.getTableName(purpose);

    const sql = `
      SELECT
        id,
        user_id,
        token_hash,
        created_at,
        expires_at,
        used_at
      FROM ${tableName}
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query<RowDataPacket>(sql, [userId.toString()]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: BigInt(row.id),
      userId: BigInt(row.user_id),
      tokenHash: row.token_hash as Buffer,
      purpose,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedAt: row.used_at || null
    };
  }
}

/**
 * Singleton instance for application-wide use
 * GOVERNANCE: Singleton pattern for repository reuse
 */
let tokenRepoInstance: TokenRepoImpl | null = null;

/**
 * Get TokenRepoImpl singleton instance
 *
 * @returns Shared TokenRepoImpl instance
 */
export function getTokenRepo(): TokenRepoImpl {
  if (!tokenRepoInstance) {
    tokenRepoInstance = new TokenRepoImpl();
  }
  return tokenRepoInstance;
}

/**
 * Default export for convenience
 */
export default TokenRepoImpl;
