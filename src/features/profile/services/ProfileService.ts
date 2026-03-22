/**
 * ProfileService - User Profile Data Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/features/dashboard/services/DashboardService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { getActivityLoggingService, ActivityLoggingService } from '@core/services/ActivityLoggingService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import bcrypt from 'bcryptjs';
import {
  PublicProfile,
  ProfileStats,
  ProfileUpdateData,
  UserProfileRow,
  ProfileVisibilitySettings,
  UserProfilePreferences,
  ProfileLayout,
  DEFAULT_PROFILE_LAYOUT,
  mergeWithDefaultLayout
} from '../types';
import { bigIntToNumber } from '@core/utils/bigint';

/**
 * Context for tracking who made profile changes and from where
 * Used for Full Audit Trail (Option C) activity logging
 */
export interface ProfileUpdateContext {
  /** Hashed IP address (PII-compliant) */
  hashedIP?: string;
  /** User agent string */
  userAgent?: string;
  /** Coarse location (city/region only) */
  location?: string;
  /** Session ID for correlation */
  sessionId?: string;
}

// ============================================================================
// ProfileService Implementation
// ============================================================================

export class ProfileService {
  private db: DatabaseService;
  private activityLogger: ActivityLoggingService;

  constructor(db: DatabaseService) {
    this.db = db;
    this.activityLogger = getActivityLoggingService();
  }

  // ==========================================================================
  // Public Profile Retrieval
  // ==========================================================================

  /**
   * Get public profile by username
   * @param username Username to look up
   * @param viewerId Optional viewer's user ID (for visibility checks)
   * @returns Public profile data
   */
  async getPublicProfile(username: string, viewerId?: number): Promise<PublicProfile | null> {
    // First, check account status (minimal query)
    // @reference src/core/types/db-rows.ts - status field and deleted_at
    const statusResult: DbResult<{ id: number; username: string; status: string; deleted_at: string | null }> = await this.db.query(
      'SELECT id, username, status, deleted_at FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    const statusRow = statusResult.rows[0];
    if (!statusRow) {
      return null;
    }

    // Check for suspended/deleted BEFORE visibility logic
    if (statusRow.status === 'suspended') {
      // Get suspension reason from admin_activity
      const reasonResult: DbResult<{ action_description: string; after_data: string | Record<string, unknown> | null }> = await this.db.query(
        `SELECT action_description, after_data
         FROM admin_activity
         WHERE target_user_id = ?
           AND action_type IN ('user_suspended', 'user_deleted')
         ORDER BY created_at DESC
         LIMIT 1`,
        [statusRow.id]
      );

      let reason: string | null = null;
      const activity = reasonResult.rows[0];
      if (activity) {
        reason = activity.action_description || null;
        // Try to extract reason from after_data JSON
        if (activity.after_data) {
          try {
            const afterData = typeof activity.after_data === 'string'
              ? JSON.parse(activity.after_data)
              : activity.after_data;
            if (afterData && typeof afterData.reason === 'string') {
              reason = afterData.reason;
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }

      throw BizError.accountSuspended(statusRow.username, reason);
    }

    if (statusRow.status === 'deleted' || statusRow.deleted_at) {
      throw BizError.accountDeleted(statusRow.username);
    }

    // @reference src/core/types/db-rows.ts - Uses first_name, last_name (NOT 'name')
    // @reference migrations/003_add_users_table.sql - Actual column definitions
    const result: DbResult<UserProfileRow> = await this.db.query(
      `SELECT
        id,
        username,
        first_name,
        last_name,
        display_name,
        contact_phone,
        email,
        bio,
        occupation,
        goals,
        social_links,
        avatar_url,
        avatar_bg_color,
        cover_image_url,
        city,
        state,
        country,
        hometown,
        high_school,
        high_school_year,
        college,
        college_year,
        degree,
        skills,
        hobbies,
        role,
        created_at,
        profile_visibility,
        visibility_settings,
        user_preferences
      FROM users
      WHERE username = ?
      LIMIT 1`,
      [username]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    // Check visibility
    const isOwner = viewerId ? row.id === viewerId : false;
    const visibility = row.profile_visibility ?? 'public';

    if (visibility === 'private' && !isOwner) {
      // Check if viewer is admin
      if (viewerId) {
        const viewerResult: DbResult<{ role: string }> = await this.db.query(
          'SELECT role FROM users WHERE id = ?',
          [viewerId]
        );
        if (viewerResult.rows[0]?.role !== 'admin') {
          return null; // Private profile, not owner or admin
        }
      } else {
        return null;
      }
    }

    if (visibility === 'connections' && !isOwner) {
      // Check if viewer is connected
      if (viewerId) {
        const isConnected = await this.isConnected(row.id, viewerId);
        if (!isConnected) {
          // Check if admin
          const viewerResult: DbResult<{ role: string }> = await this.db.query(
            'SELECT role FROM users WHERE id = ?',
            [viewerId]
          );
          if (viewerResult.rows[0]?.role !== 'admin') {
            return null; // Connections only, not connected or admin
          }
        }
      } else {
        return null;
      }
    }

    // Determine connection status for field-level visibility filtering
    const isConnected = viewerId && !isOwner ? await this.isConnected(row.id, viewerId) : false;

    return this.mapRowToProfile(row, isOwner, isConnected);
  }

  /**
   * Get profile by user ID
   * @param userId User ID
   * @returns Profile data
   */
  async getProfileById(userId: number): Promise<PublicProfile | null> {
    // @reference src/core/types/db-rows.ts - Uses first_name, last_name (NOT 'name')
    const result: DbResult<UserProfileRow> = await this.db.query(
      `SELECT
        id,
        username,
        first_name,
        last_name,
        display_name,
        contact_phone,
        email,
        bio,
        occupation,
        goals,
        social_links,
        avatar_url,
        avatar_bg_color,
        cover_image_url,
        city,
        state,
        country,
        hometown,
        high_school,
        high_school_year,
        college,
        college_year,
        degree,
        skills,
        hobbies,
        role,
        created_at,
        profile_visibility,
        visibility_settings,
        user_preferences
      FROM users
      WHERE id = ?
      LIMIT 1`,
      [userId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToProfile(row);
  }

  // ==========================================================================
  // Profile Statistics
  // ==========================================================================

  /**
   * Get profile statistics for user
   * @param userId User ID
   * @returns Profile statistics
   *
   * @reference Database schema analysis 2026-01-12:
   * - profile_view: EXISTS with profile_owner_id, viewed_at columns
   * - user_connection: EXISTS with sender_user_id, receiver_user_id, status columns
   * - reviews: EXISTS but is for LISTING reviews (listing_id, user_id), NOT user recommendations
   *
   * @note recommendations returns 0 until a proper user recommendation system is implemented
   */
  async getProfileStats(userId: number): Promise<ProfileStats> {
    // Query only tables/columns that exist in the database
    // The reviews table is for listing reviews, not user-to-user recommendations
    // GOVERNANCE: mariadb returns BigInt for COUNT(*) - subqueries return bigint
    const result: DbResult<{
      profile_views: bigint | number;
      connections: bigint | number;
    }> = await this.db.query(
      `SELECT
        (SELECT COUNT(*) FROM profile_view WHERE profile_owner_id = ? AND viewed_at > DATE_SUB(NOW(), INTERVAL 30 DAY)) as profile_views,
        (SELECT COUNT(*) FROM user_connection WHERE (sender_user_id = ? OR receiver_user_id = ?) AND status = 'connected') as connections`,
      [userId, userId, userId]
    );

    const stats = result.rows[0];
    return {
      profile_views: bigIntToNumber(stats?.profile_views),
      connections: bigIntToNumber(stats?.connections),
      // Recommendations feature not yet implemented - no user_recommendations table exists
      // The reviews table is for listing reviews, not user recommendations
      recommendations: 0
    };
  }

  // ==========================================================================
  // Profile Update
  // ==========================================================================

  /**
   * Update user profile with Full Audit Trail logging
   * @param userId User ID
   * @param data Profile data to update
   * @param context Optional context for audit trail (IP, user agent, etc.)
   * @returns Updated profile
   */
  async updateProfile(
    userId: number,
    data: ProfileUpdateData,
    context?: ProfileUpdateContext
  ): Promise<PublicProfile> {
    // Get current profile for change tracking
    const currentProfile = await this.getProfileById(userId);
    if (!currentProfile) {
      throw BizError.notFound('User not found');
    }

    // Track field changes for audit trail (Option C: Full Audit Trail)
    const changedFields: Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    // Build dynamic update query with change tracking
    // @note Uses first_name and last_name columns (NOT 'name')
    if (data.first_name !== undefined && data.first_name !== (currentProfile.name?.split(' ')[0] || null)) {
      updateFields.push('first_name = ?');
      updateValues.push(data.first_name);
      changedFields.push({
        field: 'first_name',
        oldValue: currentProfile.name?.split(' ')[0] || null,
        newValue: data.first_name
      });
    }
    if (data.last_name !== undefined) {
      const oldLastName = currentProfile.name?.split(' ').slice(1).join(' ') || null;
      if (data.last_name !== oldLastName) {
        updateFields.push('last_name = ?');
        updateValues.push(data.last_name);
        changedFields.push({
          field: 'last_name',
          oldValue: oldLastName,
          newValue: data.last_name
        });
      }
    }
    if (data.display_name !== undefined && data.display_name !== currentProfile.display_name) {
      updateFields.push('display_name = ?');
      updateValues.push(data.display_name);
      changedFields.push({
        field: 'display_name',
        oldValue: currentProfile.display_name,
        newValue: data.display_name
      });
    }
    if (data.contact_phone !== undefined && data.contact_phone !== currentProfile.contact_phone) {
      updateFields.push('contact_phone = ?');
      updateValues.push(data.contact_phone || null);
      changedFields.push({
        field: 'contact_phone',
        oldValue: currentProfile.contact_phone ? '[phone]' : null,
        newValue: data.contact_phone ? '[phone]' : null
      });
    }
    if (data.bio !== undefined) {
      // Convert empty string to null for cleaner DB storage
      const newBio = data.bio?.trim() || null;
      if (newBio !== (currentProfile.bio || null)) {
        updateFields.push('bio = ?');
        updateValues.push(newBio);
        changedFields.push({
          field: 'bio',
          oldValue: currentProfile.bio ? '[bio updated]' : null,
          newValue: newBio ? '[bio updated]' : null
        });
      }
    }
    if (data.occupation !== undefined) {
      const newOccupation = data.occupation?.trim() || null;
      if (newOccupation !== (currentProfile.occupation || null)) {
        updateFields.push('occupation = ?');
        updateValues.push(newOccupation);
        changedFields.push({
          field: 'occupation',
          oldValue: currentProfile.occupation,
          newValue: newOccupation
        });
      }
    }
    if (data.goals !== undefined) {
      const newGoals = data.goals?.trim() || null;
      if (newGoals !== (currentProfile.goals || null)) {
        updateFields.push('goals = ?');
        updateValues.push(newGoals);
        changedFields.push({
          field: 'goals',
          oldValue: currentProfile.goals ? '[goals updated]' : null,
          newValue: newGoals ? '[goals updated]' : null
        });
      }
    }
    if (data.social_links !== undefined) {
      const oldLinks = JSON.stringify(currentProfile.social_links || {});
      const newLinks = JSON.stringify(data.social_links);
      if (oldLinks !== newLinks) {
        updateFields.push('social_links = ?');
        updateValues.push(newLinks);
        changedFields.push({
          field: 'social_links',
          oldValue: '[social links updated]',
          newValue: '[social links updated]'
        });
      }
    }
    if (data.avatar_url !== undefined && data.avatar_url !== currentProfile.avatar_url) {
      updateFields.push('avatar_url = ?');
      updateValues.push(data.avatar_url === null ? null : data.avatar_url);
      changedFields.push({
        field: 'avatar_url',
        oldValue: currentProfile.avatar_url ? '[avatar]' : null,
        newValue: data.avatar_url ? '[avatar]' : null
      });
    }
    if (data.cover_image_url !== undefined && data.cover_image_url !== currentProfile.cover_image_url) {
      updateFields.push('cover_image_url = ?');
      updateValues.push(data.cover_image_url === null ? null : data.cover_image_url);
      changedFields.push({
        field: 'cover_image_url',
        oldValue: currentProfile.cover_image_url ? '[cover image]' : null,
        newValue: data.cover_image_url ? '[cover image]' : null
      });
    }
    if (data.city !== undefined && data.city !== currentProfile.city) {
      updateFields.push('city = ?');
      updateValues.push(data.city);
      changedFields.push({
        field: 'city',
        oldValue: currentProfile.city,
        newValue: data.city
      });
    }
    if (data.state !== undefined && data.state !== currentProfile.state) {
      updateFields.push('state = ?');
      updateValues.push(data.state);
      changedFields.push({
        field: 'state',
        oldValue: currentProfile.state,
        newValue: data.state
      });
    }
    if (data.country !== undefined && data.country !== currentProfile.country) {
      updateFields.push('country = ?');
      updateValues.push(data.country);
      changedFields.push({
        field: 'country',
        oldValue: currentProfile.country,
        newValue: data.country
      });
    }
    if (data.profile_visibility !== undefined && data.profile_visibility !== currentProfile.profile_visibility) {
      updateFields.push('profile_visibility = ?');
      updateValues.push(data.profile_visibility);
      changedFields.push({
        field: 'profile_visibility',
        oldValue: currentProfile.profile_visibility,
        newValue: data.profile_visibility
      });
    }
    if (data.avatar_bg_color !== undefined && data.avatar_bg_color !== currentProfile.avatar_bg_color) {
      updateFields.push('avatar_bg_color = ?');
      updateValues.push(data.avatar_bg_color);
      changedFields.push({
        field: 'avatar_bg_color',
        oldValue: currentProfile.avatar_bg_color,
        newValue: data.avatar_bg_color
      });
    }
    if (data.visibility_settings !== undefined) {
      const oldSettings = JSON.stringify(currentProfile.visibility_settings || {});
      const newSettings = JSON.stringify(data.visibility_settings);
      if (oldSettings !== newSettings) {
        updateFields.push('visibility_settings = ?');
        updateValues.push(newSettings);
        changedFields.push({
          field: 'visibility_settings',
          oldValue: '[visibility settings]',
          newValue: '[visibility settings updated]'
        });
      }
    }
    if (data.user_preferences !== undefined) {
      const oldPrefs = JSON.stringify(currentProfile.user_preferences || {});
      const newPrefs = JSON.stringify(data.user_preferences);
      if (oldPrefs !== newPrefs) {
        updateFields.push('user_preferences = ?');
        updateValues.push(newPrefs);
        changedFields.push({
          field: 'user_preferences',
          oldValue: '[preferences]',
          newValue: '[preferences updated]'
        });
      }
    }

    // Phase 2: Extended biographical fields
    if (data.hometown !== undefined && data.hometown !== currentProfile.hometown) {
      updateFields.push('hometown = ?');
      updateValues.push(data.hometown || null);
      changedFields.push({
        field: 'hometown',
        oldValue: currentProfile.hometown,
        newValue: data.hometown || null
      });
    }
    if (data.high_school !== undefined && data.high_school !== currentProfile.high_school) {
      updateFields.push('high_school = ?');
      updateValues.push(data.high_school || null);
      changedFields.push({
        field: 'high_school',
        oldValue: currentProfile.high_school,
        newValue: data.high_school || null
      });
    }
    if (data.high_school_year !== undefined && data.high_school_year !== currentProfile.high_school_year) {
      updateFields.push('high_school_year = ?');
      updateValues.push(data.high_school_year || null);
      changedFields.push({
        field: 'high_school_year',
        oldValue: currentProfile.high_school_year?.toString() || null,
        newValue: data.high_school_year?.toString() || null
      });
    }
    if (data.college !== undefined && data.college !== currentProfile.college) {
      updateFields.push('college = ?');
      updateValues.push(data.college || null);
      changedFields.push({
        field: 'college',
        oldValue: currentProfile.college,
        newValue: data.college || null
      });
    }
    if (data.college_year !== undefined && data.college_year !== currentProfile.college_year) {
      updateFields.push('college_year = ?');
      updateValues.push(data.college_year || null);
      changedFields.push({
        field: 'college_year',
        oldValue: currentProfile.college_year?.toString() || null,
        newValue: data.college_year?.toString() || null
      });
    }
    if (data.degree !== undefined && data.degree !== currentProfile.degree) {
      updateFields.push('degree = ?');
      updateValues.push(data.degree || null);
      changedFields.push({
        field: 'degree',
        oldValue: currentProfile.degree,
        newValue: data.degree || null
      });
    }
    if (data.skills !== undefined) {
      const oldSkills = JSON.stringify(currentProfile.skills || []);
      const newSkills = JSON.stringify(data.skills);
      if (oldSkills !== newSkills) {
        updateFields.push('skills = ?');
        updateValues.push(newSkills);
        changedFields.push({
          field: 'skills',
          oldValue: `[${(currentProfile.skills || []).length} skills]`,
          newValue: `[${data.skills.length} skills]`
        });
      }
    }
    if (data.hobbies !== undefined) {
      const newHobbies = data.hobbies?.trim() || null;
      if (newHobbies !== (currentProfile.hobbies || null)) {
        updateFields.push('hobbies = ?');
        updateValues.push(newHobbies);
        changedFields.push({
          field: 'hobbies',
          oldValue: currentProfile.hobbies ? '[hobbies updated]' : null,
          newValue: newHobbies ? '[hobbies updated]' : null
        });
      }
    }

    if (updateFields.length === 0) {
      // No fields to update, return current profile
      return currentProfile;
    }

    // Add updated_at
    updateFields.push('updated_at = NOW()');

    // Add userId for WHERE clause
    updateValues.push(userId);

    await this.db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Log activity with Full Audit Trail (Option C)
    const changedFieldsList = changedFields.map(f => f.field).join(', ');
    await this.activityLogger.logActivity({
      userId,
      action: 'profile_update',
      actionType: 'account',
      description: `User updated profile: ${changedFieldsList}`,
      hashedIP: context?.hashedIP,
      userAgent: context?.userAgent,
      location: context?.location,
      sessionId: context?.sessionId,
      success: true,
      metadata: {
        changedFields: changedFields.map(f => ({
          field: f.field,
          from: f.oldValue,
          to: f.newValue
        }))
      }
    });

    // Return updated profile
    const updatedProfile = await this.getProfileById(userId);
    if (!updatedProfile) {
      throw BizError.internalServerError('ProfileService', new Error('Failed to retrieve updated profile'));
    }

    return updatedProfile;
  }

  // ==========================================================================
  // Password Change
  // ==========================================================================

  // ==========================================================================
  // Profile Layout Management
  // ==========================================================================

  /**
   * Get user's profile layout preferences
   * @param userId User ID
   * @returns Profile layout configuration
   */
  async getProfileLayout(userId: number): Promise<ProfileLayout> {
    const result = await this.db.query<{ profile_layout: string | ProfileLayout | null }>(
      'SELECT profile_layout FROM users WHERE id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return DEFAULT_PROFILE_LAYOUT;
    }

    const row = result.rows[0];
    if (!row) {
      return DEFAULT_PROFILE_LAYOUT;
    }

    const layout = typeof row.profile_layout === 'string'
      ? JSON.parse(row.profile_layout)
      : row.profile_layout;

    return mergeWithDefaultLayout(layout);
  }

  /**
   * Update user's profile layout preferences
   * @param userId User ID
   * @param layout New layout configuration
   * @returns Updated profile layout
   */
  async updateProfileLayout(userId: number, layout: ProfileLayout): Promise<ProfileLayout> {
    const updatedLayout: ProfileLayout = {
      ...layout,
      updatedAt: new Date().toISOString()
    };

    await this.db.query(
      'UPDATE users SET profile_layout = ? WHERE id = ?',
      [JSON.stringify(updatedLayout), userId]
    );

    return updatedLayout;
  }

  /**
   * Reset user's profile layout to default
   * @param userId User ID
   * @returns Default profile layout
   */
  async resetProfileLayout(userId: number): Promise<ProfileLayout> {
    const defaultLayout: ProfileLayout = {
      ...DEFAULT_PROFILE_LAYOUT,
      updatedAt: new Date().toISOString()
    };

    await this.db.query(
      'UPDATE users SET profile_layout = ? WHERE id = ?',
      [JSON.stringify(defaultLayout), userId]
    );

    return defaultLayout;
  }

  // ==========================================================================
  // Password Change
  // ==========================================================================

  /**
   * Change user password with Full Audit Trail logging
   * @param userId User ID
   * @param currentPassword Current password for verification
   * @param newPassword New password to set
   * @param context Optional context for audit trail (IP, user agent, etc.)
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    context?: ProfileUpdateContext
  ): Promise<void> {
    // Get current password hash
    const result: DbResult<{ password_hash: string }> = await this.db.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      throw BizError.notFound('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      // Log failed password change attempt
      await this.activityLogger.logActivity({
        userId,
        action: 'password_change_failed',
        actionType: 'password',
        description: 'Password change failed: incorrect current password',
        hashedIP: context?.hashedIP,
        userAgent: context?.userAgent,
        location: context?.location,
        sessionId: context?.sessionId,
        success: false,
        errorMessage: 'Current password verification failed'
      });
      throw BizError.badRequest('Current password is incorrect');
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.db.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newHash, userId]
    );

    // Log successful password change (Option C: Full Audit Trail)
    await this.activityLogger.logActivity({
      userId,
      action: 'password_changed',
      actionType: 'password',
      description: 'User changed password successfully',
      hashedIP: context?.hashedIP,
      userAgent: context?.userAgent,
      location: context?.location,
      sessionId: context?.sessionId,
      success: true,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  // ==========================================================================
  // Connection Check
  // ==========================================================================

  /**
   * Check if two users are connected
   * @param userId First user ID
   * @param targetUserId Second user ID
   * @returns Whether they are connected
   */
  async isConnected(userId: number, targetUserId: number): Promise<boolean> {
    // GOVERNANCE: mariadb returns BigInt for COUNT(*) - must convert to Number
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as count
       FROM user_connection
       WHERE ((sender_user_id = ? AND receiver_user_id = ?)
          OR (sender_user_id = ? AND receiver_user_id = ?))
         AND status = 'connected'`,
      [userId, targetUserId, targetUserId, userId]
    );

    return bigIntToNumber(result.rows[0]?.count) > 0;
  }

  // ==========================================================================
  // Profile View Tracking
  // ==========================================================================

  /**
   * Record a profile view
   * @param profileUserId Profile owner's user ID
   * @param viewerId Viewer's user ID
   * @note Respects user's allowProfileViews visibility setting
   */
  async recordProfileView(profileUserId: number, viewerId: number): Promise<void> {
    // Don't record self-views
    if (profileUserId === viewerId) {
      return;
    }

    try {
      // Check if profile owner allows profile view tracking
      const settingsResult: DbResult<{ visibility_settings: string | null }> = await this.db.query(
        'SELECT visibility_settings FROM users WHERE id = ?',
        [profileUserId]
      );

      const row = settingsResult.rows[0];
      if (row?.visibility_settings) {
        try {
          const settings = JSON.parse(row.visibility_settings) as ProfileVisibilitySettings;
          // If user has disabled profile view tracking, don't record
          if (settings.allowProfileViews === false) {
            return;
          }
        } catch {
          // If JSON parse fails, allow tracking (default behavior)
        }
      }

      await this.db.query(
        `INSERT INTO profile_view (profile_owner_id, viewer_user_id, viewed_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE viewed_at = NOW()`,
        [profileUserId, viewerId]
      );
    } catch {
      // Silently fail if profile_view table doesn't exist
      // This is optional functionality
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Map database row to PublicProfile
   * @param row Database row
   * @param isOwner Whether viewer is the profile owner (sees all fields)
   * @param isConnected Whether viewer is connected to profile owner
   * @note Computes 'name' from first_name + last_name for backward compatibility
   * @note Applies field-level visibility filtering based on visibility_settings
   */
  private mapRowToProfile(row: UserProfileRow, isOwner: boolean = true, isConnected: boolean = false): PublicProfile {
    let socialLinks: Record<string, string> | null = null;
    let visibilitySettings: ProfileVisibilitySettings | null = null;
    let userPreferences: UserProfilePreferences | null = null;

    // GOVERNANCE: MariaDB auto-parses JSON columns - handle both string and object
    // @see docs/dna/mariadb-behavioral-patterns.md
    if (row.social_links) {
      if (typeof row.social_links === 'string') {
        try {
          socialLinks = JSON.parse(row.social_links);
        } catch {
          socialLinks = null;
        }
      } else if (typeof row.social_links === 'object') {
        // Already parsed by MariaDB driver
        socialLinks = row.social_links as Record<string, string>;
      }
    }

    // Phase 2: Parse skills JSON
    // GOVERNANCE: MariaDB auto-parses JSON columns - handle both string and array
    // @see docs/dna/mariadb-behavioral-patterns.md
    let skills: string[] | null = null;
    if (row.skills) {
      if (typeof row.skills === 'string') {
        try {
          skills = JSON.parse(row.skills);
        } catch {
          skills = null;
        }
      } else if (Array.isArray(row.skills)) {
        // Already parsed by MariaDB driver
        skills = row.skills as string[];
      }
    }

    // GOVERNANCE: MariaDB auto-parses JSON columns - handle both string and object
    // @see docs/dna/mariadb-behavioral-patterns.md
    if (row.visibility_settings) {
      if (typeof row.visibility_settings === 'string') {
        try {
          visibilitySettings = JSON.parse(row.visibility_settings);
        } catch {
          visibilitySettings = null;
        }
      } else {
        // Already parsed by MariaDB driver
        visibilitySettings = row.visibility_settings as ProfileVisibilitySettings;
      }
    }

    // GOVERNANCE: MariaDB auto-parses JSON columns - handle both string and object
    if (row.user_preferences) {
      if (typeof row.user_preferences === 'string') {
        try {
          userPreferences = JSON.parse(row.user_preferences);
        } catch {
          userPreferences = null;
        }
      } else {
        // Already parsed by MariaDB driver
        userPreferences = row.user_preferences as UserProfilePreferences;
      }
    }

    // Compute full name from first_name and last_name
    // Falls back to display_name if both are null
    let computedName: string | null = null;
    if (row.first_name || row.last_name) {
      computedName = [row.first_name, row.last_name].filter(Boolean).join(' ') || null;
    }

    // ==========================================================================
    // Field-Level Visibility Filtering
    // Owner always sees all fields. Non-owners see fields based on visibility_settings.
    // ==========================================================================
    const canViewField = (fieldVisibility: 'public' | 'connections' | 'hidden' | undefined): boolean => {
      if (isOwner) return true; // Owner sees everything
      if (!fieldVisibility || fieldVisibility === 'public') return true; // Public fields visible to all
      if (fieldVisibility === 'connections' && isConnected) return true; // Connections-only visible to connected users
      return false; // Hidden fields not visible
    };

    // Apply visibility filtering to sensitive fields
    const filteredEmail = canViewField(visibilitySettings?.showEmail) ? row.email : null;
    const filteredPhone = canViewField(visibilitySettings?.showPhone) ? row.contact_phone : null;
    const filteredLocation = canViewField(visibilitySettings?.showLocation)
      ? { city: row.city, state: row.state, country: row.country }
      : { city: null, state: null, country: null };
    const filteredOccupation = canViewField(visibilitySettings?.showOccupation) ? row.occupation : null;
    const filteredSocialLinks = canViewField(visibilitySettings?.showSocialLinks) ? socialLinks : null;

    // Boolean visibility settings (showGoals defaults to true if not set)
    const canViewGoals = isOwner || (visibilitySettings?.showGoals !== false);
    const filteredGoals = canViewGoals ? row.goals : null;

    // Phase 2: Apply visibility filtering for new fields
    const filteredHometown = canViewField(visibilitySettings?.showHometown) ? row.hometown : null;
    const filteredEducation = canViewField(visibilitySettings?.showEducation)
      ? {
          high_school: row.high_school,
          high_school_year: row.high_school_year,
          college: row.college,
          college_year: row.college_year,
          degree: row.degree
        }
      : {
          high_school: null,
          high_school_year: null,
          college: null,
          college_year: null,
          degree: null
        };
    const filteredSkills = canViewField(visibilitySettings?.showSkills) ? skills : null;
    const filteredHobbies = canViewField(visibilitySettings?.showHobbies) ? row.hobbies : null;

    return {
      id: row.id,
      username: row.username,
      name: computedName,
      display_name: row.display_name,
      email: filteredEmail,
      contact_phone: filteredPhone,
      bio: row.bio,
      occupation: filteredOccupation,
      goals: filteredGoals,
      social_links: filteredSocialLinks,
      avatar_url: row.avatar_url,
      avatar_bg_color: row.avatar_bg_color ?? '#022641',  // Default to navy blue
      cover_image_url: row.cover_image_url,
      city: filteredLocation.city,
      state: filteredLocation.state,
      country: filteredLocation.country,
      hometown: filteredHometown,
      high_school: filteredEducation.high_school,
      high_school_year: filteredEducation.high_school_year,
      college: filteredEducation.college,
      college_year: filteredEducation.college_year,
      degree: filteredEducation.degree,
      skills: filteredSkills,
      hobbies: filteredHobbies,
      membership_tier: row.role ?? 'general',  // Use 'role' column (no 'membership_tier' in DB)
      role: row.role,
      created_at: new Date(row.created_at),
      profile_visibility: row.profile_visibility ?? 'public',
      // Only return visibility_settings and user_preferences to the owner
      visibility_settings: isOwner ? visibilitySettings : null,
      user_preferences: isOwner ? userPreferences : null
    };
  }
}
