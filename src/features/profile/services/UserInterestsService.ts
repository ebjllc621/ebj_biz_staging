/**
 * UserInterestsService - User Interest Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3A_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated DNA v11.4.0
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { getCategoryService, CategoryService } from '@core/services/CategoryService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import {
  CategoryInterest,
  CustomInterest,
  GroupInterest,
  MembershipInterest,
  UserInterestRow,
  AddCategoryInterestRequest,
  AddCustomInterestRequest,
  AddGroupRequest,
  AddMembershipRequest,
  UpdateGroupRequest,
  UpdateMembershipRequest,
  CategorySearchResult
} from '../types/user-interests';
import { bigIntToNumber } from '@core/utils/bigint';

export class UserInterestsService {
  private db: DatabaseService;
  private categoryService: CategoryService;

  constructor(db: DatabaseService) {
    this.db = db;
    this.categoryService = getCategoryService();
  }

  // ==========================================================================
  // Category Interest Operations (Phase 3A)
  // ==========================================================================

  /**
   * Get all category interests for a user
   */
  async getCategoryInterests(userId: number): Promise<CategoryInterest[]> {
    const result: DbResult<UserInterestRow & {
      category_name: string;
      category_slug: string;
      parent_id: number | null;
    }> = await this.db.query(
      `SELECT ui.*, c.name as category_name, c.slug as category_slug, c.parent_id
       FROM user_interests ui
       JOIN categories c ON ui.category_id = c.id
       WHERE ui.user_id = ? AND ui.interest_type = 'category'
       ORDER BY ui.display_order ASC, ui.created_at ASC`,
      [userId]
    );

    // Build category paths for each interest
    const interests: CategoryInterest[] = [];
    for (const row of result.rows) {
      const ancestors = await this.categoryService.getAncestors(row.category_id!);
      const categoryPath = [...ancestors.map(a => a.name), row.category_name].join(' > ');
      const parentCategories = ancestors.map(a => a.name);

      interests.push({
        id: bigIntToNumber(row.id),
        user_id: bigIntToNumber(row.user_id),
        interest_type: 'category',
        category_id: bigIntToNumber(row.category_id!),
        category_name: row.category_name,
        category_slug: row.category_slug,
        category_path: categoryPath,
        parent_categories: parentCategories,
        display_order: bigIntToNumber(row.display_order),
        is_visible: Boolean(row.is_visible),
        created_at: new Date(row.created_at)
      });
    }

    return interests;
  }

  /**
   * Add a category interest for a user
   */
  async addCategoryInterest(
    userId: number,
    request: AddCategoryInterestRequest
  ): Promise<CategoryInterest> {
    // Verify category exists
    const category = await this.categoryService.getById(request.category_id);
    if (!category) {
      throw BizError.notFound(`Category ${request.category_id} not found`);
    }

    // Check for duplicate
    const existingResult: DbResult<{ id: number }> = await this.db.query(
      `SELECT id FROM user_interests
       WHERE user_id = ? AND category_id = ? AND interest_type = 'category'`,
      [userId, request.category_id]
    );

    if (existingResult.rows.length > 0) {
      throw BizError.badRequest('Category interest already exists');
    }

    // Get next display order
    const orderResult: DbResult<{ max_order: number | null }> = await this.db.query(
      `SELECT MAX(display_order) as max_order
       FROM user_interests WHERE user_id = ?`,
      [userId]
    );
    const nextOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

    // Insert interest
    const insertResult: DbResult<UserInterestRow> = await this.db.query(
      `INSERT INTO user_interests (user_id, interest_type, category_id, display_order)
       VALUES (?, 'category', ?, ?)`,
      [userId, request.category_id, request.display_order ?? nextOrder]
    );

    if (!insertResult.insertId) {
      throw BizError.databaseError('add category interest', new Error('Insert failed'));
    }

    // GOVERNANCE: mariadb returns BigInt for insertId - convert to Number
    const newId = bigIntToNumber(insertResult.insertId);

    // Build and return the complete interest object
    const ancestors = await this.categoryService.getAncestors(request.category_id);
    const categoryPath = [...ancestors.map(a => a.name), category.name].join(' > ');

    return {
      id: newId,
      user_id: userId,
      interest_type: 'category',
      category_id: request.category_id,
      category_name: category.name,
      category_slug: category.slug,
      category_path: categoryPath,
      parent_categories: ancestors.map(a => a.name),
      display_order: request.display_order ?? nextOrder,
      is_visible: true,
      created_at: new Date()
    };
  }

  /**
   * Remove a category interest
   */
  async removeCategoryInterest(userId: number, interestId: number): Promise<void> {
    const result = await this.db.query(
      `DELETE FROM user_interests
       WHERE id = ? AND user_id = ? AND interest_type = 'category'`,
      [interestId, userId]
    );

    // GOVERNANCE: mariadb returns affectedRows on raw result object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (bigIntToNumber((result as any).affectedRows) === 0) {
      throw BizError.notFound('Interest not found');
    }
  }

  /**
   * Remove a category interest by category ID
   */
  async removeCategoryInterestByCategoryId(userId: number, categoryId: number): Promise<void> {
    await this.db.query(
      `DELETE FROM user_interests
       WHERE user_id = ? AND category_id = ? AND interest_type = 'category'`,
      [userId, categoryId]
    );
  }

  // ==========================================================================
  // Category Search (Delegates to CategoryService)
  // ==========================================================================

  /**
   * Search categories for autocomplete
   * Returns categories with full path for display
   */
  async searchCategories(query: string, limit: number = 10): Promise<CategorySearchResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    // Search by name using LIKE
    const result: DbResult<{
      id: number;
      name: string;
      slug: string;
      parent_id: number | null;
    }> = await this.db.query(
      `SELECT id, name, slug, parent_id
       FROM categories
       WHERE name LIKE ? AND is_active = 1
       ORDER BY name ASC
       LIMIT ?`,
      [`%${query}%`, limit]
    );

    // Build full paths for each result
    const searchResults: CategorySearchResult[] = [];
    for (const row of result.rows) {
      const ancestors = await this.categoryService.getAncestors(row.id);
      const fullPath = [...ancestors.map(a => a.name), row.name].join(' > ');

      searchResults.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        fullPath,
        parent_id: row.parent_id
      });
    }

    return searchResults;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Check if user has a specific category interest
   */
  async hasCategoryInterest(userId: number, categoryId: number): Promise<boolean> {
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as count FROM user_interests
       WHERE user_id = ? AND category_id = ? AND interest_type = 'category'`,
      [userId, categoryId]
    );

    return bigIntToNumber(result.rows[0]?.count) > 0;
  }

  /**
   * Reorder category interests
   */
  async reorderInterests(userId: number, interestIds: number[]): Promise<void> {
    await this.db.transaction(async (client) => {
      for (let i = 0; i < interestIds.length; i++) {
        await client.query(
          `UPDATE user_interests SET display_order = ? WHERE id = ? AND user_id = ?`,
          [i, interestIds[i], userId]
        );
      }
    });
  }

  // ==========================================================================
  // Custom Interest Operations (Phase 3B)
  // ==========================================================================

  /**
   * Get all custom interests for a user
   */
  async getCustomInterests(userId: number): Promise<CustomInterest[]> {
    const result: DbResult<UserInterestRow> = await this.db.query(
      `SELECT * FROM user_interests
       WHERE user_id = ? AND interest_type = 'custom'
       ORDER BY display_order ASC, created_at ASC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: bigIntToNumber(row.id),
      user_id: bigIntToNumber(row.user_id),
      interest_type: 'custom' as const,
      custom_value: row.custom_value!,
      display_order: bigIntToNumber(row.display_order),
      is_visible: Boolean(row.is_visible),
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * Add a custom interest for a user
   */
  async addCustomInterest(
    userId: number,
    request: AddCustomInterestRequest
  ): Promise<CustomInterest> {
    const value = request.custom_value.trim();

    if (!value) {
      throw BizError.validation('custom_value', request.custom_value, 'Interest value is required');
    }

    if (value.length > 100) {
      throw BizError.validation('custom_value', request.custom_value, 'Interest value must be 100 characters or less');
    }

    // Check for duplicate custom value (case-insensitive)
    const existingResult: DbResult<{ id: number }> = await this.db.query(
      `SELECT id FROM user_interests
       WHERE user_id = ? AND interest_type = 'custom' AND LOWER(custom_value) = LOWER(?)`,
      [userId, value]
    );

    if (existingResult.rows.length > 0) {
      throw BizError.badRequest('This custom interest already exists');
    }

    // Get next display order (across ALL interest types for unified ordering)
    const orderResult: DbResult<{ max_order: number | null }> = await this.db.query(
      `SELECT MAX(display_order) as max_order
       FROM user_interests WHERE user_id = ?`,
      [userId]
    );
    const nextOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

    // Insert interest
    const insertResult: DbResult<UserInterestRow> = await this.db.query(
      `INSERT INTO user_interests (user_id, interest_type, custom_value, display_order)
       VALUES (?, 'custom', ?, ?)`,
      [userId, value, request.display_order ?? nextOrder]
    );

    if (!insertResult.insertId) {
      throw BizError.databaseError('add custom interest', new Error('Insert failed'));
    }

    // GOVERNANCE: mariadb returns BigInt for insertId - convert to Number
    const newId = bigIntToNumber(insertResult.insertId);

    return {
      id: newId,
      user_id: userId,
      interest_type: 'custom',
      custom_value: value,
      display_order: request.display_order ?? nextOrder,
      is_visible: true,
      created_at: new Date()
    };
  }

  /**
   * Remove a custom interest
   */
  async removeCustomInterest(userId: number, interestId: number): Promise<void> {
    const result = await this.db.query(
      `DELETE FROM user_interests
       WHERE id = ? AND user_id = ? AND interest_type = 'custom'`,
      [interestId, userId]
    );

    // GOVERNANCE: mariadb returns affectedRows on raw result object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (bigIntToNumber((result as any).affectedRows) === 0) {
      throw BizError.notFound('Custom interest not found');
    }
  }

  // ==========================================================================
  // Group Interest Operations (Phase 3C)
  // ==========================================================================

  /**
   * Get all group interests for a user
   */
  async getGroups(userId: number): Promise<GroupInterest[]> {
    const result: DbResult<UserInterestRow> = await this.db.query(
      `SELECT * FROM user_interests
       WHERE user_id = ? AND interest_type = 'group'
       ORDER BY display_order ASC, created_at ASC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: bigIntToNumber(row.id),
      user_id: bigIntToNumber(row.user_id),
      interest_type: 'group' as const,
      group_name: row.group_name!,
      group_purpose: row.group_purpose,
      group_role: row.group_role,
      display_order: bigIntToNumber(row.display_order),
      is_visible: Boolean(row.is_visible),
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * Add a group interest for a user
   */
  async addGroup(
    userId: number,
    request: AddGroupRequest
  ): Promise<GroupInterest> {
    const name = request.group_name.trim();

    if (!name) {
      throw BizError.validation('group_name', request.group_name, 'Group name is required');
    }

    if (name.length > 255) {
      throw BizError.validation('group_name', request.group_name, 'Group name must be 255 characters or less');
    }

    // Check for duplicate group name (case-insensitive)
    const existingResult: DbResult<{ id: number }> = await this.db.query(
      `SELECT id FROM user_interests
       WHERE user_id = ? AND interest_type = 'group' AND LOWER(group_name) = LOWER(?)`,
      [userId, name]
    );

    if (existingResult.rows.length > 0) {
      throw BizError.badRequest('This group already exists');
    }

    // Get next display order
    const orderResult: DbResult<{ max_order: number | null }> = await this.db.query(
      `SELECT MAX(display_order) as max_order
       FROM user_interests WHERE user_id = ?`,
      [userId]
    );
    const nextOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

    // Insert group
    const insertResult: DbResult<UserInterestRow> = await this.db.query(
      `INSERT INTO user_interests (user_id, interest_type, group_name, group_purpose, group_role, display_order)
       VALUES (?, 'group', ?, ?, ?, ?)`,
      [userId, name, request.group_purpose || null, request.group_role || null, request.display_order ?? nextOrder]
    );

    if (!insertResult.insertId) {
      throw BizError.databaseError('add group', new Error('Insert failed'));
    }

    // GOVERNANCE: mariadb returns BigInt for insertId - convert to Number
    const newId = bigIntToNumber(insertResult.insertId);

    return {
      id: newId,
      user_id: userId,
      interest_type: 'group',
      group_name: name,
      group_purpose: request.group_purpose || null,
      group_role: request.group_role || null,
      display_order: request.display_order ?? nextOrder,
      is_visible: true,
      created_at: new Date()
    };
  }

  /**
   * Update a group interest
   */
  async updateGroup(
    userId: number,
    groupId: number,
    request: UpdateGroupRequest
  ): Promise<GroupInterest> {
    // Build update fields dynamically
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (request.group_name !== undefined) {
      const name = request.group_name.trim();
      if (!name) {
        throw BizError.validation('group_name', request.group_name, 'Group name cannot be empty');
      }
      if (name.length > 255) {
        throw BizError.validation('group_name', request.group_name, 'Group name must be 255 characters or less');
      }
      updates.push('group_name = ?');
      values.push(name);
    }

    if (request.group_purpose !== undefined) {
      updates.push('group_purpose = ?');
      values.push(request.group_purpose || null);
    }

    if (request.group_role !== undefined) {
      updates.push('group_role = ?');
      values.push(request.group_role || null);
    }

    if (updates.length === 0) {
      throw BizError.badRequest('No fields to update');
    }

    values.push(String(groupId), String(userId));

    await this.db.query(
      `UPDATE user_interests
       SET ${updates.join(', ')}
       WHERE id = ? AND user_id = ? AND interest_type = 'group'`,
      values
    );

    // Return updated group
    const result: DbResult<UserInterestRow> = await this.db.query(
      `SELECT * FROM user_interests WHERE id = ? AND user_id = ?`,
      [groupId, userId]
    );

    const row = result.rows[0];
    if (!row) {
      throw BizError.notFound('Group not found');
    }

    return {
      id: bigIntToNumber(row.id),
      user_id: bigIntToNumber(row.user_id),
      interest_type: 'group',
      group_name: row.group_name!,
      group_purpose: row.group_purpose,
      group_role: row.group_role,
      display_order: bigIntToNumber(row.display_order),
      is_visible: Boolean(row.is_visible),
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Remove a group interest
   */
  async removeGroup(userId: number, groupId: number): Promise<void> {
    const result = await this.db.query(
      `DELETE FROM user_interests
       WHERE id = ? AND user_id = ? AND interest_type = 'group'`,
      [groupId, userId]
    );

    // GOVERNANCE: mariadb returns affectedRows on raw result object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (bigIntToNumber((result as any).affectedRows) === 0) {
      throw BizError.notFound('Group not found');
    }
  }

  // ==========================================================================
  // Membership Interest Operations (Phase 3C)
  // ==========================================================================

  /**
   * Get all membership interests for a user
   */
  async getMemberships(userId: number): Promise<MembershipInterest[]> {
    const result: DbResult<UserInterestRow> = await this.db.query(
      `SELECT * FROM user_interests
       WHERE user_id = ? AND interest_type = 'membership'
       ORDER BY display_order ASC, created_at ASC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: bigIntToNumber(row.id),
      user_id: bigIntToNumber(row.user_id),
      interest_type: 'membership' as const,
      membership_name: row.membership_name!,
      membership_description: row.membership_description,
      display_order: bigIntToNumber(row.display_order),
      is_visible: Boolean(row.is_visible),
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * Add a membership interest for a user
   */
  async addMembership(
    userId: number,
    request: AddMembershipRequest
  ): Promise<MembershipInterest> {
    const name = request.membership_name.trim();

    if (!name) {
      throw BizError.validation('membership_name', request.membership_name, 'Membership name is required');
    }

    if (name.length > 255) {
      throw BizError.validation('membership_name', request.membership_name, 'Membership name must be 255 characters or less');
    }

    // Check for duplicate membership name (case-insensitive)
    const existingResult: DbResult<{ id: number }> = await this.db.query(
      `SELECT id FROM user_interests
       WHERE user_id = ? AND interest_type = 'membership' AND LOWER(membership_name) = LOWER(?)`,
      [userId, name]
    );

    if (existingResult.rows.length > 0) {
      throw BizError.badRequest('This membership already exists');
    }

    // Get next display order
    const orderResult: DbResult<{ max_order: number | null }> = await this.db.query(
      `SELECT MAX(display_order) as max_order
       FROM user_interests WHERE user_id = ?`,
      [userId]
    );
    const nextOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

    // Insert membership
    const insertResult: DbResult<UserInterestRow> = await this.db.query(
      `INSERT INTO user_interests (user_id, interest_type, membership_name, membership_description, display_order)
       VALUES (?, 'membership', ?, ?, ?)`,
      [userId, name, request.membership_description || null, request.display_order ?? nextOrder]
    );

    if (!insertResult.insertId) {
      throw BizError.databaseError('add membership', new Error('Insert failed'));
    }

    // GOVERNANCE: mariadb returns BigInt for insertId - convert to Number
    const newId = bigIntToNumber(insertResult.insertId);

    return {
      id: newId,
      user_id: userId,
      interest_type: 'membership',
      membership_name: name,
      membership_description: request.membership_description || null,
      display_order: request.display_order ?? nextOrder,
      is_visible: true,
      created_at: new Date()
    };
  }

  /**
   * Update a membership interest
   */
  async updateMembership(
    userId: number,
    membershipId: number,
    request: UpdateMembershipRequest
  ): Promise<MembershipInterest> {
    // Build update fields dynamically
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (request.membership_name !== undefined) {
      const name = request.membership_name.trim();
      if (!name) {
        throw BizError.validation('membership_name', request.membership_name, 'Membership name cannot be empty');
      }
      if (name.length > 255) {
        throw BizError.validation('membership_name', request.membership_name, 'Membership name must be 255 characters or less');
      }
      updates.push('membership_name = ?');
      values.push(name);
    }

    if (request.membership_description !== undefined) {
      updates.push('membership_description = ?');
      values.push(request.membership_description || null);
    }

    if (updates.length === 0) {
      throw BizError.badRequest('No fields to update');
    }

    values.push(String(membershipId), String(userId));

    await this.db.query(
      `UPDATE user_interests
       SET ${updates.join(', ')}
       WHERE id = ? AND user_id = ? AND interest_type = 'membership'`,
      values
    );

    // Return updated membership
    const result: DbResult<UserInterestRow> = await this.db.query(
      `SELECT * FROM user_interests WHERE id = ? AND user_id = ?`,
      [membershipId, userId]
    );

    const row = result.rows[0];
    if (!row) {
      throw BizError.notFound('Membership not found');
    }

    return {
      id: bigIntToNumber(row.id),
      user_id: bigIntToNumber(row.user_id),
      interest_type: 'membership',
      membership_name: row.membership_name!,
      membership_description: row.membership_description,
      display_order: bigIntToNumber(row.display_order),
      is_visible: Boolean(row.is_visible),
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Remove a membership interest
   */
  async removeMembership(userId: number, membershipId: number): Promise<void> {
    const result = await this.db.query(
      `DELETE FROM user_interests
       WHERE id = ? AND user_id = ? AND interest_type = 'membership'`,
      [membershipId, userId]
    );

    // GOVERNANCE: mariadb returns affectedRows on raw result object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (bigIntToNumber((result as any).affectedRows) === 0) {
      throw BizError.notFound('Membership not found');
    }
  }

  /**
   * Get all interests (category + custom + groups + memberships) for a user
   * Useful for unified display
   */
  async getAllInterests(userId: number): Promise<{
    category: CategoryInterest[];
    custom: CustomInterest[];
    groups: GroupInterest[];
    memberships: MembershipInterest[];
  }> {
    const [category, custom, groups, memberships] = await Promise.all([
      this.getCategoryInterests(userId),
      this.getCustomInterests(userId),
      this.getGroups(userId),
      this.getMemberships(userId)
    ]);

    return { category, custom, groups, memberships };
  }
}

// ==========================================================================
// Service Factory
// ==========================================================================

let userInterestsServiceInstance: UserInterestsService | null = null;

export function getUserInterestsService(): UserInterestsService {
  if (!userInterestsServiceInstance) {
    const db = getDatabaseService();
    userInterestsServiceInstance = new UserInterestsService(db);
  }
  return userInterestsServiceInstance;
}
