/**
 * PasswordServiceImpl - Production password hashing service
 *
 * GOVERNANCE: Service Architecture v2.0 compliance
 * GOVERNANCE: Uses bcrypt for password hashing (CLAUDE.md security standards)
 * GOVERNANCE: Environment variable AUTH_BCRYPT_COST for cost factor
 * GOVERNANCE: Environment variable AUTH_PASSWORD_PEPPER for pepper
 *
 * Phase 1 Implementation - Simplified and focused on core functionality
 */

import bcrypt from 'bcryptjs';

/**
 * Password validation result interface
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Password service implementation class
 * Implements password hashing, verification, and strength validation
 */
export class PasswordServiceImpl {
  private readonly bcryptCost: number;
  private readonly pepper: string;

  constructor() {
    // GOVERNANCE: Load from environment variables
    this.bcryptCost = parseInt(process.env.AUTH_BCRYPT_COST || '12', 10);
    this.pepper = process.env.AUTH_PASSWORD_PEPPER || process.env.PASSWORD_PEPPER || '';

    // Validate bcrypt cost
    if (this.bcryptCost < 4 || this.bcryptCost > 31) {
      throw new Error(`Invalid AUTH_BCRYPT_COST: ${this.bcryptCost}. Must be between 4 and 31.`);
    }

    if (!this.pepper) {
      throw new Error('AUTH_PASSWORD_PEPPER or PASSWORD_PEPPER environment variable is required');
    }
  }

  /**
   * Hash a password using bcrypt with pepper
   * GOVERNANCE: Pepper must be applied before hashing
   *
   * @param password - Plain text password to hash
   * @returns Promise resolving to hashed password string
   */
  async hash(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    try {
      const pepperedPassword = password + this.pepper;
      const hash = await bcrypt.hash(pepperedPassword, this.bcryptCost);
      return hash;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a password against a hash
   * GOVERNANCE: Apply pepper before verification
   *
   * @param password - Plain text password to verify
   * @param hash - Stored password hash
   * @returns Promise resolving to true if password matches, false otherwise
   */
  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || typeof password !== 'string') {
      return false;
    }

    if (!hash || typeof hash !== 'string') {
      return false;
    }

    try {
      const pepperedPassword = password + this.pepper;
      const isValid = await bcrypt.compare(pepperedPassword, hash);
      return isValid;
    } catch (error) {
      // Log error but don't throw - return false for invalid hashes
      return false;
    }
  }

  /**
   * Validate password strength
   * GOVERNANCE: BuildSpecs requirement - min 8 chars (updated to 12 per best practices)
   * GOVERNANCE: Additional rules per OWASP standards
   *
   * @param password - Password to validate
   * @returns Validation result with errors if any
   */
  validateStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    // Minimum length check (12 characters per security best practices)
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters');
    }

    // Maximum length check (prevent DOS attacks)
    if (password.length > 128) {
      errors.push('Password must be at most 128 characters');
    }

    // Uppercase letter check
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Lowercase letter check
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get current bcrypt cost factor
   * Useful for determining if password needs rehashing
   *
   * @returns Current bcrypt cost factor
   */
  getBcryptCost(): number {
    return this.bcryptCost;
  }

  /**
   * Check if a hash needs rehashing (cost factor changed)
   *
   * @param hash - Stored password hash
   * @returns True if hash needs to be regenerated with new cost
   */
  needsRehash(hash: string): boolean {
    try {
      // Extract cost from bcrypt hash (format: $2a$10$... or $2b$12$...)
      const parts = hash.split('$');
      if (parts.length < 4 || !parts[1]?.match(/^2[ab]$/)) {
        return true; // Invalid format, needs rehashing
      }

      const storedCost = parseInt(parts[2] || '0', 10);
      return storedCost < this.bcryptCost;
    } catch (error) {
      return true; // Error parsing, assume needs rehashing
    }
  }
}

/**
 * Singleton instance for application-wide use
 * GOVERNANCE: Singleton pattern for service reuse
 */
let passwordServiceInstance: PasswordServiceImpl | null = null;

/**
 * Get PasswordServiceImpl singleton instance
 *
 * @returns Shared PasswordServiceImpl instance
 */
export function getPasswordService(): PasswordServiceImpl {
  if (!passwordServiceInstance) {
    passwordServiceInstance = new PasswordServiceImpl();
  }
  return passwordServiceInstance;
}

/**
 * Default export for convenience
 */
export default PasswordServiceImpl;
