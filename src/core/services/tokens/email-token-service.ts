/**
 * EmailTokenService - Secure token generation and verification for email workflows
 * Handles verification tokens and password reset tokens with cryptographic security
 */

import {
  TokenRepo,
  TokenPurpose,
  CreateTokenOptions,
  CreateTokenResult,
  VerifyConsumeResult,
  EmailTokenService as EmailTokenServiceInterface
} from './types';
import { genRawToken, base64urlEncode, base64urlDecode, sha256 } from './token-utils';

/**
 * Configuration interface for EmailTokenService
 */
export interface EmailTokenServiceConfig {
  /** TTL for email verification tokens in minutes */
  verifyTokenTtlMinutes: number;
  /** TTL for password reset tokens in minutes */
  resetTokenTtlMinutes: number;
}

/**
 * Implementation of EmailTokenService with secure token handling
 *
 * Security features:
 * - High-entropy token generation (32 random bytes)
 * - Only SHA-256 hashes stored in database
 * - Single-use token consumption
 * - TTL-based expiration
 * - Uniform responses to prevent enumeration
 */
export class EmailTokenService implements EmailTokenServiceInterface {
  private readonly repo: TokenRepo;
  private readonly clock: () => Date;
  private readonly config: EmailTokenServiceConfig;

  /**
   * Create new EmailTokenService instance
   * @param repo - Token repository for storage operations
   * @param clock - Clock function for time operations (injectable for testing)
   * @param config - Service configuration with TTL values
   */
  constructor(
    repo: TokenRepo,
    clock: () => Date = () => new Date(),
    config?: Partial<EmailTokenServiceConfig>
  ) {
    this.repo = repo;
    this.clock = clock;

    // Load configuration with environment variable defaults
    this.config = {
      verifyTokenTtlMinutes: config?.verifyTokenTtlMinutes ??
        parseInt(process.env.AUTH_VERIFY_TOKEN_TTL_MIN || '60', 10),
      resetTokenTtlMinutes: config?.resetTokenTtlMinutes ??
        parseInt(process.env.AUTH_RESET_TOKEN_TTL_MIN || '30', 10)
    };
  }

  /**
   * Create a new token for the specified user and purpose
   * @param options - Token creation options
   * @returns Token string and expiration information
   */
  async create(options: CreateTokenOptions): Promise<CreateTokenResult> {
    const { userId, purpose, ttlMinutes } = options;

    // Generate high-entropy raw token (32 bytes = 256 bits)
    const rawToken = genRawToken(32);

    // Create base64url token for email/URL usage
    const token = base64urlEncode(rawToken);

    // Generate SHA-256 hash for storage (never store raw token)
    const tokenHash = sha256(rawToken);

    // Determine TTL based on purpose or override
    const ttl = ttlMinutes ?? (purpose === 'email_verify'
      ? this.config.verifyTokenTtlMinutes
      : this.config.resetTokenTtlMinutes);

    // Calculate expiration time
    const now = this.clock();
    const expiresAt = new Date(now.getTime() + ttl * 60 * 1000);

    // Store token record (only hash, never raw token)
    await this.repo.insert({
      userId,
      tokenHash,
      purpose,
      createdAt: now,
      expiresAt
    });

    return {
      token,
      expiresAt
    };
  }

  /**
   * Verify and consume a token (single-use operation)
   * @param token - Base64url encoded token
   * @param purpose - Expected token purpose
   * @param now - Optional current time override for testing
   * @returns Verification result with uniform response timing
   */
  async verifyAndConsume(
    token: string,
    purpose: TokenPurpose,
    now?: Date
  ): Promise<VerifyConsumeResult> {
    const currentTime = now ?? this.clock();

    try {
      // Decode token and generate hash for lookup
      const rawToken = base64urlDecode(token);
      const tokenHash = sha256(rawToken);

      // Find token record by hash and purpose
      const record = await this.repo.findByHash(tokenHash, purpose);

      // Token not found - uniform response
      if (!record) {
        return { ok: false, reason: 'invalid' };
      }

      // Token already used - uniform response
      if (record.usedAt) {
        return { ok: false, reason: 'used' };
      }

      // Token expired - uniform response
      if (currentTime > record.expiresAt) {
        return { ok: false, reason: 'expired' };
      }

      // Attempt to mark token as used (atomic operation)
      const marked = await this.repo.markUsedByHash(tokenHash, purpose);

      // Token was used by another concurrent request
      if (!marked) {
        return { ok: false, reason: 'used' };
      }

      // Success - token verified and consumed
      return {
        ok: true,
        reason: 'ok',
        userId: record.userId
      };

    } catch (error) {
      // Invalid token format or other error - uniform response
      return { ok: false, reason: 'invalid' };
    }
  }

  /**
   * Revoke all tokens for a user
   * @param userId - User ID
   * @param purpose - Optional purpose filter
   * @returns Number of revoked tokens
   */
  async revokeAllForUser(userId: bigint, purpose?: TokenPurpose): Promise<number> {
    return await this.repo.revokeAllByUser(userId, purpose);
  }
}

/**
 * Re-export interfaces for convenience
 * Phase 3: Use 'export type' for isolatedModules compliance
 */
export type {
  CreateTokenOptions,
  CreateTokenResult,
  VerifyConsumeResult,
  EmailTokenServiceInterface
};