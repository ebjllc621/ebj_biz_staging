/**
 * ActivityLoggingService - Centralized User Activity Logging
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @pattern Build Map v2.1 ENHANCED - Service Architecture v2.0
 * @tier STANDARD
 * @generated DNA v11.0.1 - Phase 7.1
 * @dna-version 11.0.1
 *
 * PURPOSE:
 * - Centralizes all activity logging to user_log table
 * - Non-blocking design (failures don't interrupt main flow)
 * - PII-compliant (hashed IP, coarse location only)
 * - Supports all auth event types
 *
 * USAGE:
 * ```typescript
 * import { ActivityLoggingService, getActivityLoggingService } from '@core/services/ActivityLoggingService';
 *
 * const activityService = getActivityLoggingService();
 * await activityService.logActivity({
 *   userId: 123,
 *   action: 'login',
 *   actionType: 'auth',
 *   description: 'User logged in successfully',
 *   hashedIP: 'sha256:abc123...',
 *   success: true
 * });
 * ```
 *
 * GOVERNANCE:
 * - MUST use DatabaseService.query() for all database operations
 * - MUST NOT throw errors that block calling code
 * - MUST use hashedIP instead of raw IP addresses
 * - MUST NOT store PII directly (email only in metadata, hashed)
 */

import { DatabaseService, getDatabaseService, DatabaseServiceConfig } from '@core/services/DatabaseService';
import { DbConfig } from '@core/types/db';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Activity action types for type safety
 */
export type ActivityActionType =
  | 'auth'           // login, logout, session events
  | 'registration'   // register, auto_login
  | 'verification'   // email verify, resend
  | 'password'       // reset, change
  | 'mfa'            // setup, challenge, recovery
  | 'account'        // suspend, upgrade, profile update
  | 'session';       // create, validate, expire, revoke

/**
 * Activity log input interface
 * All fields except action, actionType, description are optional
 */
export interface ActivityLogInput {
  // Required fields
  action: string;               // e.g., 'login', 'register', 'logout'
  actionType: ActivityActionType;
  description: string;          // Human-readable description

  // User identification (nullable for anonymous events like failed login)
  userId?: number | string | null;

  // Entity reference (optional)
  entityType?: string;          // e.g., 'session', 'user', 'listing'
  entityId?: string;            // ID of affected entity
  entityName?: string;          // Name of affected entity

  // Request context (PII-compliant)
  hashedIP?: string;            // MUST be hashed, not raw IP
  userAgent?: string;
  browserInfo?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | string;
  location?: string;            // COARSE location only (city, region)
  referrer?: string;

  // Session correlation
  sessionId?: string;

  // Performance tracking
  duration?: number;            // Duration in milliseconds

  // Result tracking
  success?: boolean;            // true=success, false=failure
  errorMessage?: string;        // Error details if success=false

  // Additional data (JSON serialized)
  metadata?: Record<string, unknown>;
}

/**
 * Convenience interface for auth-specific logging
 */
export interface AuthEventInput {
  userId?: number | string | null;
  success?: boolean;
  hashedIP?: string;
  userAgent?: string;
  location?: string;
  sessionId?: string;
  duration?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ActivityLoggingService Implementation
// ============================================================================

/**
 * ActivityLoggingService Configuration
 */
export interface ActivityLoggingServiceConfig {
  // Can accept DatabaseService or DbConfig (DatabaseService for shared pool, DbConfig for testing)
  database: DbConfig | import('./DatabaseService').DatabaseService;
}

/**
 * ActivityLoggingService - Non-blocking activity logger
 *
 * Extends DatabaseService for database access.
 * All logging operations are wrapped in try-catch to prevent
 * failures from interrupting the main application flow.
 */
export class ActivityLoggingService extends DatabaseService {
  constructor(config: ActivityLoggingServiceConfig) {
    // Extract DbConfig from DatabaseService or use directly
    const dbConfig = 'host' in config.database
      ? config.database
      : config.database as any; // DatabaseService case - will be handled by parent

    super({
      database: dbConfig as DbConfig,
      name: 'ActivityLoggingService',
      version: '1.0.0'
    });

    this.logger.info('ActivityLoggingService constructed', {
      operation: 'constructor',
      metadata: {}
    });
  }

  /**
   * Log activity to user_log table
   *
   * NON-BLOCKING: Catches and logs errors but does not throw.
   * The main application flow should never be interrupted by logging failures.
   *
   * @param input - Activity log input
   */
  async logActivity(input: ActivityLogInput): Promise<void> {
    try {
      // Convert userId to number if string
      const userIdNum = input.userId
        ? typeof input.userId === 'string'
          ? parseInt(input.userId, 10)
          : input.userId
        : null;

      // Validate userId is valid number or null
      const validUserId = userIdNum && !isNaN(userIdNum) ? userIdNum : null;

      await this.query(
        `INSERT INTO user_log (
          user_id, action, action_type, description,
          entity_type, entity_id, entity_name,
          ip_address, user_agent, browser_info, device_type,
          location, referrer, session_id, duration,
          success, error_message, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          validUserId,
          input.action,
          input.actionType,
          input.description,
          input.entityType || null,
          input.entityId || null,
          input.entityName || null,
          input.hashedIP || null,       // MUST be hashed, not raw IP
          input.userAgent || null,
          input.browserInfo || null,
          input.deviceType || null,
          input.location || null,        // COARSE location only
          input.referrer || null,
          input.sessionId || null,
          input.duration || null,
          input.success !== false ? 1 : 0,  // Default to success
          input.errorMessage || null,
          input.metadata ? JSON.stringify(input.metadata) : null
        ]
      );

      this.logger.debug('Activity logged successfully', {
        operation: 'logActivity',
        metadata: {
          action: input.action,
          actionType: input.actionType,
          userId: validUserId,
          success: input.success !== false
        }
      });
    } catch (error) {
      // NON-BLOCKING: Log error but do not throw
      this.logger.error('Failed to log activity', error as Error, {
        operation: 'logActivity',
        metadata: {
          action: input.action,
          actionType: input.actionType,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      // Intentionally NOT re-throwing - logging should never block main flow
    }
  }

  /**
   * Log authentication event (convenience method)
   *
   * Simplified interface for common auth events like login, logout, register.
   *
   * @param action - Auth action (e.g., 'login', 'logout', 'register')
   * @param data - Event data
   */
  async logAuthEvent(action: string, data: AuthEventInput): Promise<void> {
    await this.logActivity({
      userId: data.userId,
      action,
      actionType: 'auth',
      description: this.generateAuthDescription(action, data),
      hashedIP: data.hashedIP,
      userAgent: data.userAgent,
      location: data.location,
      sessionId: data.sessionId,
      duration: data.duration,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      metadata: data.metadata
    });
  }

  /**
   * Log registration event
   */
  async logRegistrationEvent(action: string, data: AuthEventInput): Promise<void> {
    await this.logActivity({
      userId: data.userId,
      action,
      actionType: 'registration',
      description: this.generateAuthDescription(action, data),
      hashedIP: data.hashedIP,
      userAgent: data.userAgent,
      location: data.location,
      sessionId: data.sessionId,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      metadata: data.metadata
    });
  }

  /**
   * Log email verification event
   */
  async logVerificationEvent(action: string, data: AuthEventInput): Promise<void> {
    await this.logActivity({
      userId: data.userId,
      action,
      actionType: 'verification',
      description: this.generateAuthDescription(action, data),
      hashedIP: data.hashedIP,
      userAgent: data.userAgent,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      metadata: data.metadata
    });
  }

  /**
   * Log password-related event
   */
  async logPasswordEvent(action: string, data: AuthEventInput): Promise<void> {
    await this.logActivity({
      userId: data.userId,
      action,
      actionType: 'password',
      description: this.generateAuthDescription(action, data),
      hashedIP: data.hashedIP,
      userAgent: data.userAgent,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      metadata: data.metadata
    });
  }

  /**
   * Log session event
   */
  async logSessionEvent(
    action: string,
    data: AuthEventInput & { sessionId?: string }
  ): Promise<void> {
    await this.logActivity({
      userId: data.userId,
      action,
      actionType: 'session',
      description: this.generateAuthDescription(action, data),
      entityType: 'session',
      entityId: data.sessionId,
      sessionId: data.sessionId,
      hashedIP: data.hashedIP,
      userAgent: data.userAgent,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      metadata: data.metadata
    });
  }

  /**
   * Generate human-readable description for auth events
   */
  private generateAuthDescription(
    action: string,
    data: AuthEventInput
  ): string {
    const success = data.success !== false;

    switch (action) {
      case 'login':
        return success
          ? 'User logged in successfully'
          : `Login failed: ${data.errorMessage || 'Invalid credentials'}`;
      case 'login_failed':
        return `Login attempt failed: ${data.errorMessage || 'Invalid credentials'}`;
      case 'logout':
        return 'User logged out';
      case 'register':
        return success
          ? 'New user account created'
          : `Registration failed: ${data.errorMessage || 'Unknown error'}`;
      case 'register_failed':
        return `Registration failed: ${data.errorMessage || 'Unknown error'}`;
      case 'auto_login':
        return 'User auto-logged in after registration';
      case 'session_validated':
        return 'Session validated successfully';
      case 'session_expired':
        return 'Session expired';
      case 'session_revoked':
        return `Session revoked: ${data.errorMessage || 'Unknown reason'}`;
      case 'email_verify_success':
        return 'Email verified successfully';
      case 'email_verify_failed':
        return `Email verification failed: ${data.errorMessage || 'Invalid token'}`;
      case 'email_verify_requested':
        return 'Email verification requested';
      case 'password_reset_requested':
        return 'Password reset requested';
      case 'password_reset_success':
        return 'Password reset successfully';
      case 'password_changed':
        return 'Password changed';
      default:
        return `${action}: ${success ? 'completed' : 'failed'}`;
    }
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

/**
 * Singleton instance
 */
let activityLoggingServiceInstance: ActivityLoggingService | null = null;

/**
 * Get ActivityLoggingService singleton
 *
 * Uses the same database configuration as DatabaseService singleton.
 * Ensures consistent database access across the application.
 *
 * @returns ActivityLoggingService singleton instance
 */
export function getActivityLoggingService(): ActivityLoggingService {
  if (!activityLoggingServiceInstance) {
    activityLoggingServiceInstance = new ActivityLoggingService({
      database: getDatabaseService()
    });
  }

  return activityLoggingServiceInstance;
}

/**
 * Reset singleton (for testing only)
 */
export function resetActivityLoggingService(): void {
  if (process.env.NODE_ENV !== 'production') {
    activityLoggingServiceInstance = null;
  }
}
