/**
 * DbAuthService - High-Level Authentication Service
 *
 * @authority PHASE_2.3_BRAIN_PLAN.md Task 2.4.1
 * @governance Build Map v2.1 ENHANCED - Service layer architecture
 * @governance httpOnly cookie-based sessions (MANDATORY)
 * @governance Service Architecture v2.0 compliance
 * @see Phase 1 services: PasswordServiceImpl, UserRepo, SessionRepo, CookieSessionService
 *
 * PURPOSE:
 * - Complete authentication workflows (register, login, logout, verify, reset)
 * - Orchestrate Phase 1 services for high-level operations
 * - Provide business logic layer between API routes and repositories
 * - Enforce security patterns (httpOnly cookies, password validation, email verification)
 *
 * ARCHITECTURE:
 * - Builds on Phase 1 foundation services
 * - NO direct database access (uses repositories)
 * - Returns user-friendly error messages
 * - Integrates email token system for verification/reset workflows
 */

import { UserRepo, getUserRepo, type User, type CreateUserInput } from '@core/repositories/UserRepo';
import { SessionRepo, getSessionRepo, type Session } from '@core/repositories/SessionRepo';
import { CookieSessionService, getCookieSessionService } from '@core/services/CookieSessionService';
// DEPRECATED: These imports are broken - DbAuthService is unused (AuthenticationService.ts is the working auth service)
// TODO: Remove DbAuthService.ts entirely in Phase 5 cleanup
// import { PasswordServiceImpl, getPasswordService } from '@/services/security/PasswordServiceImpl';
// import { EmailTokenService } from '@/services/tokens/email-token-service';
// import { getTokenRepo } from '@/services/tokens/TokenRepoImpl';

// Temporary type stubs for commented-out imports (allows file to compile while unused)
type PasswordServiceImpl = { validateStrength: (p: string) => { valid: boolean; errors: string[] }; hash: (p: string) => Promise<string>; verify: (p: string, h: string) => Promise<boolean> };
type EmailTokenService = { create: (opts: { userId: bigint; purpose: string; ttlMinutes?: number }) => Promise<{ token: string }>; verifyAndConsume: (t: string, p: string) => Promise<{ ok: boolean; reason?: string; userId?: bigint }> };
const getPasswordService = (): PasswordServiceImpl => { throw new Error('DbAuthService is deprecated - use AuthenticationService'); };
const getTokenRepo = (): unknown => { throw new Error('DbAuthService is deprecated - use AuthenticationService'); };

/**
 * Registration input interface
 */
export interface RegisterInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_business_owner?: boolean;
}

/**
 * Login input interface
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Authentication result with session and cookie
 */
export interface AuthResult {
  user: User;
  sessionId: string;
  expiresAt: Date;
  cookieHeader: string;
}

/**
 * Logout result with clear cookie header
 */
export interface LogoutResult {
  cookieHeader: string;
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  user: User;
  session: Session;
}

/**
 * Password reset request result
 */
export interface PasswordResetRequestResult {
  userId: number;
  resetToken: string;
}

/**
 * DbAuthService - Complete authentication service
 *
 * Provides 7 core authentication workflows:
 * 1. register - User registration with email verification token
 * 2. login - User login with session creation
 * 3. logout - Session cleanup
 * 4. validateSession - Session validation
 * 5. verifyEmail - Email verification
 * 6. requestPasswordReset - Password reset request
 * 7. resetPassword - Password reset completion
 */
export class DbAuthService {
  private userRepo: UserRepo;
  private sessionRepo: SessionRepo;
  private cookieSessionService: CookieSessionService;
  private passwordService: PasswordServiceImpl;
  private emailTokenService: EmailTokenService;

  constructor() {
    // DEPRECATED: DbAuthService is unused - AuthenticationService.ts is the working auth service
    // This constructor will throw if called, but the class compiles for type safety
    this.userRepo = getUserRepo();
    this.sessionRepo = getSessionRepo();
    this.cookieSessionService = getCookieSessionService();
    this.passwordService = getPasswordService(); // Will throw - service deprecated

    // Stub for emailTokenService - will throw if used
    this.emailTokenService = {
      create: async () => { throw new Error('DbAuthService is deprecated'); },
      verifyAndConsume: async () => { throw new Error('DbAuthService is deprecated'); }
    } as EmailTokenService;
  }

  /**
   * WORKFLOW 1: User Registration
   *
   * GOVERNANCE: Phase 2.3 registration workflow
   * - Validate email uniqueness
   * - Validate password strength
   * - Hash password with bcrypt
   * - Create user record (role=general, email_verified=false)
   * - Generate email verification token
   * - Return user + verification token (caller sends email)
   *
   * @param input - Registration data
   * @returns User object and verification token
   * @throws Error if email exists or validation fails
   */
  async register(input: RegisterInput): Promise<{ user: User; verificationToken: string }> {
    const { email, password, first_name, last_name } = input;

    // 1. Validate email uniqueness
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // 2. Validate password strength
    const passwordValidation = this.passwordService.validateStrength(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // 3. Hash password
    const password_hash = await this.passwordService.hash(password);

    // 4. Create user record
    const userInput: CreateUserInput = {
      email,
      username: email.split('@')[0] || email, // Generate username from email prefix
      password_hash,
      first_name,
      last_name,
      role: 'general'
    };

    const user = await this.userRepo.create(userInput);

    // 5. Generate email verification token
    const tokenResult = await this.emailTokenService.create({
      userId: BigInt(user.id),
      purpose: 'email_verify'
    });

    return {
      user,
      verificationToken: tokenResult.token
    };
  }

  /**
   * WORKFLOW 2: User Login
   *
   * GOVERNANCE: Phase 2.3 login workflow
   * - Find user by email
   * - Check user is_active flag
   * - Verify password against hash
   * - Create session (30 days TTL default)
   * - Generate httpOnly cookie header
   * - Update last_login timestamp
   * - Return user + session + cookie
   *
   * @param input - Login credentials
   * @param ipAddress - Optional IP address for session tracking
   * @param userAgent - Optional user agent for session tracking
   * @returns Authentication result with cookie header
   * @throws Error if credentials invalid or account inactive
   */
  async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const { email, password } = input;

    // 1. Find user by email
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // 2. Check user is_active flag
    if (!user.is_active) {
      throw new Error('Account is inactive. Please contact support.');
    }

    // 3. Verify password
    const isPasswordValid = await this.passwordService.verify(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // 4. Create session
    const { sessionId, expiresAt } = await this.cookieSessionService.createSession(
      user.id,
      ipAddress,
      userAgent
    );

    // 5. Generate cookie header
    const cookieHeader = this.cookieSessionService.generateCookieHeader(sessionId, expiresAt);

    // 6. Update last_login timestamp
    await this.userRepo.updateLastLogin(user.id);

    return {
      user,
      sessionId,
      expiresAt,
      cookieHeader
    };
  }

  /**
   * WORKFLOW 3: User Logout
   *
   * GOVERNANCE: Phase 2.3 logout workflow
   * - Delete session from database
   * - Generate clear cookie header
   * - Return cookie header for response
   *
   * @param sessionId - Session ID to destroy
   * @returns Logout result with clear cookie header
   */
  async logout(sessionId: string): Promise<LogoutResult> {
    // 1. Delete session
    await this.cookieSessionService.destroySession(sessionId);

    // 2. Generate clear cookie header
    const cookieHeader = this.cookieSessionService.generateClearCookieHeader();

    return { cookieHeader };
  }

  /**
   * WORKFLOW 4: Session Validation
   *
   * GOVERNANCE: Phase 2.3 session validation workflow
   * - Query session from database
   * - Check session expiry
   * - Query user from database
   * - Check user is_active flag
   * - Return user + session or null
   *
   * @param sessionId - Session ID to validate
   * @returns Session validation result or null if invalid
   */
  async validateSession(sessionId: string): Promise<SessionValidationResult | null> {
    // 1. Validate session (automatically checks expiry)
    const session = await this.cookieSessionService.validateSession(sessionId);
    if (!session) {
      return null;
    }

    // 2. Get user from session
    const user = await this.userRepo.findById(session.user_id);
    if (!user) {
      // User deleted - destroy session
      await this.cookieSessionService.destroySession(sessionId);
      return null;
    }

    // 3. Check user is_active flag
    if (!user.is_active) {
      // User deactivated - destroy session
      await this.cookieSessionService.destroySession(sessionId);
      return null;
    }

    return { user, session };
  }

  /**
   * WORKFLOW 5: Email Verification
   *
   * GOVERNANCE: Phase 2.3 email verification workflow
   * - Validate token (check expiry, usage)
   * - Mark token as used
   * - Update user email_verified flag
   * - Return updated user
   *
   * @param token - Email verification token
   * @returns Verified user
   * @throws Error if token invalid/expired/used
   */
  async verifyEmail(token: string): Promise<User> {
    // 1. Verify and consume token
    const verifyResult = await this.emailTokenService.verifyAndConsume(token, 'email_verify');

    if (!verifyResult.ok) {
      if (verifyResult.reason === 'expired') {
        throw new Error('Verification link has expired. Please request a new one.');
      } else if (verifyResult.reason === 'used') {
        throw new Error('Verification link has already been used.');
      } else {
        throw new Error('Invalid verification link.');
      }
    }

    // 2. Get user ID from token result
    const userId = Number(verifyResult.userId);

    // 3. Update user is_email_verified flag
    const user = await this.userRepo.update(userId, {
      is_email_verified: true
    });

    return user;
  }

  /**
   * WORKFLOW 6: Password Reset Request
   *
   * GOVERNANCE: Phase 2.3 password reset request workflow
   * - Find user by email (silently fail if not found)
   * - Generate password reset token (1 hour TTL)
   * - Return userId + token (caller sends email)
   * - SECURITY: Always returns success (don't reveal if email exists)
   *
   * @param email - User email address
   * @returns Password reset token or null if user not found
   */
  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult | null> {
    // 1. Find user by email (silently fail if not found for security)
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // SECURITY: Don't reveal if email exists
      return null;
    }

    // 2. Check user is_active flag
    if (!user.is_active) {
      // SECURITY: Don't reveal account status
      return null;
    }

    // 3. Generate password reset token (1 hour TTL)
    const tokenResult = await this.emailTokenService.create({
      userId: BigInt(user.id),
      purpose: 'password_reset',
      ttlMinutes: 60 // 1 hour
    });

    return {
      userId: user.id,
      resetToken: tokenResult.token
    };
  }

  /**
   * WORKFLOW 7: Password Reset Completion
   *
   * GOVERNANCE: Phase 2.3 password reset completion workflow
   * - Validate token (check expiry, usage)
   * - Validate new password strength
   * - Hash new password
   * - Update user password_hash
   * - Mark token as used
   * - Invalidate all user sessions (force re-login)
   *
   * @param token - Password reset token
   * @param newPassword - New password to set
   * @throws Error if token invalid/expired/used or password weak
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // 1. Verify and consume token
    const verifyResult = await this.emailTokenService.verifyAndConsume(token, 'password_reset');

    if (!verifyResult.ok) {
      if (verifyResult.reason === 'expired') {
        throw new Error('Password reset link has expired. Please request a new one.');
      } else if (verifyResult.reason === 'used') {
        throw new Error('Password reset link has already been used.');
      } else {
        throw new Error('Invalid password reset link.');
      }
    }

    // 2. Validate new password strength
    const passwordValidation = this.passwordService.validateStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // 3. Hash new password
    const newPasswordHash = await this.passwordService.hash(newPassword);

    // 4. Get user ID from token result
    const userId = Number(verifyResult.userId);

    // 5. Update user password_hash
    await this.userRepo.update(userId, {
      password_hash: newPasswordHash
    });

    // 6. Invalidate all user sessions (force re-login for security)
    await this.cookieSessionService.destroyAllUserSessions(userId);
  }
}

/**
 * Singleton instance for application-wide use
 * GOVERNANCE: Singleton pattern for service reuse
 */
let dbAuthServiceInstance: DbAuthService | null = null;

/**
 * Get DbAuthService singleton instance
 *
 * @returns Shared DbAuthService instance
 */
export function getDbAuthService(): DbAuthService {
  if (!dbAuthServiceInstance) {
    dbAuthServiceInstance = new DbAuthService();
  }
  return dbAuthServiceInstance;
}

/**
 * Default export for convenience
 */
export default DbAuthService;
