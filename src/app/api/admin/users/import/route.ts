/**
 * User Import Execution API Endpoint
 *
 * POST /api/admin/users/import
 * - format: 'json' | 'csv' | 'sql'
 * - content: file content as string
 * - conflictResolution: 'skip' | 'overwrite' | 'rename' | 'update_existing'
 *
 * CONFLICT RESOLUTION:
 * - skip: Don't import conflicting users
 * - overwrite: Replace all fields with import data
 * - rename: Create new user with modified email
 * - update_existing: Merge - only update fields with non-empty values in import,
 *                    preserve existing values for empty fields
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Admin-only access
 * - Activity logging for imports
 * - Temporary password generation (like Phase 5 create)
 * - Supports ALL safe database fields per ImportExportModal.md
 *
 * DATABASE SCHEMA (LIVE QUERY VERIFIED 2026-02-01):
 * - 49 total columns in users table
 * - 32 importable fields (excludes auto-generated and sensitive)
 * - 41 exportable fields (includes read-only timestamps/metrics)
 * - 8 NEVER exported: password_hash, password_changed_at, failed_login_attempts,
 *   locked_until, deleted_at, email_normalized, last_ip_address, last_user_agent
 * - role: enum('general','listing_member','admin')
 * - status: enum('active','suspended','banned','deleted','pending')
 * - profile_visibility: enum('public','connections','private')
 *
 * @tier ADVANCED
 * @phase Phase 6 - User Import/Export
 * @updated 2026-02-01 - Expanded to ALL 32 importable DB fields
 * @see docs/components/admin/categories/ImportExportModal.md
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getActivityLoggingService } from '@core/services/ActivityLoggingService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { parseUserJSONImport, parseUserCSVImport, parseUserSQLImport } from '@core/utils/import/userImport';
import type { ImportUserInput, ImportResult, ConflictResolution } from '@core/types/import-export';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface ImportExecuteRequest {
  format: 'json' | 'csv' | 'sql';
  content: string;
  conflictResolution: ConflictResolution;
}

/**
 * Extended user row type for existing user queries
 * DATABASE VERIFIED: 2026-02-01 - All 32 importable fields
 */
interface ExistingUserRow {
  id: number;
  email: string;
  username: string;
  // Name fields
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  // Contact
  contact_phone: string | null;
  // Profile
  avatar_url: string | null;
  avatar_bg_color: string | null;
  bio: string | null;
  occupation: string | null;
  goals: string | null;
  cover_image_url: string | null;
  // Location
  city: string | null;
  state: string | null;
  country: string | null;
  // Status flags
  is_active: number;
  is_verified: number;
  is_mock: number;
  is_business_owner: number;
  // Role and status
  role: string;
  status: string;
  user_group: string | null;
  profile_visibility: string | null;
  // Terms
  terms_accepted_at: string | null;
  terms_version: string | null;
  // JSON settings
  permissions: string | null;
  privacy_settings: string | null;
  interests: string | null;
  social_links: string | null;
  visibility_settings: string | null;
  connection_privacy: string | null;
  user_preferences: string | null;
}

export const POST = apiHandler(async (context: ApiContext) => {
  const { request, logger } = context;

  // Get current admin user
  const currentUser = await getUserFromRequest(request as NextRequest);
  if (!currentUser) {
    throw BizError.unauthorized('Authentication required');
  }
  if (currentUser.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const body = await request.json() as ImportExecuteRequest;

  // Validate request
  if (!body.format || !['json', 'csv', 'sql'].includes(body.format)) {
    throw BizError.badRequest('Invalid format. Must be json, csv, or sql');
  }

  if (!body.content || typeof body.content !== 'string') {
    throw BizError.badRequest('Content is required');
  }

  // Validate conflict resolution - now includes 'update_existing'
  if (!body.conflictResolution || !['skip', 'overwrite', 'rename', 'update_existing'].includes(body.conflictResolution)) {
    throw BizError.badRequest('Invalid conflict resolution. Must be skip, overwrite, rename, or update_existing');
  }

  // Parse content
  let users: ImportUserInput[];

  try {
    switch (body.format) {
      case 'json':
        users = parseUserJSONImport(body.content);
        break;

      case 'csv':
        users = parseUserCSVImport(body.content);
        break;

      case 'sql':
        users = parseUserSQLImport(body.content);
        break;

      default:
        throw BizError.badRequest('Unsupported format');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    throw BizError.badRequest(`Failed to parse ${body.format.toUpperCase()}: ${errorMessage}`);
  }

  const db = getDatabaseService();
  const activityService = getActivityLoggingService();

  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    renamed: 0,
    errors: []
  };

  // Process each user
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (!user) continue;

    const row = i + 1;

    try {
      // Check for existing user by email - fetch ALL importable fields
      const existing = await db.query<ExistingUserRow>(
        `SELECT id, email, username,
                first_name, last_name, display_name, contact_phone,
                avatar_url, avatar_bg_color, bio, occupation, goals, cover_image_url,
                city, state, country,
                is_active, is_verified, is_mock, is_business_owner,
                role, status, user_group, profile_visibility,
                terms_accepted_at, terms_version,
                permissions, privacy_settings, interests, social_links,
                visibility_settings, connection_privacy, user_preferences
         FROM users WHERE LOWER(email) = ?`,
        [user.email.toLowerCase()]
      );

      if (existing.rows.length > 0) {
        // Conflict exists
        const existingUser = existing.rows[0];
        if (!existingUser) continue;

        switch (body.conflictResolution) {
          case 'skip':
            result.skipped++;
            continue;

          case 'overwrite':
            // Update existing user - replace ALL fields with import data
            await db.query(
              `UPDATE users SET
                username = ?,
                first_name = ?, last_name = ?, display_name = ?, contact_phone = ?,
                avatar_url = ?, avatar_bg_color = ?, bio = ?, occupation = ?, goals = ?, cover_image_url = ?,
                city = ?, state = ?, country = ?,
                is_active = ?, is_verified = ?, is_mock = ?, is_business_owner = ?,
                role = ?, status = ?, user_group = ?, profile_visibility = ?,
                terms_accepted_at = ?, terms_version = ?,
                permissions = ?, privacy_settings = ?, interests = ?, social_links = ?,
                visibility_settings = ?, connection_privacy = ?, user_preferences = ?,
                updated_at = NOW()
              WHERE id = ?`,
              [
                user.username || existingUser.username,
                // Name & Contact
                user.first_name ?? null,
                user.last_name ?? null,
                user.display_name ?? null,
                user.contact_phone ?? null,
                // Profile
                user.avatar_url ?? null,
                user.avatar_bg_color ?? null,
                user.bio ?? null,
                user.occupation ?? null,
                user.goals ?? null,
                user.cover_image_url ?? null,
                // Location
                user.city ?? null,
                user.state ?? null,
                user.country ?? null,
                // Status flags
                user.is_active !== undefined ? (user.is_active ? 1 : 0) : 1,
                user.is_verified ? 1 : 0,
                user.is_mock ? 1 : 0,
                user.is_business_owner ? 1 : 0,
                // Role and status
                user.role || 'general',
                user.status || 'active',
                user.user_group ?? null,
                user.profile_visibility ?? null,
                // Terms
                user.terms_accepted_at ?? null,
                user.terms_version ?? null,
                // JSON settings
                user.permissions ? JSON.stringify(user.permissions) : null,
                user.privacy_settings ? JSON.stringify(user.privacy_settings) : null,
                user.interests ? JSON.stringify(user.interests) : null,
                user.social_links ? JSON.stringify(user.social_links) : null,
                user.visibility_settings ? JSON.stringify(user.visibility_settings) : null,
                user.connection_privacy ? JSON.stringify(user.connection_privacy) : null,
                user.user_preferences ? JSON.stringify(user.user_preferences) : null,
                existingUser.id
              ]
            );
            result.updated++;
            continue;

          case 'update_existing':
            // Merge - only update non-empty values from import, preserve existing for ALL fields
            await db.query(
              `UPDATE users SET
                username = ?,
                first_name = ?, last_name = ?, display_name = ?, contact_phone = ?,
                avatar_url = ?, avatar_bg_color = ?, bio = ?, occupation = ?, goals = ?, cover_image_url = ?,
                city = ?, state = ?, country = ?,
                is_active = ?, is_verified = ?, is_mock = ?, is_business_owner = ?,
                role = ?, status = ?, user_group = ?, profile_visibility = ?,
                terms_accepted_at = ?, terms_version = ?,
                permissions = ?, privacy_settings = ?, interests = ?, social_links = ?,
                visibility_settings = ?, connection_privacy = ?, user_preferences = ?,
                updated_at = NOW()
              WHERE id = ?`,
              [
                // Only update if import has non-empty value, else preserve existing
                user.username || existingUser.username,
                // Name & Contact
                user.first_name ?? existingUser.first_name,
                user.last_name ?? existingUser.last_name,
                user.display_name ?? existingUser.display_name,
                user.contact_phone ?? existingUser.contact_phone,
                // Profile
                user.avatar_url ?? existingUser.avatar_url,
                user.avatar_bg_color ?? existingUser.avatar_bg_color,
                user.bio ?? existingUser.bio,
                user.occupation ?? existingUser.occupation,
                user.goals ?? existingUser.goals,
                user.cover_image_url ?? existingUser.cover_image_url,
                // Location
                user.city ?? existingUser.city,
                user.state ?? existingUser.state,
                user.country ?? existingUser.country,
                // Status flags
                user.is_active !== undefined ? (user.is_active ? 1 : 0) : existingUser.is_active,
                user.is_verified !== undefined ? (user.is_verified ? 1 : 0) : existingUser.is_verified,
                user.is_mock !== undefined ? (user.is_mock ? 1 : 0) : existingUser.is_mock,
                user.is_business_owner !== undefined ? (user.is_business_owner ? 1 : 0) : existingUser.is_business_owner,
                // Role and status
                user.role || existingUser.role,
                user.status || existingUser.status,
                user.user_group ?? existingUser.user_group,
                user.profile_visibility ?? existingUser.profile_visibility,
                // Terms
                user.terms_accepted_at ?? existingUser.terms_accepted_at,
                user.terms_version ?? existingUser.terms_version,
                // JSON settings - preserve existing if import is empty
                user.permissions ? JSON.stringify(user.permissions) : existingUser.permissions,
                user.privacy_settings ? JSON.stringify(user.privacy_settings) : existingUser.privacy_settings,
                user.interests ? JSON.stringify(user.interests) : existingUser.interests,
                user.social_links ? JSON.stringify(user.social_links) : existingUser.social_links,
                user.visibility_settings ? JSON.stringify(user.visibility_settings) : existingUser.visibility_settings,
                user.connection_privacy ? JSON.stringify(user.connection_privacy) : existingUser.connection_privacy,
                user.user_preferences ? JSON.stringify(user.user_preferences) : existingUser.user_preferences,
                existingUser.id
              ]
            );
            result.updated++;
            continue;

          case 'rename':
            // Create with modified email
            const renamedEmail = `imported_${Date.now()}_${user.email}`;
            user.email = renamedEmail;
            result.renamed++;
            // Fall through to create
            break;
        }
      }

      // Create new user
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      const uuid = crypto.randomUUID();
      const username = user.username || user.email.split('@')[0] || `user_${Date.now()}`;

      // Check username uniqueness
      const usernameExists = await db.query<{ id: number }>(
        'SELECT id FROM users WHERE LOWER(username) = ?',
        [username.toLowerCase()]
      );

      let finalUsername = username;
      if (usernameExists.rows.length > 0) {
        finalUsername = `${username}_${Date.now()}`;
      }

      // Create user with ALL 32 importable fields
      await db.query(
        `INSERT INTO users (
          uuid, email, email_normalized, username, password_hash,
          first_name, last_name, display_name, contact_phone,
          avatar_url, avatar_bg_color, bio, occupation, goals, cover_image_url,
          city, state, country,
          is_active, is_verified, is_mock, is_business_owner,
          role, status, user_group, profile_visibility,
          terms_accepted_at, terms_version,
          permissions, privacy_settings, interests, social_links,
          visibility_settings, connection_privacy, user_preferences,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          uuid,
          user.email.toLowerCase(),
          user.email.toLowerCase(), // email_normalized - required for UNIQUE constraint
          finalUsername.toLowerCase(),
          passwordHash,
          // Name & Contact
          user.first_name ?? null,
          user.last_name ?? null,
          user.display_name ?? null,
          user.contact_phone ?? null,
          // Profile
          user.avatar_url ?? null,
          user.avatar_bg_color ?? null,
          user.bio ?? null,
          user.occupation ?? null,
          user.goals ?? null,
          user.cover_image_url ?? null,
          // Location
          user.city ?? null,
          user.state ?? null,
          user.country ?? null,
          // Status flags
          user.is_active !== undefined ? (user.is_active ? 1 : 0) : 1,
          user.is_verified ? 1 : 0,
          user.is_mock ? 1 : 0,
          user.is_business_owner ? 1 : 0,
          // Role and status
          user.role || 'general',
          user.status || 'active',
          user.user_group ?? null,
          user.profile_visibility ?? null,
          // Terms
          user.terms_accepted_at ?? null,
          user.terms_version ?? null,
          // JSON settings
          user.permissions ? JSON.stringify(user.permissions) : null,
          user.privacy_settings ? JSON.stringify(user.privacy_settings) : null,
          user.interests ? JSON.stringify(user.interests) : null,
          user.social_links ? JSON.stringify(user.social_links) : null,
          user.visibility_settings ? JSON.stringify(user.visibility_settings) : null,
          user.connection_privacy ? JSON.stringify(user.connection_privacy) : null,
          user.user_preferences ? JSON.stringify(user.user_preferences) : null
        ]
      );

      result.imported++;
    } catch (error) {
      result.errors.push({
        row,
        field: 'general',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Log activity
  await activityService.logActivity({
    userId: currentUser.id,
    action: 'users_imported',
    actionType: 'account',
    description: `Imported users: ${result.imported} new, ${result.updated} updated, ${result.skipped} skipped, ${result.renamed} renamed, ${result.errors.length} errors`,
    entityType: 'user',
    success: true,
    metadata: {
      format: body.format,
      conflictResolution: body.conflictResolution,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      renamed: result.renamed,
      errorCount: result.errors.length
    }
  });

  // Log admin activity for audit trail
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: currentUser.id,
    targetEntityType: 'user',
    targetEntityId: 0,
    actionType: 'users_imported',
    actionCategory: 'import',
    actionDescription: `Imported users: ${result.imported} new, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`,
    afterData: { format: body.format, conflictResolution: body.conflictResolution, ...result },
    severity: 'normal'
  });

  logger.info('User import completed', {
    operation: 'import-users',
    metadata: {
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      renamed: result.renamed,
      errorCount: result.errors.length
    }
  });

  return createSuccessResponse(result);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
});
