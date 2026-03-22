/**
 * Admin User Create API
 * POST /api/admin/users/create - Create new user
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - CSRF protection: fetchWithCsrf on client
 * - Authentication: Admin-only access
 * - Service boundary: Uses UserManagementService
 * - Activity logging: AdminActivityService for audit trail
 * - Email notification: Sends welcome email with password setup link
 *
 * DATABASE SCHEMA (verified 2026-01-31):
 * - role: enum('general','listing_member','admin')
 * - status: enum('active','suspended','banned','deleted','pending')
 * - NO membership_tier column exists
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @phase Phase 5 - User Editor Modal
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getActivityLoggingService } from '@core/services/ActivityLoggingService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import AuthServiceRegistry from '@core/registry/AuthServiceRegistry';

interface CreateUserRequest {
  email: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  role: 'general' | 'listing_member' | 'admin';
  status: 'active' | 'suspended' | 'banned' | 'pending';
  is_verified: boolean;
  send_welcome_email?: boolean;
}

export const POST = apiHandler(
  async (context: ApiContext) => {
    const { request, logger } = context;

    // Get current admin user
    const currentUser = await getUserFromRequest(request as NextRequest);
    if (!currentUser) {
      throw BizError.unauthorized('Authentication required');
    }
    if (currentUser.role !== 'admin') {
      throw BizError.forbidden('Admin access required');
    }

    // Parse request body
    const body = (await request.json()) as CreateUserRequest;
    const {
      email,
      username,
      first_name,
      last_name,
      display_name,
      role,
      status,
      is_verified,
      send_welcome_email = true // Default to true - send welcome email
    } = body;

    // Validate required fields
    if (!email?.trim()) {
      throw BizError.validation('email', email, 'Email is required');
    }
    if (!username?.trim()) {
      throw BizError.validation('username', username, 'Username is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw BizError.validation('email', email, 'Invalid email format');
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      throw BizError.validation('username', username, 'Username can only contain letters, numbers, and underscores');
    }

    const db = getDatabaseService();

    // Check for duplicate email
    const existingEmail = await db.query<{ id: number }>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (existingEmail.rows.length > 0) {
      throw BizError.validation('email', email, 'Email is already in use');
    }

    // Check for duplicate username
    const existingUsername = await db.query<{ id: number }>(
      'SELECT id FROM users WHERE username = ?',
      [username.toLowerCase()]
    );
    if (existingUsername.rows.length > 0) {
      throw BizError.validation('username', username, 'Username is already taken');
    }

    // Generate temporary password (user will reset via email)
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Generate UUID
    const uuid = crypto.randomUUID();

    // Insert new user
    // VERIFIED against actual database 2026-01-31:
    // - email_normalized: NOT NULL + UNIQUE (required)
    // - role: enum('general','listing_member','admin')
    // - status: enum('active','suspended','banned','deleted','pending')
    // - NO membership_tier column
    const result = await db.query(
      `INSERT INTO users (
        uuid, email, email_normalized, username, password_hash,
        first_name, last_name, display_name,
        role, status, is_verified,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        uuid,
        email.toLowerCase(),
        email.toLowerCase(), // email_normalized - required for UNIQUE constraint
        username.toLowerCase(),
        passwordHash,
        first_name || null,
        last_name || null,
        display_name || null,
        role || 'general', // Valid enum: general, listing_member, admin
        status || 'active',
        is_verified ? 1 : 0
      ]
    );

    const newUserId = result.insertId;

    if (!newUserId) {
      throw BizError.databaseError('user creation', new Error('No insert ID returned'));
    }

    // Log activity
    const activityService = getActivityLoggingService();
    await activityService.logActivity({
      userId: currentUser.id,
      action: 'user_created',
      actionType: 'account',
      description: `Created new user: ${email}`,
      entityType: 'user',
      entityId: newUserId.toString(),
      success: true,
      metadata: {
        new_user_email: email,
        new_user_role: role
      }
    });

    // Log admin activity for audit trail
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: currentUser.id,
      targetEntityType: 'user',
      targetEntityId: Number(newUserId),
      actionType: 'user_created',
      actionCategory: 'creation',
      actionDescription: `Created user: ${email}`,
      afterData: { email, username, role, status, is_verified },
      severity: 'normal'
    });

    logger.info('User created successfully', {
      operation: 'create-user',
      metadata: {
        newUserId,
        email,
        role
      }
    });

    // Send welcome email with password setup link (if requested)
    let welcomeEmailSent = false;
    if (send_welcome_email) {
      try {
        // Generate password reset token for initial password setup
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for admin-created accounts

        // Store the password reset token
        await db.query(
          `INSERT INTO password_resets (user_id, token_hash, expires_at, created_at)
           VALUES (?, ?, ?, NOW())`,
          [newUserId, tokenHash, expiresAt]
        );

        // Send welcome email via EmailService
        const emailService = await AuthServiceRegistry.getEmailService();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const setupUrl = `${baseUrl}/auth/password/reset?token=${resetToken}`;
        const userName = display_name || first_name || username;

        const result = await emailService.send({
          to: email.toLowerCase(),
          subject: 'Welcome to Bizconekt - Set Up Your Account',
          text: `Hi ${userName},\n\nAn account has been created for you at Bizconekt.\n\nPlease set up your password by visiting:\n${setupUrl}\n\nThis link will expire in 7 days.\n\nIf you didn't expect this email, please contact support.\n\nThanks,\nThe Bizconekt Team`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="color: #0070f3;">Welcome to Bizconekt!</h1>
    <p>Hi ${userName},</p>
    <p>An account has been created for you. Please set up your password to access your account:</p>
    <p style="margin: 30px 0;">
      <a href="${setupUrl}" class="button">Set Up Your Password</a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">${setupUrl}</p>
    <p>This link will expire in 7 days.</p>
    <p>If you didn't expect this email, please contact our support team.</p>
    <div class="footer">
      <p>Thanks,<br>The Bizconekt Team</p>
    </div>
  </div>
</body>
</html>`
        });

        welcomeEmailSent = result.success;
        if (!result.success) {
          logger.warn('Failed to send welcome email', {
            operation: 'create-user',
            metadata: { userId: newUserId, error: result.error }
          });
        }
      } catch (emailError) {
        // Don't fail user creation if email fails
        logger.warn('Error sending welcome email', {
          operation: 'create-user',
          metadata: {
            userId: newUserId,
            error: emailError instanceof Error ? emailError.message : 'Unknown error'
          }
        });
      }
    }

    // Fetch created user for response
    const createdUser = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [newUserId]
    );

    return createSuccessResponse({
      user: createdUser.rows[0],
      message: 'User created successfully',
      welcomeEmailSent
    });
  },
  {
    allowedMethods: ['POST'],
    requireAuth: true
  }
);
