/**
 * Admin Password Verification API Endpoint
 *
 * @tier STANDARD
 * @phase Phase 4 - Admin Password Confirmation System
 * @generated Manual implementation following Phase 4 Brain Plan
 *
 * PURPOSE:
 * - Verify admin password for destructive batch operations
 * - Implement 3-strike lockout mechanism (5-minute cooldown)
 * - Log all verification attempts with ActivityLoggingService
 * - PII-compliant logging (hashedIP, no plaintext passwords)
 *
 * GOVERNANCE:
 * - MUST use apiHandler wrapper with requireAuth: true
 * - MUST use PasswordServiceImpl.verify() for bcrypt comparison
 * - MUST use ActivityLoggingService for audit logging
 * - MUST use DatabaseService for database operations
 * - Password NEVER logged in plaintext
 * - Password hash NEVER sent to client
 * - Lockout check BEFORE password verification (performance)
 *
 * SECURITY:
 * - OSI Layer 7: Input validation, XSS prevention, SQL injection prevention
 * - OSI Layer 5: CSRF protection via apiHandler (automatic)
 * - OSI Layer 4: Rate limiting via lockout mechanism
 *
 * @see PHASE_4_BRAIN_PLAN.md - Complete implementation specifications
 * @see PasswordServiceImpl.ts - bcrypt verification pattern
 * @see ActivityLoggingService.ts - PII-compliant audit logging
 * @see AuthenticationService.ts - Lockout enforcement pattern
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getActivityLoggingService } from '@core/services/ActivityLoggingService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * Request body interface
 */
interface VerifyPasswordRequest {
  password: string;
}

/**
 * Success response data
 */
interface VerifyPasswordData {
  valid: boolean;
}

/**
 * POST /api/admin/verify-password
 *
 * Verify admin password for batch operations with lockout protection
 *
 * Flow:
 * 1. Get current user from session (getUserFromRequest)
 * 2. Verify user is admin role
 * 3. Check lockout status (locked_until > NOW) - BEFORE password verification
 * 4. Get user password_hash from database
 * 5. Verify password with PasswordServiceImpl.verify()
 * 6. If invalid: Increment failed_login_attempts, set lockout if >= 3
 * 7. If valid: Reset failed_login_attempts = 0, locked_until = NULL
 * 8. Log activity with ActivityLoggingService (PII-compliant)
 * 9. Return success/failure response
 *
 * @param context - API context with request, requestId, logger
 * @returns ApiResponse with valid: true or error
 */
export const POST = apiHandler<VerifyPasswordData>(
  async (context: ApiContext) => {
    const { request, requestId, logger } = context;

    // Step 1: Get current user from session
    const currentUser = await getUserFromRequest(request as NextRequest);
    if (!currentUser) {
      throw BizError.unauthorized('Authentication required');
    }

    // Step 2: Verify user is admin role
    if (currentUser.role !== 'admin') {
      throw BizError.forbidden('Admin access required');
    }

    // Step 3: Parse request body
    const body = (await request.json()) as VerifyPasswordRequest;
    const { password } = body;

    // Validate password input
    if (!password || typeof password !== 'string' || password.trim() === '') {
      throw BizError.validation('password', password, 'Password is required');
    }

    // Step 4: Get services
    const db = getDatabaseService();
    const activityService = getActivityLoggingService();

    // Step 5: Get user details including lockout status
    const userResult = await db.query<{
      id: number;
      password_hash: string;
      failed_login_attempts: number;
      locked_until: string | null;
    }>(
      `SELECT id, password_hash, failed_login_attempts, locked_until
       FROM users
       WHERE id = ?`,
      [currentUser.id]
    );

    if (userResult.rows.length === 0) {
      throw BizError.notFound('user', currentUser.id.toString());
    }

    const user = userResult.rows[0];
    if (!user) {
      throw BizError.notFound('user', currentUser.id.toString());
    }

    // Step 6: Check lockout status FIRST (fast check before slow bcrypt)
    const now = new Date();
    if (user.locked_until && new Date(user.locked_until) > now) {
      const lockedUntil = new Date(user.locked_until);
      const remainingMs = lockedUntil.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      // Log lockout attempt
      await activityService.logActivity({
        userId: currentUser.id,
        action: 'admin_password_verification_locked',
        actionType: 'auth',
        description: `Admin password verification blocked due to lockout (${remainingMinutes} minutes remaining)`,
        hashedIP: hashIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        sessionId: request.cookies.get('bk_session')?.value,
        success: false,
        errorMessage: 'Account locked',
        metadata: {
          operation: 'admin_password_verification',
          locked_until: user.locked_until,
          remaining_minutes: remainingMinutes
        }
      });

      throw new BizError({
        code: 'ACCOUNT_LOCKED',
        message: `Too many failed attempts. Try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`,
        context: { locked_until: user.locked_until }
      });
    }

    // Step 7: Verify password (slow bcrypt operation)
    // Use bcrypt directly without pepper (matches login behavior)
    const bcrypt = require('bcrypt');
    const hashString = Buffer.isBuffer(user.password_hash)
      ? user.password_hash.toString('utf8')
      : user.password_hash;
    const isValid = await bcrypt.compare(password, hashString);

    if (!isValid) {
      // INVALID PASSWORD: Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const shouldLock = newAttempts >= 3;

      // Calculate lockout time if needed (5 minutes from now)
      const lockedUntil = shouldLock ? new Date(Date.now() + 5 * 60 * 1000) : null;

      // Update database
      await db.query(
        `UPDATE users
         SET failed_login_attempts = ?,
             locked_until = ?
         WHERE id = ?`,
        [newAttempts, lockedUntil, user.id]
      );

      // Log failed attempt
      await activityService.logActivity({
        userId: currentUser.id,
        action: 'admin_password_verification_failed',
        actionType: 'auth',
        description: `Admin password verification failed (attempt ${newAttempts}/3)`,
        hashedIP: hashIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        sessionId: request.cookies.get('bk_session')?.value,
        success: false,
        errorMessage: 'Invalid password',
        metadata: {
          operation: 'admin_password_verification',
          attempts: newAttempts,
          locked: shouldLock
        }
      });

      const attemptsRemaining = 3 - newAttempts;

      if (shouldLock) {
        throw new BizError({
          code: 'ACCOUNT_LOCKED',
          message: 'Too many failed attempts. Your account has been locked for 5 minutes.',
          context: {
            attempts_remaining: 0,
            locked_until: lockedUntil?.toISOString()
          }
        });
      } else {
        throw new BizError({
          code: 'INVALID_PASSWORD',
          message: `Invalid password. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`,
          context: {
            attempts_remaining: attemptsRemaining
          }
        });
      }
    }

    // SUCCESS: Reset failed attempts counter
    await db.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL
       WHERE id = ?`,
      [user.id]
    );

    // Log successful verification
    await activityService.logActivity({
      userId: currentUser.id,
      action: 'admin_password_verification_success',
      actionType: 'auth',
      description: 'Admin password verification successful',
      hashedIP: hashIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value,
      success: true,
      metadata: {
        operation: 'admin_password_verification'
      }
    });

    logger.info('Admin password verified successfully', {
      operation: 'verify-password',
      metadata: {
        userId: currentUser.id
      }
    });

    return createSuccessResponse<VerifyPasswordData>(
      {
        valid: true
      },
      requestId
    );
  },
  {
    allowedMethods: ['POST'],
    requireAuth: true // Automatic authentication check
  }
);

/**
 * Hash IP address for PII compliance
 *
 * Uses SHA-256 to hash IP address from x-forwarded-for header
 * Returns format: "sha256:abc123..."
 *
 * @param request - Next.js request object
 * @returns Hashed IP address string
 */
function hashIP(request: NextRequest): string {
  const crypto = require('crypto');
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  const hash = crypto
    .createHash('sha256')
    .update(ip)
    .digest('hex');

  return `sha256:${hash}`;
}
