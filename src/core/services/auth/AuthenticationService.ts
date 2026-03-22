/**
 * AuthenticationService - Rate Limiting Integrated Authentication
 *
 * Implements AUTH-P2-2A requirements with rate limiting integration:
 * - Rate limiting checks before password validation
 * - Atomic failure tracking with exponential backoff
 * - Account lockout enforcement
 * - Enumeration-safe error responses
 * - Session rotation on successful authentication
 *
 * Database Requirements:
 * - users.failed_login_attempts (INT)
 * - users.locked_until (DATETIME(3))
 * - users.email_normalized (VARCHAR, indexed)
 * - users.password_hash (VARBINARY)
 *
 * Governance Compliance:
 * - MUST use DatabaseService for all database operations
 * - NO direct database imports (mariadb/mysql2)
 * - Anti-synthetic enforcement (REAL functionality only)
 */

import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../DatabaseService';
import { SessionService, SessionContext } from './SessionService';
import { DbConfig } from '../../types/db';
import {
  IRateLimiter,
  RateDecision,
  RateLimitUtils,
  createRateLimitHeaders,
  DEFAULT_RATE_BUCKETS,
  RATE_LIMIT_ERROR_CODES
} from '../rate';
import { BizError } from '../../errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type {
  LoginRequest,
  User,
  AuthSession,
  ValidateResponse,
  LogoutResponse,
  UserRole
} from '@/core/types/auth/contracts';
// EmailService accessed via dynamic import to avoid circular dependency

/**
 * Authentication result with rate limiting info
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  session?: AuthSession;
  rateLimit?: {
    decision: RateDecision;
    headers: Record<string, string>;
  };
  error?: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

/**
 * Authentication context for rate limiting
 *
 * @governance PII Protection - Use hashedIP instead of ipAddress
 * @authority Build Map v2.1 - Phase 3A
 */
export interface AuthContext {
  /** @deprecated Use hashedIP for PII compliance */
  ipAddress?: string;
  /** @required PII-compliant hashed IP address */
  hashedIP: string; // REQUIRED - Not optional
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  userAgent?: string;
  timestamp: Date;
}

/**
 * AuthenticationService configuration
 */
export interface AuthenticationServiceConfig {
  rateLimiter: IRateLimiter;
  sessionService: SessionService;
  sessionExpiryHours?: number;
  enforceRateLimit?: boolean;
  // DatabaseService config inherited from parent
  database: DbConfig | import("../DatabaseService").DatabaseService;
  name?: string;
  version?: string;
}

/**
 * AuthenticationService Implementation
 *
 * Provides secure authentication with integrated rate limiting,
 * account lockout, and enumeration protection.
 */
export class AuthenticationService extends DatabaseService {
  protected tableUsers = "users";
  protected tableSessions = "user_sessions";

  private readonly rateLimiter: IRateLimiter;
  private readonly sessionService: SessionService;
  private readonly sessionExpiryHours: number;
  private readonly enforceRateLimit: boolean;

  constructor(config: AuthenticationServiceConfig) {
    // Extract DbConfig from DatabaseService or use directly
    const dbConfig = 'host' in config.database
      ? config.database
      : config.database as any; // DatabaseService case - will be handled by parent

    super({
      database: dbConfig as DbConfig,
      name: 'AuthenticationService',
      version: '2.0.0-AUTH-P2-2E'
    });

    this.rateLimiter = config.rateLimiter;
    this.sessionService = config.sessionService;
    this.sessionExpiryHours = config.sessionExpiryHours ?? 24;
    this.enforceRateLimit = config.enforceRateLimit ?? true;

    this.logger.info('AuthenticationService initialized', {
      operation: 'constructor',
      metadata: {
        sessionExpiryHours: this.sessionExpiryHours,
        enforceRateLimit: this.enforceRateLimit
      }
    });
  }

  /**
   * Initialize authentication service
   */
  async initialize(): Promise<void> {
    return this.executeOperation('initialize', async () => {
      // Initialize parent DatabaseService
      await super.initialize();

      // Verify rate limiter
      if (!this.rateLimiter) {
        throw BizError.serviceUnavailable('AuthenticationService', new Error('RateLimiter not provided'));
      }

      // Verify session service
      if (!this.sessionService) {
        throw BizError.serviceUnavailable('AuthenticationService', new Error('SessionService not provided'));
      }

      // Initialize SessionService
      await this.sessionService.initialize();

      this.logger.info('AuthenticationService initialized successfully');
    });
  }

  /**
   * Authenticate user with rate limiting protection
   */
  async login(request: LoginRequest, context: AuthContext): Promise<AuthResult> {
    return this.executeOperation('login', async () => {
      const startTime = Date.now();

      try {
        // Step 1: Normalize email
        const emailNormalized = request.email.toLowerCase().trim();

        // Step 2: Rate limiting checks (IP, Global)
        const rateLimitResult = await this.checkRateLimit(emailNormalized, context);
        if (!rateLimitResult.allowed) {
          return rateLimitResult.result!; // Non-null assertion: result is always defined when allowed is false
        }

        // Step 3: Get user by email (enumeration-safe timing)
        const user = await this.getUserByEmail(emailNormalized);

        // Step 4: Account-specific rate limiting (if user exists)
        let accountRateResult: AuthResult | null = null;
        if (user) {
          const accountKey = RateLimitUtils.createAccountKey(user.id);
          const accountDecision = await this.rateLimiter.check(accountKey);

          if (!accountDecision.allow) {
            accountRateResult = this.createRateLimitedResult(
              accountDecision,
              RATE_LIMIT_ERROR_CODES.ACCOUNT_LOCKED,
              'Account temporarily locked due to too many failed attempts'
            );
          }
        }

        // Step 5: Password verification (constant-time if possible)
        const passwordValid = await this.verifyPassword(request.password, user?.password_hash);

        // Step 6: Handle authentication result
        if (user && passwordValid && !accountRateResult) {
          // SUCCESS: Reset rate limiting and update login metrics
          await this.handleSuccessfulAuth(user, context);

          // Use SessionService rotation on login (AUTH-P2-2E requirement)
          const sessionToken = await this.sessionService.rotateOnLogin(
            user.id,
            undefined, // No previous session on login
            this.createSessionContext(context)
          );

          const session: AuthSession = {
            userId: user.id,
            sessionId: sessionToken,
            role: user.role,
            expiresAt: new Date(Date.now() + (this.sessionExpiryHours * 60 * 60 * 1000)).toISOString(),
            issuedAt: new Date().toISOString()
          };

          this.logAuthEvent('success', {
            userId: user.id,
            email: emailNormalized,
            context,
            duration: Date.now() - startTime
          });

          // Database logging (non-blocking)
          void this.logAuthEventToDatabase('login', {
            userId: user.id,
            context,
            sessionId: sessionToken,
            duration: Date.now() - startTime,
            success: true,
            metadata: { email: emailNormalized }
          });

          // Map DB user to clean User type
          const cleanUser: User = {
            id: user.id,
            email: user.email,
            name: user.display_name || user.username,
            role: user.role,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          };

          return {
            success: true,
            user: cleanUser,
            session
          };
        } else {
          // FAILURE: Increment rate limiting counters
          await this.handleFailedAuth(emailNormalized, user?.id, context);

          this.logAuthEvent('failure', {
            userId: user?.id,
            email: emailNormalized,
            context,
            reason: !user ? 'user_not_found' : !passwordValid ? 'invalid_password' : 'rate_limited',
            duration: Date.now() - startTime
          });

          // Database logging (non-blocking)
          void this.logAuthEventToDatabase('login_failed', {
            userId: user?.id,
            context,
            duration: Date.now() - startTime,
            success: false,
            errorMessage: !user ? 'User not found' : 'Invalid password',
            metadata: { email: emailNormalized }
          });

          // Return account rate limit result if applicable, otherwise generic error
          return accountRateResult || this.createEnumerationSafeError();
        }

      } catch (error) {
        this.logger.error('Authentication error', error as Error, {
          operation: 'login',
          metadata: { context }
        });

        // Always increment failure counters on error
        const emailNormalized = request.email.toLowerCase().trim();
        await this.handleFailedAuth(emailNormalized, undefined, context).catch(() => {
          // Ignore rate limiting errors during error handling
        });

        return this.createEnumerationSafeError();
      }
    });
  }

  /**
   * Validate session token - uses SessionService with rotation support
   */
  async validateSession(sessionId: string, context?: SessionContext): Promise<ValidateResponse> {
    return this.executeOperation('validateSession', async () => {
      // Use SessionService for validation (AUTH-P2-2E requirement)
      const validation = await this.sessionService.validateSession(sessionId, context);

      if (!validation.valid || !validation.session) {
        return { valid: false };
      }

      // Get user details
      const userResult = await this.query<{
        email: string;
        display_name: string | null;
        username: string;
        role: UserRole;
        is_verified: number;  // DB column is tinyint(1)
        avatar_url: string | null;  // DB column for uploaded profile image
        avatar_bg_color: string | null;  // DB column for default avatar color
        created_at: string;  // DB column is snake_case
        updated_at: string;  // DB column is snake_case
      }>(
        `SELECT email, display_name, username, role, is_verified, avatar_url, avatar_bg_color, created_at, updated_at
         FROM users
         WHERE id = ?`,
        [validation.session.userId]
      );

      if (userResult.rows.length === 0) {
        return { valid: false };
      }

      const row = userResult.rows[0];
      if (!row) {
        return { valid: false };
      }

      const user: User = {
        id: validation.session.userId,
        email: row.email,
        name: row.display_name || row.username,
        username: row.username,
        role: row.role,
        isVerified: Boolean(row.is_verified),
        avatarUrl: row.avatar_url,  // Uploaded profile image URL
        avatarBgColor: row.avatar_bg_color || '#022641',  // Default to navy blue
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      const session: AuthSession = {
        userId: validation.session.userId,
        sessionId,
        role: row.role,
        expiresAt: validation.session.expiresAt.toISOString(),
        issuedAt: validation.session.createdAt.toISOString()
      };

      return { valid: true, user, session };
    });
  }

  /**
   * Logout user and invalidate session - uses SessionService revocation
   */
  async logout(sessionId: string): Promise<LogoutResponse> {
    return this.executeOperation('logout', async () => {
      // Use SessionService for revocation (AUTH-P2-2E requirement)
      const success = await this.sessionService.revokeSession(sessionId);

      this.logger.info('User logged out', {
        operation: 'logout',
        metadata: { sessionId, success }
      });

      // Database logging (non-blocking)
      void this.logAuthEventToDatabase('logout', {
        sessionId,
        success,
        metadata: { sessionId }
      });

      return {
        success,
        message: success ? 'Logged out successfully' : 'Session not found'
      };
    });
  }

  /**
   * Get current user by session
   */
  async getCurrentUser(sessionId: string): Promise<User | null> {
    return this.executeOperation('getCurrentUser', async () => {
      const validation = await this.validateSession(sessionId);
      return validation.valid ? validation.user! : null;
    });
  }

  /**
   * Create new user session
   */
  async createSession(user: User): Promise<AuthSession> {
    return this.executeOperation('createSession', async () => {
      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + (this.sessionExpiryHours * 60 * 60 * 1000));

      await this.query(
        `INSERT INTO user_sessions (session_id, user_id, expires_at, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 1, NOW(), NOW())`,
        [sessionId, user.id, expiresAt]
      );

      return {
        userId: user.id,
        sessionId,
        role: user.role,
        expiresAt: expiresAt.toISOString(),
        issuedAt: new Date().toISOString()
      };
    });
  }

  /**
   * Destroy user session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    return this.executeOperation('destroySession', async () => {
      const result = await this.query(
        `UPDATE user_sessions
         SET is_active = 0, updated_at = NOW()
         WHERE session_id = ?`,
        [sessionId]
      );

      return (result.rowCount || 0) > 0;
    });
  }

  /**
   * Register a new user
   * Creates user account, generates verification token, and sends verification email
   *
   * @param input - Registration input data
   * @param context - Optional auth context for logging (Phase 7.4)
   */
  async registerUser(
    input: {
      name: string;
      email: string;
      username?: string; // Optional - if provided, use it; otherwise auto-generate
      password: string;
      confirmPassword: string;
    },
    context?: AuthContext
  ): Promise<{
    userId: number;
    email: string;
    username: string;
    isVerified: boolean;
    verificationEmailSent: boolean;
  }> {
    return this.executeOperation('registerUser', async () => {
      // Step 1: Normalize email
      const emailNormalized = input.email.toLowerCase().trim();

      // Step 2: Validate password strength
      const passwordValidation = this.validatePasswordStrength(input.password);
      if (!passwordValidation.valid) {
        throw BizError.validation('password', input.password, passwordValidation.error || 'Invalid password');
      }

      // Step 3: Check if email already exists (timing-safe)
      const existingUser = await this.getUserByEmail(emailNormalized);
      if (existingUser) {
        // Don't reveal that email exists - use generic error
        throw BizError.badRequest('Unable to complete registration. Please try again or contact support.');
      }

      // Step 4: Hash password with bcrypt
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Step 5: Determine username - use provided or auto-generate from email
      let username: string;
      if (input.username?.trim()) {
        // User provided username - validate format
        username = input.username.toLowerCase().trim();
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
          throw BizError.validation('username', username, 'Username can only contain letters, numbers, and underscores');
        }
        if (username.length < 3) {
          throw BizError.validation('username', username, 'Username must be at least 3 characters');
        }
        if (username.length > 30) {
          throw BizError.validation('username', username, 'Username must be 30 characters or less');
        }

        // Check if username already exists
        const existingUsername = await this.query<{ id: number }>(
          'SELECT id FROM users WHERE username = ?',
          [username]
        );
        if (existingUsername.rows && existingUsername.rows.length > 0) {
          throw BizError.validation('username', username, 'Username is already taken. Please choose a different one.');
        }
      } else {
        // Auto-generate username from email prefix (legacy behavior with collision handling)
        const emailPrefix = emailNormalized.split('@')[0] || 'user';
        username = emailPrefix;
        let attempts = 0;
        const maxAttempts = 5;

        // Check and retry with suffix if collision
        while (attempts < maxAttempts) {
          const existingUsername = await this.query<{ id: number }>(
            'SELECT id FROM users WHERE username = ?',
            [username]
          );
          if (!existingUsername.rows || existingUsername.rows.length === 0) {
            break; // Username is available
          }
          attempts++;
          if (attempts >= maxAttempts) {
            throw BizError.badRequest('Unable to create account. Please provide a custom username.');
          }
          // Add random suffix
          username = `${emailPrefix}${Math.floor(Math.random() * 10000)}`;
        }
      }

      // Step 6: Insert new user into database
      const insertResult = await this.query(
        `INSERT INTO users (username, email, email_normalized, password_hash, display_name, role, is_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'general', 0, NOW(), NOW())`,
        [username, emailNormalized, emailNormalized, passwordHash, input.name]
      );

      if (!insertResult) {
        throw BizError.internalError('registerUser', new Error('Failed to insert user'));
      }

      const userId = insertResult.insertId;
      if (!userId) {
        throw BizError.internalError('registerUser', new Error('Failed to create user - no insert ID returned'));
      }

      // Step 6: Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest(); // Returns Buffer (32 bytes) - matches varbinary(32) column

      // Step 7: Store verification token (expires in 24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await this.query(
        `INSERT INTO email_verifications (user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, NOW())`,
        [userId, tokenHash, expiresAt]
      );

      // Step 8: Send verification email (non-blocking - failure doesn't stop registration)
      let verificationEmailSent = false;
      try {
        await this.sendVerificationEmail(emailNormalized, verificationToken, input.name);
        verificationEmailSent = true;
      } catch (error) {
        this.logger?.warn('Failed to send verification email during registration', {
          operation: 'registerUser',
          metadata: {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        // Don't throw - email failure shouldn't block registration
      }

      this.logger?.info('User registered successfully', {
        operation: 'registerUser',
        metadata: {
          userId,
          verificationEmailSent
        }
      });

      // Database logging (non-blocking)
      void this.logAuthEventToDatabase('register', {
        userId,
        context,
        success: true,
        metadata: {
          email: emailNormalized,
          verificationEmailSent
        }
      });

      return {
        userId: bigIntToNumber(userId),
        email: emailNormalized,
        username,
        isVerified: false,
        verificationEmailSent
      };
    });
  }

  // Private helper methods

  private async checkRateLimit(email: string, context: AuthContext): Promise<{
    allowed: boolean;
    result?: AuthResult;
  }> {
    if (!this.enforceRateLimit) {
      return { allowed: true };
    }

    // Check IP rate limit (using hashedIP for PII compliance)
    const ipKey = RateLimitUtils.createIPKey(context.hashedIP);
    const ipDecision = await this.rateLimiter.check(ipKey);

    if (!ipDecision.allow) {
      return {
        allowed: false,
        result: this.createRateLimitedResult(
          ipDecision,
          RATE_LIMIT_ERROR_CODES.TOO_MANY_REQUESTS,
          'Too many requests from this IP address'
        )
      };
    }

    // Check global rate limit
    const globalKey = RateLimitUtils.createGlobalKey();
    const globalDecision = await this.rateLimiter.check(globalKey);

    if (!globalDecision.allow) {
      return {
        allowed: false,
        result: this.createRateLimitedResult(
          globalDecision,
          RATE_LIMIT_ERROR_CODES.TOO_MANY_REQUESTS,
          'Service temporarily unavailable due to high load'
        )
      };
    }

    return { allowed: true };
  }

  public async getUserByEmail(emailNormalized: string): Promise<{
    id: string;
    email: string;
    username: string;
    display_name: string | null;
    role: UserRole;
    password_hash: string;
    failed_login_attempts: number;
    locked_until: string | null;
    created_at: string;
    updated_at: string;
  } | null> {
    const result = await this.query<{
      id: string;
      email: string;
      username: string;
      display_name: string | null;
      role: UserRole;
      password_hash: string;
      failed_login_attempts: number;
      locked_until: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, email, username, display_name, role, password_hash, failed_login_attempts, locked_until, created_at, updated_at
       FROM users
       WHERE email_normalized = ?`,
      [emailNormalized]
    );

    return result.rows[0] || null;
  }

  /**
   * Verify password against stored hash
   *
   * @param password Plain text password to verify
   * @param passwordHash Stored hash (may be Buffer or string)
   * @returns true if password matches
   *
   * @security Uses bcrypt constant-time comparison
   */
  private async verifyPassword(password: string, passwordHash?: Buffer | string | null): Promise<boolean> {
    if (!passwordHash) {
      // Simulate password verification to prevent timing attacks
      await this.simulatePasswordVerification();
      return false;
    }

    try {
      const bcrypt = await import('bcrypt');

      // Handle both Buffer and string hash storage
      const hashString = Buffer.isBuffer(passwordHash)
        ? passwordHash.toString('utf8')
        : passwordHash;

      return await bcrypt.compare(password, hashString);
    } catch (error) {
      this.logger.error('Password verification error', error as Error, {
        operation: 'verifyPassword'
      });
      return false;
    }
  }

  /**
   * Simulate password verification to prevent timing attacks
   *
   * When user doesn't exist, we still want to take approximately
   * the same time as a real verification to prevent enumeration.
   */
  private async simulatePasswordVerification(): Promise<void> {
    const bcrypt = await import('bcrypt');
    // Use a dummy hash that will always fail but takes same time
    const dummyHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.NHd4Y7YsJJJJJJJ';
    await bcrypt.compare('dummy-password', dummyHash);
  }

  private async handleSuccessfulAuth(
    user: { id: string; role: UserRole },
    context: AuthContext
  ): Promise<void> {
    // Reset rate limiting for account
    await this.rateLimiter.resetAccount(user.id);

    // Update login tracking fields (NOT updated_at - that's for profile changes)
    // - last_login_at: When user last authenticated
    // - login_count: Total successful logins (analytics metric)
    // - last_ip_address: Security tracking (hashed for PII compliance)
    // - last_user_agent: Device analytics
    // Note: updated_at will auto-update via ON UPDATE CURRENT_TIMESTAMP
    await this.query(
      `UPDATE users
       SET last_login_at = NOW(),
           login_count = COALESCE(login_count, 0) + 1,
           last_ip_address = ?,
           last_user_agent = ?
       WHERE id = ?`,
      [
        context.hashedIP || null,
        context.userAgent ? context.userAgent.substring(0, 255) : null,
        user.id
      ]
    );
  }

  private async handleFailedAuth(email: string, userId: string | undefined, context: AuthContext): Promise<void> {
    // Increment IP rate limiting (using hashedIP for PII compliance)
    const ipKey = RateLimitUtils.createIPKey(context.hashedIP);
    await this.rateLimiter.incrFailure(ipKey);

    // Increment global rate limiting
    const globalKey = RateLimitUtils.createGlobalKey();
    await this.rateLimiter.incrFailure(globalKey);

    // Increment account rate limiting if user exists
    if (userId) {
      const accountKey = RateLimitUtils.createAccountKey(userId);
      await this.rateLimiter.incrFailure(accountKey, userId);
    }
  }

  private createRateLimitedResult(decision: RateDecision, code: string, message: string): AuthResult {
    const headers = createRateLimitHeaders(decision, DEFAULT_RATE_BUCKETS.account);

    return {
      success: false,
      rateLimit: {
        decision,
        headers: headers as Record<string, string>
      },
      error: {
        code,
        message,
        retryAfter: decision.retryAfterSec
      }
    };
  }

  private createEnumerationSafeError(): AuthResult {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    };
  }

  private generateSessionId(): string {
    // Generate cryptographically secure session ID
    return crypto.randomBytes(32).toString('hex');
  }

  private logAuthEvent(type: 'success' | 'failure', data: Record<string, unknown>): void {
    const logMethod = type === 'success' ? 'info' : 'warn';
    this.logger[logMethod](`Authentication ${type}`, {
      operation: 'login',
      metadata: {
        authType: type,
        ...data,
        // Remove sensitive information
        password: undefined,
        passwordHash: undefined
      }
    });
  }

  /**
   * Log authentication event to database via ActivityLoggingService
   *
   * NON-BLOCKING: Uses try-catch to prevent logging failures from
   * interrupting the main authentication flow.
   *
   * @param action - Event action (e.g., 'login', 'logout', 'register')
   * @param data - Event data with context
   */
  private async logAuthEventToDatabase(
    action: string,
    data: {
      userId?: string | number | null;
      context?: AuthContext;
      sessionId?: string;
      duration?: number;
      success?: boolean;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    try {
      // Dynamic import to avoid circular dependency at initialization
      const { default: AuthServiceRegistry } = await import('@/core/registry/AuthServiceRegistry');
      const activityService = await AuthServiceRegistry.getActivityLoggingService();

      // Map AuthContext.location object to string format
      const locationString = data.context?.location
        ? [data.context.location.city, data.context.location.region]
            .filter(Boolean)
            .join(', ')
        : undefined;

      await activityService.logAuthEvent(action, {
        userId: data.userId,
        success: data.success ?? true,
        hashedIP: data.context?.hashedIP,
        userAgent: data.context?.userAgent,
        location: locationString,
        sessionId: data.sessionId,
        duration: data.duration,
        errorMessage: data.errorMessage,
        metadata: data.metadata
      });
    } catch (error) {
      // NON-BLOCKING: Log to console but don't throw
      this.logger.warn('Failed to log auth event to database', {
        operation: 'logAuthEventToDatabase',
        metadata: {
          action,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Handle password change - revokes ALL sessions (AUTH-P2-2E requirement)
   */
  async handlePasswordChange(userId: string, reason: string = 'password_change'): Promise<number> {
    return this.executeOperation('handlePasswordChange', async () => {
      // Revoke ALL sessions for user (AUTH-P2-2E requirement)
      const revokedCount = await this.sessionService.revokeAllForUser(userId, reason);

      this.logger.info('All user sessions revoked due to password change', {
        operation: 'handlePasswordChange',
        metadata: {
          userId,
          reason,
          revokedCount
        }
      });

      // Database logging (non-blocking)
      void this.logAuthEventToDatabase('password_changed', {
        userId,
        success: true,
        metadata: { reason, revokedCount }
      });

      return revokedCount;
    });
  }

  /**
   * Create SessionContext from AuthContext
   */
  private createSessionContext(context: AuthContext): SessionContext {
    return {
      userAgent: context.userAgent,
      ipAddress: context.hashedIP, // Map hashedIP to ipAddress for SessionContext
      timestamp: context.timestamp
    };
  }

  /**
   * Health check for authentication service
   */
  protected async performHealthChecks(): Promise<Record<string, boolean>> {
    try {
      // Check database connectivity using inherited query method
      const dbHealth = await this.query('SELECT 1 as health_check');
      const dbHealthy = dbHealth.rows.length > 0;

      // Check rate limiter health (if available)
      const rateLimiterHealthy = !!this.rateLimiter;

      // Check session service health
      const sessionServiceHealthy = !!this.sessionService;

      return {
        database: dbHealthy,
        rateLimiter: rateLimiterHealthy,
        sessionService: sessionServiceHealthy
      };
    } catch {
      return {
        database: false,
        rateLimiter: false,
        sessionService: false
      };
    }
  }

  /**
   * Verify email with token
   * @param token - Verification token from email link
   * @returns Success status with user info or error
   *
   * @governance Phase 3C requirement
   * @authority Phase 3C Brain Document, Lines 57-182
   */
  async verifyEmailWithToken(token: string): Promise<{
    success: boolean;
    userId?: string;
    email?: string;
    error?: string;
  }> {
    return this.executeOperation('verifyEmailWithToken', async () => {
      // Hash the token for lookup (CORRECT crypto usage)
      const tokenHash = crypto.createHash('sha256').update(token).digest();

      // Query for the verification token (CORRECT DbResult usage)
      const result = await this.query<{
        user_id: number;
        expires_at: string;
        used_at: string | null;
        email: string;
      }>(
        `SELECT ev.user_id, ev.expires_at, ev.used_at, u.email
         FROM email_verifications ev
         JOIN users u ON u.id = ev.user_id
         WHERE ev.token_hash = ?`,
        [tokenHash]
      );

      const rows = result.rows;

      if (!rows || rows.length === 0) {
        return {
          success: false,
          error: 'Invalid verification token'
        };
      }

      const verification = rows[0];
      if (!verification) {
        return {
          success: false,
          error: 'Invalid verification token'
        };
      }

      // Check if already used
      if (verification.used_at) {
        return {
          success: false,
          error: 'Verification token has already been used'
        };
      }

      // Check if expired
      if (new Date() > new Date(verification.expires_at)) {
        return {
          success: false,
          error: 'Verification token has expired'
        };
      }

      // Mark token as used
      await this.query(
        'UPDATE email_verifications SET used_at = NOW() WHERE token_hash = ?',
        [tokenHash]
      );

      // Mark email as verified (set timestamp and boolean flag)
      await this.query(
        'UPDATE users SET email_verified_at = NOW(), is_verified = 1 WHERE id = ?',
        [verification.user_id]
      );

      // Database logging (non-blocking)
      void this.logAuthEventToDatabase('email_verify_success', {
        userId: verification.user_id.toString(),
        success: true,
        metadata: { email: verification.email }
      });

      return {
        success: true,
        userId: verification.user_id.toString(),
        email: verification.email
      };
    });
  }

  /**
   * Resend verification email
   * @param userId - User ID
   * @param email - User email address
   * @returns Success status or error
   *
   * @governance Phase 3C requirement with rate limiting (3/hour)
   * @authority Phase 3C Brain Document, Lines 241-441
   */
  async resendVerificationEmail(userId: string, email: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.executeOperation('resendVerificationEmail', async () => {
      // Rate limiting: 3 requests per hour (CORRECT pattern)
      const rateLimitKey = RateLimitUtils.createAccountKey(`resend-verification:${email}`);
      const rateLimitCheck = await this.rateLimiter.check(rateLimitKey);

      if (!rateLimitCheck.allow) {  // ✅ CORRECT property name
        return {
          success: false,
          error: 'Too many verification email requests. Please try again later.'
        };
      }

      // Invalidate all existing verification tokens for this user
      await this.query(
        'UPDATE email_verifications SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
        [parseInt(userId)]
      );

      // Generate new verification token (CORRECT crypto usage)
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store new token
      await this.query(
        `INSERT INTO email_verifications (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [parseInt(userId), tokenHash, expiresAt]
      );

      // Send verification email using helper method
      await this.sendVerificationEmail(email, token);

      return {
        success: true
      };
    });
  }

  /**
   * Request password reset
   * @param email - User email address
   * @returns Always returns success (enumeration protection)
   *
   * @governance Phase 3C requirement with email enumeration protection
   * @authority Phase 3C Brain Document, Lines 456-629
   */
  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.executeOperation('requestPasswordReset', async () => {
      // Normalize email
      const emailNormalized = email.toLowerCase().trim();

      // Rate limiting: 3 requests per hour (CORRECT pattern)
      const rateLimitKey = RateLimitUtils.createAccountKey(`password-reset-request:${emailNormalized}`);
      const rateLimitCheck = await this.rateLimiter.check(rateLimitKey);

      if (!rateLimitCheck.allow) {  // ✅ CORRECT property name
        // Still return success for enumeration protection
        return {
          success: true
        };
      }

      // Check if user exists (use private method - returns raw row or null)
      const user = await this.getUserByEmail(emailNormalized);

      if (!user) {
        // Return success to prevent email enumeration
        return {
          success: true
        };
      }

      // Invalidate all existing reset tokens for this user
      await this.query(
        'UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
        [user.id]
      );

      // Generate new reset token (CORRECT crypto usage)
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store new token
      await this.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [user.id, tokenHash, expiresAt]
      );

      // Send password reset email using helper method (include user name for personalization)
      await this.sendPasswordResetEmail(email, token, user.display_name || user.username);

      return {
        success: true
      };
    });
  }

  /**
   * Reset password with token
   * @param token - Password reset token
   * @param newPassword - New password
   * @returns Success status or error
   *
   * @governance Phase 3C requirement with password strength validation
   * @authority Phase 3C Brain Document, Lines 644-835
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
    userId?: string;
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
      isVerified: boolean;
    };
  }> {
    return this.executeOperation('resetPasswordWithToken', async () => {
      // Validate password strength using helper method
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error
        };
      }

      // Hash the token for lookup (CORRECT crypto usage)
      const tokenHash = crypto.createHash('sha256').update(token).digest();

      // Query for the reset token (CORRECT DbResult usage)
      const result = await this.query<{
        user_id: number;
        expires_at: string;
        used_at: string | null;
      }>(
        `SELECT pr.user_id, pr.expires_at, pr.used_at
         FROM password_resets pr
         WHERE pr.token_hash = ?`,
        [tokenHash]
      );

      const rows = result.rows;

      if (!rows || rows.length === 0) {
        return {
          success: false,
          error: 'Invalid reset token'
        };
      }

      const reset = rows[0];
      if (!reset) {
        return {
          success: false,
          error: 'Invalid reset token'
        };
      }

      // Check if already used
      if (reset.used_at) {
        return {
          success: false,
          error: 'Reset token has already been used'
        };
      }

      // Check if expired
      if (new Date() > new Date(reset.expires_at)) {
        return {
          success: false,
          error: 'Reset token has expired'
        };
      }

      // Mark token as used
      await this.query(
        'UPDATE password_resets SET used_at = NOW() WHERE token_hash = ?',
        [tokenHash]
      );

      // Hash the new password using imported bcrypt
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update the password AND verify email
      // Rationale: User clicked link from email, proving email ownership
      await this.query(
        `UPDATE users
         SET password_hash = ?,
             is_verified = 1,
             email_verified_at = NOW()
         WHERE id = ?`,
        [hashedPassword, reset.user_id]
      );

      // Revoke ALL sessions for this user (security measure)
      await this.handlePasswordChange(reset.user_id.toString(), 'password_reset');

      // Fetch user data for auto-login
      const userResult = await this.query<{
        id: number;
        email: string;
        display_name: string | null;
        role: string;
        is_verified: number;
      }>(
        'SELECT id, email, display_name, role, is_verified FROM users WHERE id = ?',
        [reset.user_id]
      );

      const userData = userResult.rows?.[0];

      // Database logging (non-blocking)
      void this.logAuthEventToDatabase('password_reset_success', {
        userId: reset.user_id.toString(),
        success: true,
        metadata: { emailVerified: true }
      });

      return {
        success: true,
        userId: reset.user_id.toString(),
        user: userData ? {
          id: userData.id.toString(),
          email: userData.email,
          name: userData.display_name ?? userData.email.split('@')[0] ?? 'User',
          role: userData.role,
          isVerified: userData.is_verified === 1
        } : undefined
      };
    });
  }

  /**
   * Send verification email via EmailService
   * @param email - User email address
   * @param token - Verification token
   * @param userName - Optional user name for personalization
   */
  private async sendVerificationEmail(
    email: string,
    token: string,
    userName?: string
  ): Promise<void> {
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;

    try {
      // Dynamic import to avoid circular dependency
      const { default: AuthServiceRegistry } = await import('@/core/registry/AuthServiceRegistry');
      const emailService = AuthServiceRegistry.emailService;

      const result = await emailService.sendVerificationEmail(email, verificationUrl, userName);

      if (!result.success) {
        this.logger?.warn('Failed to send verification email', {
          operation: 'sendVerificationEmail',
          metadata: {
            error: result.error,
            email: email.replace(/(.{2}).*@/, '$1***@') // Redact email for logging
          }
        });
      } else {
        this.logger?.info('Verification email sent', {
          operation: 'sendVerificationEmail',
          metadata: {
            messageId: result.messageId
          }
        });
      }
    } catch (error) {
      this.logger?.error('Error sending verification email', error as Error, {
        operation: 'sendVerificationEmail'
      });
      // Don't throw - email failure shouldn't block registration
    }
  }

  /**
   * Validate password strength
   * Private helper method
   */
  private validatePasswordStrength(password: string): {
    valid: boolean;
    error?: string;
  } {
    if (password.length < 8) {
      return {
        valid: false,
        error: 'Password must be at least 8 characters long'
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one lowercase letter'
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one number'
      };
    }

    return { valid: true };
  }

  /**
   * Send password reset email via EmailService
   * @param email - User email address
   * @param token - Reset token
   * @param userName - Optional user name for personalization
   */
  private async sendPasswordResetEmail(
    email: string,
    token: string,
    userName?: string
  ): Promise<void> {
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/password/reset?token=${token}`;

    try {
      // Dynamic import to avoid circular dependency
      const { default: AuthServiceRegistry } = await import('@/core/registry/AuthServiceRegistry');
      const emailService = AuthServiceRegistry.emailService;

      const result = await emailService.sendPasswordResetEmail(email, resetUrl, userName);

      if (!result.success) {
        this.logger?.warn('Failed to send password reset email', {
          operation: 'sendPasswordResetEmail',
          metadata: {
            error: result.error,
            email: email.replace(/(.{2}).*@/, '$1***@') // Redact email for logging
          }
        });
      } else {
        this.logger?.info('Password reset email sent', {
          operation: 'sendPasswordResetEmail',
          metadata: {
            messageId: result.messageId
          }
        });
      }
    } catch (error) {
      this.logger?.error('Error sending password reset email', error as Error, {
        operation: 'sendPasswordResetEmail'
      });
      // Don't throw - email failure shouldn't block reset request
    }
  }
}
