/**
 * Production-grade password service with bcrypt hashing and security best practices
 * @module password-service
 */

import bcrypt from 'bcrypt';
import { timingSafeEqual } from './crypto';

/**
 * Password policy configuration
 */
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  allowUnicode: boolean;
}

/**
 * Result of password hashing operation
 */
export interface HashResult {
  hash: Buffer;
  algo: 'bcrypt';
  cost: number;
}

/**
 * Result of password verification operation
 */
export interface VerifyResult {
  valid: boolean;
  needsRehash: boolean;
}

/**
 * Password service interface for secure password operations
 */
export interface PasswordService {
  hash(plaintext: string): Promise<HashResult>;
  verify(plaintext: string, hash: Buffer): Promise<VerifyResult>;
  policy(): PasswordPolicy;
}

/**
 * Production implementation of PasswordService
 */
class PasswordServiceImpl implements PasswordService {
  private readonly cost: number;
  private readonly pepper: string;
  private readonly passwordPolicy: PasswordPolicy;

  constructor() {
    // Load configuration from environment
    this.cost = parseInt(process.env.AUTH_BCRYPT_COST ?? '12', 10);
    this.pepper = process.env.AUTH_PASSWORD_PEPPER ?? '';

    // Validate cost parameter
    if (this.cost < 4 || this.cost > 31) {
      throw new Error(`Invalid bcrypt cost: ${this.cost}. Must be between 4 and 31.`);
    }

    // Define password policy
    this.passwordPolicy = {
      minLength: 12,
      maxLength: 128,
      allowUnicode: true
    };
  }

  /**
   * Returns the current password policy
   */
  policy(): PasswordPolicy {
    return { ...this.passwordPolicy };
  }

  /**
   * Normalizes and validates password input
   * @param plaintext - The password to normalize
   * @returns Normalized password
   * @throws Error if password doesn't meet policy requirements
   */
  private normalizeInput(plaintext: string): string {
    if (typeof plaintext !== 'string') {
      throw new Error('Password must be a string');
    }

    // Check length constraints
    if (plaintext.length < this.passwordPolicy.minLength) {
      throw new Error(`Password must be at least ${this.passwordPolicy.minLength} characters long`);
    }

    if (plaintext.length > this.passwordPolicy.maxLength) {
      throw new Error(`Password must be at most ${this.passwordPolicy.maxLength} characters long`);
    }

    // Unicode validation (if allowUnicode is false, we would check for ASCII-only)
    if (!this.passwordPolicy.allowUnicode) {
      // Check for ASCII-only characters
      if (!/^[\x00-\x7F]*$/.test(plaintext)) {
        throw new Error('Password contains non-ASCII characters');
      }
    }

    return plaintext;
  }

  /**
   * Hashes a password with bcrypt and optional pepper
   * @param plaintext - The password to hash
   * @returns Promise resolving to hash result
   */
  async hash(plaintext: string): Promise<HashResult> {
    try {
      const normalizedPassword = this.normalizeInput(plaintext);
      const passwordWithPepper = normalizedPassword + this.pepper;

      const hashString = await bcrypt.hash(passwordWithPepper, this.cost);
      const hashBuffer = Buffer.from(hashString, 'utf8');

      return {
        hash: hashBuffer,
        algo: 'bcrypt',
        cost: this.cost
      };
    } catch (error) {
      // Never log the actual password or pepper
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verifies a password against a stored hash
   * @param plaintext - The password to verify
   * @param hash - The stored hash to verify against
   * @returns Promise resolving to verification result
   */
  async verify(plaintext: string, hash: Buffer): Promise<VerifyResult> {
    try {
      const normalizedPassword = this.normalizeInput(plaintext);
      const passwordWithPepper = normalizedPassword + this.pepper;
      const hashString = hash.toString('utf8');

      // Extract cost from the hash to determine if rehashing is needed
      const storedCost = this.extractCostFromHash(hashString);
      const needsRehash = this.cost > storedCost;

      // Perform timing-safe comparison
      const valid = await bcrypt.compare(passwordWithPepper, hashString);

      return {
        valid,
        needsRehash
      };
    } catch (error) {
      // Never log the actual password or pepper
      return {
        valid: false,
        needsRehash: false
      };
    }
  }

  /**
   * Extracts the cost factor from a bcrypt hash string
   * @param hashString - The bcrypt hash string
   * @returns The cost factor used to generate the hash
   */
  private extractCostFromHash(hashString: string): number {
    try {
      // bcrypt hash format: $2a$10$... or $2b$12$...
      // Extract the cost from the second field
      const parts = hashString.split('$');
      if (parts.length < 4 || !parts[1]?.match(/^2[ab]$/)) {
        throw new Error('Invalid bcrypt hash format');
      }

      const cost = parseInt(parts[2] || '0', 10);
      if (isNaN(cost) || cost < 4 || cost > 31) {
        throw new Error('Invalid cost factor in hash');
      }

      return cost;
    } catch (error) {
      // If we can't parse the cost, assume it needs rehashing
      return 0;
    }
  }
}

/**
 * Default password service instance
 */
export const passwordService: PasswordService = new PasswordServiceImpl();

/**
 * Creates a new password service instance (useful for testing)
 */
export function createPasswordService(): PasswordService {
  return new PasswordServiceImpl();
}