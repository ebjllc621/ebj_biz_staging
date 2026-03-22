/**
 * TypeScript interfaces and types for email token system
 * Defines contracts for token storage, service operations, and data structures
 */

/**
 * Token purpose types for different authentication flows
 */
export type TokenPurpose = 'email_verify' | 'password_reset';

/**
 * Database record structure for stored tokens
 * Only token hashes are stored, never raw tokens
 */
export interface TokenRecord {
  /** Unique identifier for the token record */
  id: bigint;
  /** User ID this token belongs to */
  userId: bigint;
  /** SHA-256 hash of the raw token (binary storage) */
  tokenHash: Buffer;
  /** Purpose of this token */
  purpose: TokenPurpose;
  /** When the token was created */
  createdAt: Date;
  /** When the token expires */
  expiresAt: Date;
  /** When the token was consumed (null if unused) */
  usedAt: Date | null;
}

/**
 * Options for creating a new token
 */
export interface CreateTokenOptions {
  /** User ID for whom to create the token */
  userId: bigint;
  /** Purpose of the token */
  purpose: TokenPurpose;
  /** Token TTL in minutes (optional, uses purpose-based defaults) */
  ttlMinutes?: number;
}

/**
 * Result of token creation
 */
export interface CreateTokenResult {
  /** Base64url encoded token for use in emails/URLs */
  token: string;
  /** When this token expires */
  expiresAt: Date;
}

/**
 * Result of token verification and consumption
 */
export interface VerifyConsumeResult {
  /** Whether the operation succeeded */
  ok: boolean;
  /** Reason for failure or success */
  reason?: 'expired' | 'used' | 'invalid' | 'ok';
  /** User ID if verification succeeded */
  userId?: bigint;
}

/**
 * Repository interface for token storage operations
 * Abstracts database/storage implementation details
 */
export interface TokenRepo {
  /**
   * Insert a new token record
   * @param record - Token record without id and usedAt
   * @returns Complete token record with assigned id
   */
  insert(record: Omit<TokenRecord, 'id' | 'usedAt'>): Promise<TokenRecord>;

  /**
   * Mark a token as used by its hash
   * @param tokenHash - SHA-256 hash of the token
   * @param purpose - Token purpose for additional validation
   * @returns True if token was successfully marked as used
   */
  markUsedByHash(tokenHash: Buffer, purpose: TokenPurpose): Promise<boolean>;

  /**
   * Find token record by hash and purpose
   * @param tokenHash - SHA-256 hash of the token
   * @param purpose - Token purpose
   * @returns Token record if found, null otherwise
   */
  findByHash(tokenHash: Buffer, purpose: TokenPurpose): Promise<TokenRecord | null>;

  /**
   * Delete expired tokens
   * @param now - Current timestamp for expiration comparison
   * @returns Number of deleted records
   */
  deleteExpired(now: Date): Promise<number>;

  /**
   * Revoke all tokens for a user
   * @param userId - User ID
   * @param purpose - Optional purpose filter
   * @returns Number of revoked tokens
   */
  revokeAllByUser(userId: bigint, purpose?: TokenPurpose): Promise<number>;
}

/**
 * Main email token service interface
 */
export interface EmailTokenService {
  /**
   * Create a new token for a user
   * @param options - Token creation options
   * @returns Token string and expiration date
   */
  create(options: CreateTokenOptions): Promise<CreateTokenResult>;

  /**
   * Verify and consume a token (single-use)
   * @param token - Base64url encoded token
   * @param purpose - Expected token purpose
   * @param now - Optional current time for testing
   * @returns Verification result with user ID if successful
   */
  verifyAndConsume(token: string, purpose: TokenPurpose, now?: Date): Promise<VerifyConsumeResult>;

  /**
   * Revoke all tokens for a user
   * @param userId - User ID
   * @param purpose - Optional purpose filter
   * @returns Number of revoked tokens
   */
  revokeAllForUser(userId: bigint, purpose?: TokenPurpose): Promise<number>;
}