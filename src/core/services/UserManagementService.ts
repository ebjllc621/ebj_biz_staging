/**
 * UserManagementService - User Management & Administration Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - UserRepo integration for data access
 * - Account type management (visitor/general/listing_member/admin)
 * - Tag system with JSON storage
 * - Activity tracking via user_log table
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 4 Brain Plan - Service Layer Implementation
 * @phase Phase 4 - Task 4.7: UserManagementService Implementation (FINAL SERVICE)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { getUserRepo, UserRepo } from '@core/repositories/UserRepo';
import { getActivityLoggingService, ActivityLoggingService } from '@core/services/ActivityLoggingService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { UserRow, ListingRow } from '@core/types/db-rows';
import { bigIntToNumber } from '@core/utils/bigint';

// Aggregate query result types
interface CountRow {
  count: bigint | number;
}

interface RoleCountRow {
  role: string;
  count: bigint | number;
}

interface StatusCountRow {
  status: string;
  count: bigint | number;
}

// User log table row interface
interface UserLogRow {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  action_type: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  browser_info: string | null;
  device_type: string | null;
  location: string | null;
  referrer: string | null;
  session_id: string | null;
  duration: number | null;
  success: number; // TINYINT(1)
  error_message: string | null;
  metadata: string | null; // JSON column
  created_at: string; // ISO timestamp
  updated_at: string | null; // ISO timestamp
}

// Login history query result
interface LoginHistoryRow {
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  success: number; // TINYINT(1)
}

// Last activity timestamp query result
interface LastActivityRow {
  created_at: string;
}

// ============================================================================
// TypeScript Interfaces & Enums
// ============================================================================

/**
 * Account type enum (from Phase 4 Brain Plan)
 * Maps to users.status field in database
 */
export enum AccountType {
  VISITOR = 'visitor',
  GENERAL = 'general',
  LISTING_MEMBER = 'listing_member',
  ADMIN = 'admin'
}

/**
 * User status enum (from database schema)
 */
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  DELETED = 'deleted',
  PENDING = 'pending'
}

/**
 * Extended User interface with all fields from Phase 3B schema
 */
export interface User {
  id: number;
  uuid: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  password_changed_at: Date;
  failed_login_attempts: number;
  locked_until: Date | null;
  deleted_at: Date | null;
  email_normalized: string;
  password_hash: string;
  role: 'general' | 'listing_member' | 'admin';
  is_verified: boolean;
  is_mock: boolean;
  created_at: Date;
  updated_at: Date;
  user_group: string | null;
  permissions: string[] | null; // Parsed from JSON
  is_business_owner: boolean;
  privacy_settings: Record<string, unknown> | null; // Parsed from JSON
  login_count: number;
  last_ip_address: string | null;
  last_user_agent: string | null;
  terms_accepted_at: Date | null;
  terms_version: string | null;
  status: UserStatus;
}

/**
 * Update user input (partial update)
 */
export interface UpdateUserInput {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  user_group?: string;
  permissions?: string[];
  is_business_owner?: boolean;
  privacy_settings?: Record<string, unknown>;
  status?: UserStatus;
}

/**
 * Context for tracking who made changes and from where
 * Used for Full Audit Trail (Option C) activity logging
 */
export interface UpdateContext {
  /** ID of the user making the change (admin or self) */
  actorId: number;
  /** Whether the actor is an admin making changes to another user */
  isAdminAction: boolean;
  /** Hashed IP address (PII-compliant) */
  hashedIP?: string;
  /** User agent string */
  userAgent?: string;
  /** Coarse location (city/region only) */
  location?: string;
  /** Session ID for correlation */
  sessionId?: string;
}

/**
 * User filters for querying
 */
export interface UserFilters {
  role?: User['role'];
  status?: UserStatus;
  is_verified?: boolean;
  is_business_owner?: boolean;
  searchQuery?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * User tag interface (admin-assigned tags)
 */
export interface UserTag {
  id: number;
  user_id: number;
  tag: string;
  color: string;
  created_at: Date;
}

/**
 * Activity log entry interface (from user_log table)
 *
 * @deprecated user_name and user_email fields are deprecated as of Phase 7.5
 * These fields will be NULL for new records. Use JOIN with users table:
 * ```sql
 * SELECT ul.*, u.display_name AS user_name, u.email AS user_email
 * FROM user_log ul
 * LEFT JOIN users u ON ul.user_id = u.id
 * ```
 */
export interface Activity {
  id: number;
  user_id: number | null;
  /** @deprecated Use JOIN with users table */
  user_name: string | null;
  /** @deprecated Use JOIN with users table */
  user_email: string | null;
  action: string;
  action_type: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  browser_info: string | null;
  device_type: string | null;
  location: string | null;
  referrer: string | null;
  session_id: string | null;
  duration: number | null;
  success: boolean;
  error_message: string | null;
  created_at: Date;
}

/**
 * Activity input for logging
 */
export interface ActivityInput {
  action: string;
  action_type: string;
  description: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  ip_address?: string;
  user_agent?: string;
  browser_info?: string;
  device_type?: string;
  location?: string;
  referrer?: string;
  session_id?: string;
  duration?: number;
  success?: boolean;
  error_message?: string;
}

/**
 * Login record interface
 */
export interface LoginRecord {
  timestamp: Date;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
}

/**
 * User statistics
 */
export interface UserStats {
  totalListings: number;
  totalReviews: number;
  totalConnections: number;
  accountAge: number; // Days
  lastActivity: Date | null;
  loginCount: number;
}

/**
 * Platform statistics
 */
export interface PlatformStats {
  totalUsers: number;
  activeUsers: number; // Last 30 days
  newSignups: number; // Last 30 days
  suspendedAccounts: number;
  usersByRole: Record<string, number>;
  usersByStatus: Record<string, number>;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class UserNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'USER_NOT_FOUND',
      message: `User not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested user was not found'
    });
  }
}

export class DuplicateEmailError extends BizError {
  constructor(email: string) {
    super({
      code: 'DUPLICATE_EMAIL',
      message: `Email already exists: ${email}`,
      context: { email },
      userMessage: 'A user with this email already exists'
    });
  }
}

export class UserSuspendedError extends BizError {
  constructor(userId: number, reason: string) {
    super({
      code: 'USER_SUSPENDED',
      message: `User ${userId} is suspended: ${reason}`,
      context: { userId, reason },
      userMessage: 'This user account is suspended'
    });
  }
}

export class InvalidAccountTypeError extends BizError {
  constructor(currentType: string, targetType: string) {
    super({
      code: 'INVALID_ACCOUNT_TYPE',
      message: `Cannot change account type from ${currentType} to ${targetType}`,
      context: { currentType, targetType },
      userMessage: 'Invalid account type transition'
    });
  }
}

export class DuplicateUsernameError extends BizError {
  constructor(username: string) {
    super({
      code: 'DUPLICATE_USERNAME',
      message: `Username already exists: ${username}`,
      context: { username },
      userMessage: 'This username is already taken'
    });
  }
}

// ============================================================================
// UserManagementService Implementation
// ============================================================================

export class UserManagementService {
  private db: DatabaseService;
  private userRepo: UserRepo;
  private activityLogger: ActivityLoggingService;

  constructor(db: DatabaseService, userRepo?: UserRepo) {
    this.db = db;
    this.userRepo = userRepo || getUserRepo();
    this.activityLogger = getActivityLoggingService();
  }

  // ==========================================================================
  // USER CRUD OPERATIONS
  // ==========================================================================

  /**
   * Get all users with filters and pagination
   * @param filters Optional filters
   * @param pagination Optional pagination parameters
   * @returns Paginated result of users
   */
  async getAll(
    filters?: UserFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<User>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM users';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.role !== undefined) {
        conditions.push('role = ?');
        params.push(filters.role);
      }

      if (filters.status !== undefined) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.is_verified !== undefined) {
        conditions.push('is_verified = ?');
        params.push(filters.is_verified ? 1 : 0);
      }

      if (filters.is_business_owner !== undefined) {
        conditions.push('is_business_owner = ?');
        params.push(filters.is_business_owner ? 1 : 0);
      }

      if (filters.searchQuery) {
        // Check if search query is a numeric ID
        const isNumericId = /^\d+$/.test(filters.searchQuery.trim());

        if (isNumericId) {
          // Search by exact ID match OR text fields
          conditions.push(
            '(id = ? OR email LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR display_name LIKE ?)'
          );
          const searchPattern = `%${filters.searchQuery}%`;
          params.push(
            parseInt(filters.searchQuery.trim(), 10),
            searchPattern, searchPattern, searchPattern, searchPattern, searchPattern
          );
        } else {
          // Search text fields only
          conditions.push(
            '(email LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR display_name LIKE ?)'
          );
          const searchPattern = `%${filters.searchQuery}%`;
          params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM users${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{total: bigint | number}> = await this.db.query<{total: bigint | number}>(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Get paginated data
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result: DbResult<UserRow> = await this.db.query<UserRow>(sql, params);

    return {
      data: result.rows.map(this.mapRowToUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get user by ID
   * @param id User ID
   * @returns User or null if not found
   */
  async getById(id: number): Promise<User | null> {
    const result: DbResult<UserRow> = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToUser(row);
  }

  /**
   * Get user by email
   * @param email User email
   * @returns User or null if not found
   */
  async getByEmail(email: string): Promise<User | null> {
    const result: DbResult<UserRow> = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToUser(row);
  }

  /**
   * Update user with Full Audit Trail logging
   * @param id User ID
   * @param data Update data
   * @param context Optional context for audit trail (who made change, IP, etc.)
   * @returns Updated user
   */
  async update(id: number, data: UpdateUserInput, context?: UpdateContext): Promise<User> {
    const user = await this.getById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    // Check for duplicate email if email is being updated
    if (data.email && data.email !== user.email) {
      const existingEmail = await this.getByEmail(data.email);
      if (existingEmail) {
        throw new DuplicateEmailError(data.email);
      }
    }

    // Check for duplicate username if username is being updated
    if (data.username && data.username !== user.username) {
      const existingUsername: DbResult<{id: number}> = await this.db.query<{id: number}>(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [data.username, id]
      );
      if (existingUsername.rows.length > 0) {
        throw new DuplicateUsernameError(data.username);
      }
    }

    // Track field changes for audit trail (Option C: Full Audit Trail)
    const changedFields: Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    // Build update query and track changes
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.email !== undefined && data.email !== user.email) {
      updates.push('email = ?');
      params.push(data.email);
      updates.push('email_normalized = ?');
      params.push(data.email.toLowerCase());
      changedFields.push({
        field: 'email',
        oldValue: this.maskEmail(user.email),
        newValue: this.maskEmail(data.email)
      });
    }

    if (data.username !== undefined && data.username !== user.username) {
      updates.push('username = ?');
      params.push(data.username);
      changedFields.push({
        field: 'username',
        oldValue: user.username,
        newValue: data.username
      });
    }

    if (data.first_name !== undefined && data.first_name !== user.first_name) {
      updates.push('first_name = ?');
      params.push(data.first_name);
      changedFields.push({
        field: 'first_name',
        oldValue: user.first_name,
        newValue: data.first_name
      });
    }

    if (data.last_name !== undefined && data.last_name !== user.last_name) {
      updates.push('last_name = ?');
      params.push(data.last_name);
      changedFields.push({
        field: 'last_name',
        oldValue: user.last_name,
        newValue: data.last_name
      });
    }

    if (data.display_name !== undefined && data.display_name !== user.display_name) {
      updates.push('display_name = ?');
      params.push(data.display_name);
      changedFields.push({
        field: 'display_name',
        oldValue: user.display_name,
        newValue: data.display_name
      });
    }

    if (data.avatar_url !== undefined && data.avatar_url !== user.avatar_url) {
      updates.push('avatar_url = ?');
      params.push(data.avatar_url);
      changedFields.push({
        field: 'avatar_url',
        oldValue: user.avatar_url ? '[avatar]' : null,
        newValue: data.avatar_url ? '[avatar]' : null
      });
    }

    if (data.user_group !== undefined && data.user_group !== user.user_group) {
      updates.push('user_group = ?');
      params.push(data.user_group);
      changedFields.push({
        field: 'user_group',
        oldValue: user.user_group,
        newValue: data.user_group
      });
    }

    if (data.permissions !== undefined) {
      const oldPerms = JSON.stringify(user.permissions || []);
      const newPerms = JSON.stringify(data.permissions);
      if (oldPerms !== newPerms) {
        updates.push('permissions = ?');
        params.push(newPerms);
        changedFields.push({
          field: 'permissions',
          oldValue: `[${(user.permissions || []).length} permissions]`,
          newValue: `[${data.permissions.length} permissions]`
        });
      }
    }

    if (data.is_business_owner !== undefined && data.is_business_owner !== user.is_business_owner) {
      updates.push('is_business_owner = ?');
      params.push(data.is_business_owner ? 1 : 0);
      changedFields.push({
        field: 'is_business_owner',
        oldValue: String(user.is_business_owner),
        newValue: String(data.is_business_owner)
      });
    }

    if (data.privacy_settings !== undefined) {
      const oldSettings = JSON.stringify(user.privacy_settings || {});
      const newSettings = JSON.stringify(data.privacy_settings);
      if (oldSettings !== newSettings) {
        updates.push('privacy_settings = ?');
        params.push(newSettings);
        changedFields.push({
          field: 'privacy_settings',
          oldValue: '[privacy settings updated]',
          newValue: '[privacy settings updated]'
        });
      }
    }

    if (data.status !== undefined && data.status !== user.status) {
      updates.push('status = ?');
      params.push(data.status);
      changedFields.push({
        field: 'status',
        oldValue: user.status,
        newValue: data.status
      });
    }

    if (updates.length === 0) {
      return user; // No changes
    }

    params.push(id);

    await this.db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    // Log activity with Full Audit Trail (Option C)
    const actorDescription = context?.isAdminAction
      ? `Admin (ID: ${context.actorId})`
      : 'User';
    const changedFieldsList = changedFields.map(f => f.field).join(', ');

    await this.activityLogger.logActivity({
      userId: id,
      action: context?.isAdminAction ? 'admin_profile_update' : 'profile_update',
      actionType: 'account',
      description: `${actorDescription} updated profile: ${changedFieldsList}`,
      hashedIP: context?.hashedIP,
      userAgent: context?.userAgent,
      location: context?.location,
      sessionId: context?.sessionId,
      success: true,
      metadata: {
        changedBy: context?.actorId || id,
        isAdminAction: context?.isAdminAction || false,
        changedFields: changedFields.map(f => ({
          field: f.field,
          from: f.oldValue,
          to: f.newValue
        }))
      }
    });

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'update user',
        new Error('Failed to retrieve updated user')
      );
    }

    return updated;
  }

  /**
   * Mask email for privacy-safe logging
   * e.g., "john@example.com" → "j***@example.com"
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    const masked = localPart.charAt(0) + '***';
    return `${masked}@${domain}`;
  }

  /**
   * Delete user (soft delete) with Full Audit Trail logging
   * @param id User ID
   * @param context Optional context for audit trail (who deleted, IP, etc.)
   */
  async delete(id: number, context?: UpdateContext): Promise<void> {
    const user = await this.getById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    await this.db.query(
      `UPDATE users
       SET status = 'deleted', deleted_at = NOW(), is_active = 0
       WHERE id = ?`,
      [id]
    );

    // Log deletion with Full Audit Trail (Option C)
    const actorDescription = context?.isAdminAction
      ? `Admin (ID: ${context.actorId})`
      : 'User';

    await this.activityLogger.logActivity({
      userId: id,
      action: context?.isAdminAction ? 'admin_account_deleted' : 'account_deleted',
      actionType: 'account',
      description: `${actorDescription} soft-deleted account`,
      hashedIP: context?.hashedIP,
      userAgent: context?.userAgent,
      location: context?.location,
      sessionId: context?.sessionId,
      success: true,
      metadata: {
        deletedBy: context?.actorId || id,
        isAdminAction: context?.isAdminAction || false,
        userEmail: this.maskEmail(user.email),
        previousStatus: user.status
      }
    });
  }

  /**
   * Suspend user account
   * @param id User ID
   * @param reason Suspension reason
   * @returns Updated user
   */
  async suspend(id: number, reason: string): Promise<User> {
    const user = await this.getById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    await this.db.query(
      `UPDATE users
       SET status = 'suspended', is_active = 0
       WHERE id = ?`,
      [id]
    );

    // Log the suspension
    await this.logActivity(id, {
      action: 'account_suspended',
      action_type: 'account',
      description: `Account suspended: ${reason}`,
      success: true
    });

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'suspend user',
        new Error('Failed to retrieve updated user')
      );
    }

    return updated;
  }

  /**
   * Unsuspend user account
   * @param id User ID
   * @returns Updated user
   */
  async unsuspend(id: number): Promise<User> {
    const user = await this.getById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }

    await this.db.query(
      `UPDATE users
       SET status = 'active', is_active = 1
       WHERE id = ?`,
      [id]
    );

    // Log the unsuspension
    await this.logActivity(id, {
      action: 'account_unsuspended',
      action_type: 'account',
      description: 'Account unsuspended',
      success: true
    });

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'unsuspend user',
        new Error('Failed to retrieve updated user')
      );
    }

    return updated;
  }

  // ==========================================================================
  // ACCOUNT TYPE MANAGEMENT
  // ==========================================================================

  /**
   * Upgrade user to listing member (automatic on first listing creation)
   * @param userId User ID
   * @returns Updated user
   */
  async upgradeToListingMember(userId: number): Promise<User> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Only upgrade if not already listing member or higher
    if (user.is_business_owner) {
      return user; // Already upgraded
    }

    await this.db.query(
      `UPDATE users
       SET is_business_owner = 1
       WHERE id = ?`,
      [userId]
    );

    // Log the upgrade
    await this.logActivity(userId, {
      action: 'account_upgraded',
      action_type: 'account',
      description: 'Upgraded to listing member',
      success: true
    });

    const updated = await this.getById(userId);
    if (!updated) {
      throw BizError.databaseError(
        'upgrade user',
        new Error('Failed to retrieve updated user')
      );
    }

    return updated;
  }

  /**
   * Upgrade user role to listing_member
   * Used when a user's first listing is approved (claim or direct submission)
   *
   * @param userId User ID
   * @returns Object indicating if upgrade occurred
   *
   * @note This method upgrades the `role` field from 'general' to 'listing_member'.
   * Different from upgradeToListingMember() which sets is_business_owner.
   * Both should typically be called together for full upgrade.
   */
  async upgradeUserRoleToListingMember(userId: number): Promise<{ upgraded: boolean }> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Only upgrade if current role is 'general'
    if (user.role !== 'general') {
      return { upgraded: false };
    }

    await this.db.query(
      `UPDATE users SET role = 'listing_member', updated_at = NOW() WHERE id = ?`,
      [userId]
    );

    // Log the role upgrade
    await this.logActivity(userId, {
      action: 'role_upgraded',
      action_type: 'account',
      description: 'Role upgraded from general to listing_member',
      success: true
    });

    return { upgraded: true };
  }

  /**
   * Set account type (admin override)
   * @param userId User ID
   * @param accountType Account type
   * @returns Updated user
   */
  async setAccountType(userId: number, accountType: AccountType): Promise<User> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Map AccountType to database fields
    let updates: { [key: string]: number | string } = {};

    switch (accountType) {
      case AccountType.VISITOR:
        updates = { is_active: 0, is_business_owner: 0 };
        break;
      case AccountType.GENERAL:
        updates = { is_active: 1, is_business_owner: 0 };
        break;
      case AccountType.LISTING_MEMBER:
        updates = { is_active: 1, is_business_owner: 1 };
        break;
      case AccountType.ADMIN:
        updates = { is_active: 1, role: 'admin' };
        break;
      default:
        throw new InvalidAccountTypeError(user.status, accountType);
    }

    const updateFields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const updateValues = Object.values(updates);

    await this.db.query(
      `UPDATE users SET ${updateFields} WHERE id = ?`,
      [...updateValues, userId]
    );

    // Log the account type change
    await this.logActivity(userId, {
      action: 'account_type_changed',
      action_type: 'account',
      description: `Account type changed to ${accountType}`,
      success: true
    });

    const updated = await this.getById(userId);
    if (!updated) {
      throw BizError.databaseError(
        'set account type',
        new Error('Failed to retrieve updated user')
      );
    }

    return updated;
  }

  // ==========================================================================
  // TAG MANAGEMENT
  // ==========================================================================

  /**
   * Add tag to user (admin-assigned tags)
   * @param userId User ID
   * @param tag Tag name
   * @param color Optional tag color
   */
  async addTag(userId: number, tag: string, color?: string): Promise<void> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Note: Tags would be stored in a separate user_tags table in production
    // For now, we'll store in user_group field as JSON
    const currentGroup = user.user_group || '[]';
    let tags: string[] = [];

    try {
      tags = JSON.parse(currentGroup);
    } catch {
      tags = [];
    }

    if (!tags.includes(tag)) {
      tags.push(tag);
      await this.db.query('UPDATE users SET user_group = ? WHERE id = ?', [
        JSON.stringify(tags),
        userId
      ]);
    }

    // Log tag addition
    await this.logActivity(userId, {
      action: 'tag_added',
      action_type: 'account',
      description: `Tag added: ${tag}`,
      success: true
    });
  }

  /**
   * Remove tag from user
   * @param userId User ID
   * @param tag Tag name
   */
  async removeTag(userId: number, tag: string): Promise<void> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const currentGroup = user.user_group || '[]';
    let tags: string[] = [];

    try {
      tags = JSON.parse(currentGroup);
    } catch {
      tags = [];
    }

    tags = tags.filter(t => t !== tag);
    await this.db.query('UPDATE users SET user_group = ? WHERE id = ?', [
      JSON.stringify(tags),
      userId
    ]);

    // Log tag removal
    await this.logActivity(userId, {
      action: 'tag_removed',
      action_type: 'account',
      description: `Tag removed: ${tag}`,
      success: true
    });
  }

  /**
   * Get user tags
   * @param userId User ID
   * @returns Array of user tags
   */
  async getUserTags(userId: number): Promise<UserTag[]> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const currentGroup = user.user_group || '[]';
    let tags: string[] = [];

    try {
      tags = JSON.parse(currentGroup);
    } catch {
      tags = [];
    }

    // Map to UserTag interface
    return tags.map((tag, index) => ({
      id: index + 1,
      user_id: userId,
      tag,
      color: '#3B82F6', // Default blue color
      created_at: user.created_at
    }));
  }

  // ==========================================================================
  // ACTIVITY TRACKING
  // ==========================================================================

  /**
   * Get activity log for user
   * @param userId User ID
   * @param limit Optional limit (default: 50)
   * @returns Array of activity records
   */
  async getActivityLog(userId: number, limit: number = 50): Promise<Activity[]> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const result: DbResult<UserLogRow> = await this.db.query<UserLogRow>(
      `SELECT * FROM user_log
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return result.rows.map(this.mapRowToActivity);
  }

  /**
   * Log user activity
   * @param userId User ID
   * @param activity Activity data
   *
   * @note As of Phase 7.5, user_name and user_email are no longer populated.
   * Use JOIN with users table for reports needing user info:
   * ```sql
   * SELECT ul.*, u.display_name AS user_name, u.email AS user_email
   * FROM user_log ul
   * LEFT JOIN users u ON ul.user_id = u.id
   * WHERE ul.action_type = ?
   * ORDER BY ul.created_at DESC
   * ```
   */
  async logActivity(userId: number, activity: ActivityInput): Promise<void> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    await this.db.query(
      `INSERT INTO user_log (
        user_id, action, action_type, description,
        entity_type, entity_id, entity_name, ip_address, user_agent,
        browser_info, device_type, location, referrer, session_id,
        duration, success, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        activity.action,
        activity.action_type,
        activity.description,
        activity.entity_type || null,
        activity.entity_id || null,
        activity.entity_name || null,
        activity.ip_address || null,
        activity.user_agent || null,
        activity.browser_info || null,
        activity.device_type || null,
        activity.location || null,
        activity.referrer || null,
        activity.session_id || null,
        activity.duration || null,
        activity.success !== false ? 1 : 0,
        activity.error_message || null
      ]
    );
  }

  /**
   * Get login history for user
   * @param userId User ID
   * @returns Array of login records
   */
  async getLoginHistory(userId: number): Promise<LoginRecord[]> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const result: DbResult<LoginHistoryRow> = await this.db.query<LoginHistoryRow>(
      `SELECT created_at, ip_address, user_agent, success
       FROM user_log
       WHERE user_id = ? AND action_type = 'auth' AND action IN ('login', 'login_attempt')
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    return result.rows.map(row => ({
      timestamp: new Date(row.created_at),
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      success: Boolean(row.success)
    }));
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get user statistics
   * @param userId User ID
   * @returns User statistics
   */
  async getUserStats(userId: number): Promise<UserStats> {
    const user = await this.getById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Get total listings
    const listingsResult: DbResult<CountRow> = await this.db.query<CountRow>(
      'SELECT COUNT(*) as count FROM listings WHERE user_id = ?',
      [userId]
    );
    const totalListings = bigIntToNumber(listingsResult.rows[0]?.count);

    // Get total reviews (placeholder)
    const totalReviews = 0; // Would query reviews table

    // Get total connections
    const connectionsResult: DbResult<CountRow> = await this.db.query<CountRow>(
      `SELECT COUNT(*) as count FROM user_connection
       WHERE user_id_1 = ? OR user_id_2 = ?`,
      [userId, userId]
    );
    const totalConnections = bigIntToNumber(connectionsResult.rows[0]?.count);

    // Calculate account age in days
    const accountAge = Math.floor(
      (Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get last activity
    const lastActivityResult: DbResult<LastActivityRow> = await this.db.query<LastActivityRow>(
      `SELECT created_at FROM user_log
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    const lastActivity = lastActivityResult.rows[0]
      ? new Date(lastActivityResult.rows[0].created_at)
      : null;

    return {
      totalListings,
      totalReviews,
      totalConnections,
      accountAge,
      lastActivity,
      loginCount: user.login_count
    };
  }

  /**
   * Get platform-wide statistics
   * @returns Platform statistics
   */
  async getPlatformStats(): Promise<PlatformStats> {
    // Total users
    const totalResult: DbResult<CountRow> = await this.db.query<CountRow>(
      'SELECT COUNT(*) as count FROM users'
    );
    const totalUsers = bigIntToNumber(totalResult.rows[0]?.count);

    // Active users (last 30 days)
    const activeResult: DbResult<CountRow> = await this.db.query<CountRow>(
      `SELECT COUNT(DISTINCT user_id) as count FROM user_log
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    const activeUsers = bigIntToNumber(activeResult.rows[0]?.count);

    // New signups (last 30 days)
    const signupsResult: DbResult<CountRow> = await this.db.query<CountRow>(
      `SELECT COUNT(*) as count FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    const newSignups = bigIntToNumber(signupsResult.rows[0]?.count);

    // Suspended accounts
    const suspendedResult: DbResult<CountRow> = await this.db.query<CountRow>(
      `SELECT COUNT(*) as count FROM users WHERE status = 'suspended'`
    );
    const suspendedAccounts = bigIntToNumber(suspendedResult.rows[0]?.count);

    // Users by role
    const roleResult: DbResult<RoleCountRow> = await this.db.query<RoleCountRow>(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );
    const usersByRole: Record<string, number> = {};
    roleResult.rows.forEach(row => {
      usersByRole[row.role] = bigIntToNumber(row.count);
    });

    // Users by status
    const statusResult: DbResult<StatusCountRow> = await this.db.query<StatusCountRow>(
      'SELECT status, COUNT(*) as count FROM users GROUP BY status'
    );
    const usersByStatus: Record<string, number> = {};
    statusResult.rows.forEach(row => {
      usersByStatus[row.status] = bigIntToNumber(row.count);
    });

    return {
      totalUsers,
      activeUsers,
      newSignups,
      suspendedAccounts,
      usersByRole,
      usersByStatus
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Map database row to User interface
   * @param row - Typed UserRow from database
   * @returns User - Application-level User object
   */
  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      uuid: row.uuid,
      email: row.email,
      username: row.username,
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      display_name: row.display_name || null,
      avatar_url: row.avatar_url || null,
      is_active: Boolean(row.is_active),
      email_verified_at: row.email_verified_at
        ? new Date(row.email_verified_at)
        : null,
      last_login_at: row.last_login_at ? new Date(row.last_login_at) : null,
      password_changed_at: new Date(row.updated_at), // Use updated_at as fallback
      failed_login_attempts: row.failed_login_attempts || 0,
      locked_until: row.locked_until ? new Date(row.locked_until) : null,
      deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
      email_normalized: row.email.toLowerCase(), // Normalize email
      password_hash: row.password_hash,
      role: row.role, // Use role directly from database
      is_verified: Boolean(row.is_email_verified), // Map is_email_verified
      is_mock: false, // No is_mock column, default to false
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      user_group: null, // No user_group column
      permissions: row.permissions ? JSON.parse(row.permissions) : null,
      is_business_owner: false, // No is_business_owner column, default to false
      privacy_settings: row.preferences // Map preferences to privacy_settings
        ? JSON.parse(row.preferences)
        : null,
      login_count: 0, // No login_count column, default to 0
      last_ip_address: row.last_login_ip || null,
      last_user_agent: null, // No last_user_agent column
      terms_accepted_at: null, // No terms_accepted_at column
      terms_version: null, // No terms_version column
      status: (row.status as UserStatus) || UserStatus.ACTIVE // Read actual status from database
    };
  }

  /**
   * Map database row to Activity interface
   */
  private mapRowToActivity(row: UserLogRow): Activity {
    return {
      id: row.id as number,
      user_id: (row.user_id as number) || null,
      user_name: (row.user_name as string) || null,
      user_email: (row.user_email as string) || null,
      action: row.action as string,
      action_type: row.action_type as string,
      description: row.description as string,
      entity_type: (row.entity_type as string) || null,
      entity_id: (row.entity_id as string) || null,
      entity_name: (row.entity_name as string) || null,
      ip_address: (row.ip_address as string) || null,
      user_agent: (row.user_agent as string) || null,
      browser_info: (row.browser_info as string) || null,
      device_type: (row.device_type as string) || null,
      location: (row.location as string) || null,
      referrer: (row.referrer as string) || null,
      session_id: (row.session_id as string) || null,
      duration: (row.duration as number) || null,
      success: Boolean(row.success),
      error_message: (row.error_message as string) || null,
      created_at: new Date(row.created_at)
    };
  }
}
