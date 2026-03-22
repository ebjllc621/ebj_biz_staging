/**
 * Secrets Validation Module
 *
 * Validates required secrets at application startup.
 * Fails fast if critical secrets are missing or use default values.
 *
 * @architecture Startup validation pattern
 * @authority Phase 4 Security Hardening - docs/auth/newday2ndRemediation/04-security-hardening.md
 * @governance CLAUDE.md Security Standards
 */

export interface SecretsValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface SecretConfig {
  name: string;
  envVar: string;
  required: boolean;
  minLength?: number;
  forbiddenValues?: string[];
  description: string;
}

/**
 * Required secrets configuration
 *
 * @security These secrets are critical for application security
 */
const REQUIRED_SECRETS: SecretConfig[] = [
  {
    name: 'Session Secret',
    envVar: 'SESSION_SECRET',
    required: true,
    minLength: 32,
    forbiddenValues: ['change_me', 'your-secret-here', 'default', 'secret', 'GENERATE_SECURE_SECRET_HERE'],
    description: 'Used for session token signing'
  },
  {
    name: 'Password Pepper',
    envVar: 'PASSWORD_PEPPER',
    required: true,
    minLength: 16,
    forbiddenValues: ['change_me', 'your-secret-here', 'default', 'pepper', 'your-secret-pepper-here', 'GENERATE_SECURE_SECRET_HERE'],
    description: 'Additional layer for password hashing'
  },
  {
    name: 'Auth Secret',
    envVar: 'AUTH_SECRET',
    required: true,
    minLength: 32,
    forbiddenValues: ['change_me', 'your-secret-here', 'default', 'default-secret', 'GENERATE_SECURE_SECRET_HERE'],
    description: 'Used for MFA encryption and token signing'
  },
  {
    name: 'Action Link Secret',
    envVar: 'ACTION_LINK_SECRET',
    required: true,
    minLength: 32,
    forbiddenValues: ['change_me', 'your-secret-here', 'default', 'GENERATE_SECURE_SECRET_HERE'],
    description: 'Used for verification/reset link HMAC'
  },
  {
    name: 'CSRF Secret',
    envVar: 'CSRF_SECRET',
    required: false, // Optional - falls back to random per-instance
    minLength: 32,
    forbiddenValues: ['change_me', 'your-secret-here', 'default', 'GENERATE_SECURE_SECRET_HERE'],
    description: 'Used for CSRF token generation'
  },
  {
    name: 'IP Hash Salt',
    envVar: 'IP_HASH_SALT',
    required: false, // Optional - has internal fallback
    minLength: 16,
    forbiddenValues: ['default-salt', 'GENERATE_SECURE_SECRET_HERE'],
    description: 'Used for PII-compliant IP hashing'
  }
];

/**
 * Validate all required secrets
 *
 * @param failOnError If true, throws error on validation failure in production
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateSecrets(process.env.NODE_ENV === 'production');
 * if (!result.valid && process.env.NODE_ENV === 'production') {
 *   throw new Error('Cannot start with invalid secrets');
 * }
 * ```
 */
export function validateSecrets(failOnError: boolean = true): SecretsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const secret of REQUIRED_SECRETS) {
    const value = process.env[secret.envVar];

    // Check if required secret exists
    if (secret.required && !value) {
      errors.push(`Missing required secret: ${secret.name} (${secret.envVar}) - ${secret.description}`);
      continue;
    }

    // Check for non-required but missing
    if (!secret.required && !value) {
      warnings.push(`Optional secret not set: ${secret.name} (${secret.envVar}) - using fallback`);
      continue;
    }

    if (value) {
      // Check minimum length
      if (secret.minLength && value.length < secret.minLength) {
        errors.push(
          `${secret.name} (${secret.envVar}) is too short: ` +
          `${value.length} chars, minimum ${secret.minLength} required`
        );
      }

      // Check for forbidden values (default/placeholder values)
      if (secret.forbiddenValues?.some(forbidden =>
        value.toLowerCase() === forbidden.toLowerCase()
      )) {
        errors.push(
          `${secret.name} (${secret.envVar}) uses a forbidden default value. ` +
          `Please set a secure, unique value.`
        );
      }
    }
  }

  const result: SecretsValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings
  };

  // Log results
  // Console logging removed - warnings/errors available in return object

  if (errors.length > 0 && failOnError && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Secrets validation failed with ${errors.length} error(s). ` +
      `Application cannot start in production with invalid secrets.`
    );
  }

  return result;
}

/**
 * Check if running in development mode (more lenient validation)
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Generate a secure random secret (for development/setup)
 *
 * @param length Number of bytes to generate (default 64)
 * @returns Base64URL encoded random string
 *
 * @example
 * ```bash
 * # Or use command line:
 * node -e "require('crypto').randomBytes(64).toString('base64url')"
 * ```
 */
export function generateSecureSecret(length: number = 64): string {
  // Use dynamic import pattern for Node.js crypto module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cryptoModule = require('node:crypto') as typeof import('crypto');
  return cryptoModule.randomBytes(length).toString('base64url');
}

/**
 * Get secrets summary for health check (without exposing values)
 *
 * @returns Summary of secrets validation status
 */
export function getSecretsSummary(): {
  configured: string[];
  missing: string[];
  warnings: string[];
} {
  const configured: string[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const secret of REQUIRED_SECRETS) {
    const value = process.env[secret.envVar];

    if (!value) {
      if (secret.required) {
        missing.push(secret.envVar);
      } else {
        warnings.push(`${secret.envVar} (optional, using fallback)`);
      }
    } else {
      configured.push(secret.envVar);
    }
  }

  return { configured, missing, warnings };
}