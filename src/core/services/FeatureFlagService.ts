/**
 * FeatureFlagService - Feature Flag & Toggle Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - In-memory caching with TTL for performance
 * - A/B testing with rollout percentage
 * - Tier-based and user-based targeting
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority PHASE_6.1_BRAIN_PLAN.md - Feature Flags System Specification
 * @phase Phase 6.1 - Feature Flags & Toggles
 * @complexity STANDARD tier (~400 lines, ≤4 dependencies)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { FeatureFlagRow } from '@core/types/db-rows';
import { ErrorTrackingService, ErrorSeverity } from '@core/services/ErrorTrackingService';
import { getErrorMessage, getErrorStack } from '@core/errors/errorTransform';

// ============================================================================
// TypeScript Interfaces & Enums
// ============================================================================

export enum Environment {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development'
}

export interface FeatureFlag {
  id: number;
  flag_key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  target_tiers: string[] | null;
  target_user_ids: number[] | null;
  environment: Environment;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFeatureFlagInput {
  flag_key: string;
  name: string;
  description?: string;
  is_enabled?: boolean;
  rollout_percentage?: number;
  target_tiers?: string[];
  target_user_ids?: number[];
  environment?: Environment;
}

export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string;
  is_enabled?: boolean;
  rollout_percentage?: number;
  target_tiers?: string[];
  target_user_ids?: number[];
  environment?: Environment;
}

export interface FlagEvaluationContext {
  userId?: number;
  tier?: string;
  environment?: Environment;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class FlagNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'FLAG_NOT_FOUND',
      message: `Feature flag not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested feature flag was not found'
    });
  }
}

export class DuplicateFlagError extends BizError {
  constructor(flagKey: string) {
    super({
      code: 'DUPLICATE_FLAG',
      message: `Feature flag already exists: ${flagKey}`,
      context: { flagKey },
      userMessage: 'A feature flag with this key already exists'
    });
  }
}

export class InvalidRolloutPercentageError extends BizError {
  constructor(percentage: number) {
    super({
      code: 'INVALID_ROLLOUT_PERCENTAGE',
      message: `Invalid rollout percentage: ${percentage}. Must be 0-100`,
      context: { percentage },
      userMessage: 'Rollout percentage must be between 0 and 100'
    });
  }
}

// ============================================================================
// FeatureFlagService Implementation
// ============================================================================

export class FeatureFlagService {
  private db: DatabaseService;
  private errorTracker: ErrorTrackingService;
  private cache: Map<string, { flag: FeatureFlag; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(db: DatabaseService) {
    this.db = db;
    this.errorTracker = new ErrorTrackingService(db);
    this.cache = new Map();
  }

  // ==========================================================================
  // FLAG EVALUATION (Public API)
  // ==========================================================================

  /**
   * Check if a feature flag is enabled for given context
   *
   * @param flagKey Feature flag key
   * @param context Evaluation context (user ID, tier, environment)
   * @returns True if feature is enabled, false otherwise
   *
   * @example
   * ```typescript
   * const enabled = await featureFlagService.isFeatureEnabled('premium_dark_mode', {
   *   userId: 123,
   *   tier: 'premium'
   * });
   * ```
   */
  async isFeatureEnabled(
    flagKey: string,
    context: FlagEvaluationContext = {}
  ): Promise<boolean> {
    try {
      const flag = await this.getFlagByName(flagKey);

      if (!flag) {
        return false; // Unknown flags are disabled by default
      }

      // Check if flag is globally disabled
      if (!flag.is_enabled) {
        return false;
      }

      // Check environment match (if provided)
      if (context.environment && flag.environment !== context.environment) {
        return false;
      }

      // Check tier targeting (if specified)
      if (flag.target_tiers && flag.target_tiers.length > 0) {
        if (!context.tier || !flag.target_tiers.includes(context.tier)) {
          return false;
        }
      }

      // Check user targeting (if specified)
      if (flag.target_user_ids && flag.target_user_ids.length > 0) {
        if (!context.userId || !flag.target_user_ids.includes(context.userId)) {
          return false;
        }
      }

      // Check rollout percentage (A/B testing)
      if (flag.rollout_percentage < 100) {
        return this.shouldEnableForUser(flagKey, context.userId || 0, flag.rollout_percentage);
      }

      return true;
    } catch (error: unknown) {
      // Fail closed: if evaluation fails, disable feature
      // Log error with ErrorTrackingService for monitoring
      await this.errorTracker.logError({
        errorType: 'FEATURE_FLAG_EVALUATION_ERROR',
        errorMessage: `Feature flag evaluation failed for ${flagKey}: ${getErrorMessage(error)}`,
        stackTrace: getErrorStack(error),
        severity: ErrorSeverity.MEDIUM,
        metadata: {
          flagKey,
          operation: 'isFeatureEnabled',
          service: 'FeatureFlagService'
        }
      });
      return false;
    }
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Get all feature flags
   * @returns Array of all flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const result: DbResult<FeatureFlagRow> = await this.db.query(
      'SELECT * FROM feature_flags ORDER BY flag_key'
    );

    return result.rows.map(this.mapRowToFeatureFlag);
  }

  /**
   * Get feature flag by ID
   * @param id Flag ID
   * @returns Flag or null if not found
   */
  async getFlagById(id: number): Promise<FeatureFlag | null> {
    const result: DbResult<FeatureFlagRow> = await this.db.query(
      'SELECT * FROM feature_flags WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToFeatureFlag(row);
  }

  /**
   * Get feature flag by key name (with caching)
   * @param flagKey Flag key
   * @returns Flag or null if not found
   */
  async getFlagByName(flagKey: string): Promise<FeatureFlag | null> {
    // Check cache first
    const cached = this.cache.get(flagKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.flag;
    }

    const result: DbResult<FeatureFlagRow> = await this.db.query(
      'SELECT * FROM feature_flags WHERE flag_key = ?',
      [flagKey]
    );

    const row = result.rows[0];
    if (!row) return null;

    const flag = this.mapRowToFeatureFlag(row);

    // Update cache
    this.cache.set(flagKey, { flag, timestamp: Date.now() });

    return flag;
  }

  /**
   * Create a new feature flag
   * @param data Flag data
   * @returns Created flag
   */
  async createFlag(data: CreateFeatureFlagInput): Promise<FeatureFlag> {
    // Validate rollout percentage
    const rolloutPercentage = data.rollout_percentage ?? 0;
    if (rolloutPercentage < 0 || rolloutPercentage > 100) {
      throw new InvalidRolloutPercentageError(rolloutPercentage);
    }

    // Check for duplicate
    const existing = await this.getFlagByName(data.flag_key);
    if (existing) {
      throw new DuplicateFlagError(data.flag_key);
    }

    // Prepare JSON fields
    const targetTiers = data.target_tiers ? JSON.stringify(data.target_tiers) : null;
    const targetUserIds = data.target_user_ids ? JSON.stringify(data.target_user_ids) : null;

    const result: DbResult<FeatureFlagRow> = await this.db.query(
      `INSERT INTO feature_flags (
        flag_key, name, description, is_enabled, rollout_percentage,
        target_tiers, target_user_ids, environment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.flag_key,
        data.name,
        data.description || null,
        data.is_enabled ?? false,
        rolloutPercentage,
        targetTiers,
        targetUserIds,
        data.environment || Environment.PRODUCTION
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create feature flag',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getFlagById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create feature flag',
        new Error('Failed to retrieve created flag')
      );
    }

    // Invalidate cache
    this.clearCache();

    return created;
  }

  /**
   * Update a feature flag
   * @param id Flag ID
   * @param data Update data
   * @returns Updated flag
   */
  async updateFlag(id: number, data: UpdateFeatureFlagInput): Promise<FeatureFlag> {
    const existing = await this.getFlagById(id);
    if (!existing) {
      throw new FlagNotFoundError(id);
    }

    // Validate rollout percentage if provided
    if (data.rollout_percentage !== undefined) {
      if (data.rollout_percentage < 0 || data.rollout_percentage > 100) {
        throw new InvalidRolloutPercentageError(data.rollout_percentage);
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.is_enabled !== undefined) {
      updates.push('is_enabled = ?');
      values.push(data.is_enabled);
    }
    if (data.rollout_percentage !== undefined) {
      updates.push('rollout_percentage = ?');
      values.push(data.rollout_percentage);
    }
    if (data.target_tiers !== undefined) {
      updates.push('target_tiers = ?');
      values.push(data.target_tiers ? JSON.stringify(data.target_tiers) : null);
    }
    if (data.target_user_ids !== undefined) {
      updates.push('target_user_ids = ?');
      values.push(data.target_user_ids ? JSON.stringify(data.target_user_ids) : null);
    }
    if (data.environment !== undefined) {
      updates.push('environment = ?');
      values.push(data.environment);
    }

    if (updates.length === 0) {
      return existing; // No changes
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    await this.db.query(
      `UPDATE feature_flags SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.getFlagById(id);
    if (!updated) {
      throw BizError.databaseError(
        'update feature flag',
        new Error('Failed to retrieve updated flag')
      );
    }

    // Invalidate cache
    this.clearCache();

    return updated;
  }

  /**
   * Delete a feature flag
   * @param id Flag ID
   */
  async deleteFlag(id: number): Promise<void> {
    const existing = await this.getFlagById(id);
    if (!existing) {
      throw new FlagNotFoundError(id);
    }

    await this.db.query('DELETE FROM feature_flags WHERE id = ?', [id]);

    // Invalidate cache
    this.clearCache();
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Clear all cached flags
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Map database row to FeatureFlag interface
   */
  private mapRowToFeatureFlag(row: FeatureFlagRow): FeatureFlag {
    return {
      id: row.id,
      flag_key: row.flag_key,
      name: row.name,
      description: row.description,
      is_enabled: Boolean(row.is_enabled),
      rollout_percentage: row.rollout_percentage,
      target_tiers: row.target_tiers ? JSON.parse(row.target_tiers) : null,
      target_user_ids: row.target_user_ids ? JSON.parse(row.target_user_ids) : null,
      environment: row.environment as Environment,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Deterministic A/B test assignment based on user ID and flag key
   * Ensures consistent experience for each user
   *
   * @param flagKey Feature flag key
   * @param userId User ID
   * @param percentage Rollout percentage (0-100)
   * @returns True if user is in rollout group
   */
  private shouldEnableForUser(flagKey: string, userId: number, percentage: number): boolean {
    // Simple hash function: combine flag key and user ID
    const hash = this.simpleHash(`${flagKey}:${userId}`);
    const bucket = hash % 100; // 0-99

    return bucket < percentage;
  }

  /**
   * Simple string hash function for A/B testing
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
