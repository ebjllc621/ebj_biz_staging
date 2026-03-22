/**
 * UserRepo - User repository for database operations
 *
 * GOVERNANCE: Repository pattern with DatabaseService boundary
 * GOVERNANCE: ALL database access via DatabaseService (no direct imports)
 * GOVERNANCE: Service Architecture v2.0 compliance
 * Phase 1 Implementation
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import type { RowDataPacket, ResultSetHeader } from '@core/types/mariadb-compat';

/**
 * User entity interface
 * Matches database schema for users table
 */
export interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: 'general' | 'listing_member' | 'admin';
  is_email_verified: boolean;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Input for creating a new user
 * Omits auto-generated fields
 */
export interface CreateUserInput {
  email: string;
  username: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  role?: User['role'];
}

/**
 * Filters for querying users
 */
export interface UserFilters {
  role?: User['role'];
  is_email_verified?: boolean;
  is_active?: boolean;
}

/**
 * User repository class
 * Provides data access methods for user management
 *
 * GOVERNANCE: Uses DatabaseService singleton for all database operations
 * GOVERNANCE: No direct mysql2/mariadb imports allowed
 */
export class UserRepo {
  private db = getDatabaseService();

  /**
   * Find user by ID
   * GOVERNANCE: Return null if not found (not throw error)
   *
   * @param id - User ID to find
   * @returns Promise resolving to User or null
   */
  async findById(id: number): Promise<User | null> {
    const sql = `
      SELECT * FROM users WHERE id = ? LIMIT 1
    `;

    const result = await this.db.query<RowDataPacket[]>(sql, [id]);
    return result.rows.length > 0 ? (result.rows[0] as unknown as User) : null;
  }

  /**
   * Find user by email
   * GOVERNANCE: Email is unique, return null if not found
   *
   * @param email - User email to find
   * @returns Promise resolving to User or null
   */
  async findByEmail(email: string): Promise<User | null> {
    const sql = `
      SELECT * FROM users WHERE email = ? LIMIT 1
    `;

    const result = await this.db.query<RowDataPacket[]>(sql, [email]);
    return result.rows.length > 0 ? (result.rows[0] as unknown as User) : null;
  }

  /**
   * Create new user
   * GOVERNANCE: Password hash must be pre-hashed by PasswordService
   * GOVERNANCE: Return created user with ID
   *
   * @param input - User creation data
   * @returns Promise resolving to created User
   */
  async create(input: CreateUserInput): Promise<User> {
    const sql = `
      INSERT INTO users (
        email,
        username,
        password_hash,
        first_name,
        last_name,
        display_name,
        role,
        is_email_verified,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
    `;

    const result = await this.db.query<ResultSetHeader>(sql, [
      input.email,
      input.username,
      input.password_hash,
      input.first_name || null,
      input.last_name || null,
      input.display_name || null,
      input.role || 'general'
    ]);

    const userId = result.insertId;
    if (!userId) {
      throw new Error('Failed to create user: No insertId returned');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Failed to create user: User not found after insert');
    }

    return user;
  }

  /**
   * Update user
   * GOVERNANCE: Only update provided fields (partial update)
   *
   * @param id - User ID to update
   * @param updates - Partial user data to update
   * @returns Promise resolving to updated User
   */
  async update(id: number, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User> {
    // Build dynamic UPDATE query
    const fields: string[] = [];
    const values: any[] = [];

    // Filter out id and created_at from updates
    const allowedKeys = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at');

    allowedKeys.forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updates[key as keyof typeof updates]);
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp and id for WHERE clause
    values.push(id);

    const sql = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.db.query(sql, values);

    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found after update');
    }

    return user;
  }

  /**
   * Delete user (soft delete)
   * GOVERNANCE: Set is_active = FALSE instead of hard delete
   *
   * @param id - User ID to delete
   * @returns Promise resolving when complete
   */
  async delete(id: number): Promise<void> {
    const sql = `
      UPDATE users
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.db.query(sql, [id]);
  }

  /**
   * List users with filters
   * GOVERNANCE: Support pagination via LIMIT/OFFSET
   *
   * @param filters - Optional filters for querying users
   * @param limit - Maximum number of users to return (default 100)
   * @param offset - Number of users to skip (default 0)
   * @returns Promise resolving to array of Users
   */
  async list(filters?: UserFilters, limit = 100, offset = 0): Promise<User[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters) {
      if (filters.role) {
        conditions.push('role = ?');
        values.push(filters.role);
      }
      if (filters.is_email_verified !== undefined) {
        conditions.push('is_email_verified = ?');
        values.push(filters.is_email_verified ? 1 : 0);
      }
      if (filters.is_active !== undefined) {
        conditions.push('is_active = ?');
        values.push(filters.is_active ? 1 : 0);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Add pagination parameters to values array
    values.push(limit, offset);

    const sql = `
      SELECT * FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const result = await this.db.query<RowDataPacket[]>(sql, values);
    return result.rows as unknown as User[];
  }

  /**
   * Update last login timestamp
   * GOVERNANCE: Called on successful login
   *
   * @param id - User ID to update
   * @returns Promise resolving when complete
   */
  async updateLastLogin(id: number): Promise<void> {
    const sql = `
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.db.query(sql, [id]);
  }

  /**
   * Count users matching filters
   * Useful for pagination
   *
   * @param filters - Optional filters for counting users
   * @returns Promise resolving to count of users
   */
  async count(filters?: UserFilters): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters) {
      if (filters.role) {
        conditions.push('role = ?');
        values.push(filters.role);
      }
      if (filters.is_email_verified !== undefined) {
        conditions.push('is_email_verified = ?');
        values.push(filters.is_email_verified ? 1 : 0);
      }
      if (filters.is_active !== undefined) {
        conditions.push('is_active = ?');
        values.push(filters.is_active ? 1 : 0);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT COUNT(*) as count FROM users
      ${whereClause}
    `;

    const result = await this.db.query<RowDataPacket[]>(sql, values);
    return (result.rows[0] as any)?.count || 0;
  }

  /**
   * Check if email exists
   * Useful for validation
   *
   * @param email - Email to check
   * @returns Promise resolving to true if email exists, false otherwise
   */
  async emailExists(email: string): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count FROM users WHERE email = ?
    `;

    const result = await this.db.query<RowDataPacket[]>(sql, [email]);
    return (result.rows[0] as any)?.count > 0;
  }
}

/**
 * Singleton instance for application-wide use
 * GOVERNANCE: Singleton pattern for repository reuse
 */
let userRepoInstance: UserRepo | null = null;

/**
 * Get UserRepo singleton instance
 *
 * @returns Shared UserRepo instance
 */
export function getUserRepo(): UserRepo {
  if (!userRepoInstance) {
    userRepoInstance = new UserRepo();
  }
  return userRepoInstance;
}

/**
 * Default export for convenience
 */
export default UserRepo;
