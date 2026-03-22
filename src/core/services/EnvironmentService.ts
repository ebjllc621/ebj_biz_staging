/**
 * EnvironmentService - Environment Detection & Validation
 *
 * GOVERNANCE COMPLIANCE:
 * - No database access required (environment-based)
 * - Validation logic for environment variables
 * - Build Map v2.1 ENHANCED patterns
 * - Tier: SIMPLE
 *
 * Features:
 * - Environment detection (development, staging, production)
 * - Environment variable validation
 * - Feature flag integration
 * - Security level detection
 *
 * @authority PHASE_6.4_BRAIN_PLAN.md - Section 3.1
 * @phase Phase 6.4 - Production Deployment
 * @complexity SIMPLE tier
 */

export class EnvironmentService {
  private env: NodeJS.ProcessEnv;

  constructor() {
    this.env = process.env;
  }

  /**
   * Get current environment
   * @returns Environment name
   *
   * @example
   * ```typescript
   * const envService = new EnvironmentService();
   * const env = envService.getEnvironment(); // 'production'
   * ```
   */
  getEnvironment(): 'development' | 'staging' | 'production' {
    const env = this.env.NODE_ENV?.toLowerCase();

    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Check if running in production
   * @returns Boolean
   *
   * @example
   * ```typescript
   * if (envService.isProduction()) {
   *   // Apply production-specific security
   * }
   * ```
   */
  isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  /**
   * Check if running in development
   * @returns Boolean
   *
   * @example
   * ```typescript
   * if (envService.isDevelopment()) {
   *   
   * }
   * ```
   */
  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  /**
   * Validate required environment variables
   * @throws Error if required variables missing
   *
   * @example
   * ```typescript
   * try {
   *   envService.validateEnvironment();
   * } catch (error) {
   *   
   * }
   * ```
   */
  validateEnvironment(): void {
    const required: string[] = [
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'SESSION_SECRET',
      'NEXT_PUBLIC_BASE_URL'
    ];

    const missing = required.filter(key => !this.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please check your .env file.`
      );
    }

    // Production-specific validation
    if (this.isProduction()) {
      const productionRequired = [
        'CSRF_SECRET',
        'RATE_LIMIT_MAX_REQUESTS',
        'BACKUP_ENABLED'
      ];

      const missingProduction = productionRequired.filter(key => !this.env[key]);

      if (missingProduction.length > 0) {
        
      }
    }
  }

  /**
   * Get environment variable with default
   * @param key - Environment variable key
   * @param defaultValue - Default value if not set
   * @returns Environment variable value
   *
   * @example
   * ```typescript
   * const dbHost = envService.get('DB_HOST', 'localhost');
   * ```
   */
  get(key: string, defaultValue?: string): string {
    return this.env[key] || defaultValue || '';
  }

  /**
   * Get boolean environment variable
   * @param key - Environment variable key
   * @param defaultValue - Default value
   * @returns Boolean value
   *
   * @example
   * ```typescript
   * const backupEnabled = envService.getBoolean('BACKUP_ENABLED', false);
   * ```
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.env[key]?.toLowerCase();
    if (!value) return defaultValue;
    return value === 'true' || value === '1' || value === 'yes';
  }
}
