/**
 * CategoryService - Category Hierarchy Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Type Safety: Typed database rows (CategoryRow)
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 4 Brain Plan - Service Layer Implementation
 * @authority PHASE_R3_BRAIN_PLAN.md - TypeScript any elimination
 * @remediation Phase R3.1 - TypeScript any elimination (REFERENCE IMPLEMENTATION)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { CategoryRow } from '@core/types/db-rows';
import { safeJsonParse } from '@core/utils/bigint';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Category {
  id: number;
  name: string;
  slug: string;
  keywords: string[]; // Parsed from JSON
  description?: string;
  cat_description?: string;
  parent_id?: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string; // Optional, auto-generated if not provided
  keywords?: string[];
  description?: string;
  cat_description?: string;
  parent_id?: number | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  keywords?: string[];
  description?: string;
  cat_description?: string;
  parent_id?: number | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface CategoryFilters {
  parentId?: number | null;
  isActive?: boolean;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class CategoryNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'CATEGORY_NOT_FOUND',
      message: `Category not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested category was not found'
    });
  }
}

export class DuplicateSlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_SLUG',
      message: `Category slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'A category with this URL slug already exists'
    });
  }
}

export class InvalidHierarchyError extends BizError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      code: 'INVALID_HIERARCHY',
      message,
      context,
      userMessage: 'Invalid category hierarchy: This operation would create a circular reference'
    });
  }
}

export class OrphanCategoriesError extends BizError {
  constructor(count: number) {
    super({
      code: 'ORPHAN_CATEGORIES',
      message: `Operation would create ${count} orphaned categories`,
      context: { count },
      userMessage: 'Cannot delete category: It has child categories'
    });
  }
}

// ============================================================================
// CategoryService Implementation
// ============================================================================

export class CategoryService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // READ Operations
  // ==========================================================================

  /**
   * Get all categories with optional filters
   * @param filters Optional filters (parentId, isActive)
   * @returns Array of categories
   */
  async getAll(filters?: CategoryFilters): Promise<Category[]> {
    let sql = 'SELECT * FROM categories';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.parentId !== undefined) {
        if (filters.parentId === null) {
          conditions.push('parent_id IS NULL');
        } else {
          conditions.push('parent_id = ?');
          params.push(filters.parentId);
        }
      }

      if (filters.isActive !== undefined) {
        conditions.push('is_active = ?');
        params.push(filters.isActive ? 1 : 0);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY sort_order ASC, name ASC';

    const result: DbResult<CategoryRow> = await this.db.query<CategoryRow>(sql, params);
    return result.rows.map(this.mapRowToCategory);
  }

  /**
   * Get category by ID
   * @param id Category ID
   * @returns Category or null if not found
   */
  async getById(id: number): Promise<Category | null> {
    const result: DbResult<CategoryRow> = await this.db.query<CategoryRow>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null; // Type guard for array access safety

    return this.mapRowToCategory(row);
  }

  /**
   * Get category by slug
   * @param slug Category slug
   * @returns Category or null if not found
   */
  async getBySlug(slug: string): Promise<Category | null> {
    const result: DbResult<CategoryRow> = await this.db.query<CategoryRow>(
      'SELECT * FROM categories WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null; // Type guard for array access safety

    return this.mapRowToCategory(row);
  }

  /**
   * Get direct children of a category
   * @param parentId Parent category ID
   * @returns Array of child categories
   */
  async getChildren(parentId: number): Promise<Category[]> {
    const result: DbResult<CategoryRow> = await this.db.query<CategoryRow>(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order ASC, name ASC',
      [parentId]
    );

    return result.rows.map(this.mapRowToCategory);
  }

  /**
   * Get all ancestors of a category (from root to parent)
   * @param id Category ID
   * @returns Array of ancestor categories (root first)
   */
  async getAncestors(id: number): Promise<Category[]> {
    const ancestors: Category[] = [];
    let currentId: number | null = id;

    // Prevent infinite loops
    const visited = new Set<number>();

    while (currentId !== null) {
      if (visited.has(currentId)) {
        throw new InvalidHierarchyError(
          'Circular reference detected in category hierarchy',
          { categoryId: id, circularId: currentId }
        );
      }

      visited.add(currentId);

      const result: DbResult<CategoryRow> = await this.db.query<CategoryRow>(
        'SELECT * FROM categories WHERE id = ?',
        [currentId]
      );

      if (result.rows.length === 0) {
        break;
      }

      const row = result.rows[0];
      if (!row) break; // Type guard for array access safety

      const category = this.mapRowToCategory(row);

      // Don't include the original category in ancestors
      if (category.id !== id) {
        ancestors.unshift(category); // Add to beginning (root first)
      }

      currentId = category.parent_id || null;
    }

    return ancestors;
  }

  /**
   * Search categories by keyword
   * @param keyword Keyword to search for
   * @returns Array of matching categories
   */
  async searchByKeyword(keyword: string): Promise<Category[]> {
    const result: DbResult<CategoryRow> = await this.db.query<CategoryRow>(
      `SELECT * FROM categories
       WHERE JSON_SEARCH(keywords, 'one', ?) IS NOT NULL
       ORDER BY name ASC`,
      [keyword]
    );

    return result.rows.map(this.mapRowToCategory);
  }

  /**
   * Get breadcrumb trail for a category (ancestors + current)
   * @param id Category ID
   * @returns Array of categories (root to current)
   */
  async getBreadcrumb(id: number): Promise<Category[]> {
    const ancestors = await this.getAncestors(id);
    const current = await this.getById(id);

    if (!current) {
      throw new CategoryNotFoundError(id);
    }

    return [...ancestors, current];
  }

  /**
   * Get complete category hierarchy as nested tree
   * Root categories (parent_id = null) at top level, children nested recursively
   *
   * Algorithm: O(n) time complexity using Map-based lookups
   * - Single database query fetches all categories
   * - Map creation for O(1) parent lookups
   * - Single pass to build parent-child relationships
   * - Recursive sorting by sort_order, then name
   *
   * Edge Cases:
   * - Orphaned categories (missing parent): Promoted to root level
   * - Empty database: Returns empty array
   * - Circular references: Already prevented by validateHierarchy()
   *
   * @returns Hierarchical tree of all categories with nested children
   */
  async getHierarchy(): Promise<Category[]> {
    const allCategories = await this.getAll();
    return this.buildTree(allCategories);
  }

  /**
   * Build hierarchical tree from flat category list
   * Private helper method for getHierarchy()
   *
   * @param categories Flat array of categories from database
   * @returns Nested tree structure with children arrays
   */
  private buildTree(categories: Category[]): Category[] {
    // Create map for O(1) lookups
    const categoryMap = new Map<number, Category & { children?: Category[] }>();
    const rootCategories: (Category & { children?: Category[] })[] = [];

    // First pass: Create map and initialize children arrays
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: Build parent-child relationships
    categories.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (!category) return; // Type guard

      if (cat.parent_id === null || cat.parent_id === undefined) {
        // Root category
        rootCategories.push(category);
      } else {
        // Child category - add to parent's children array
        const parent = categoryMap.get(cat.parent_id);
        if (parent && parent.children) {
          parent.children.push(category);
        } else {
          // Orphaned category (parent doesn't exist) - promote to root
          rootCategories.push(category);
        }
      }
    });

    // Sort at each level (root and children recursively)
    const sortCategories = (cats: (Category & { children?: Category[] })[]) => {
      cats.sort((a, b) => {
        // Sort by sort_order first, then name
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.name.localeCompare(b.name);
      });

      // Recursively sort children
      cats.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          sortCategories(cat.children);
        }
      });
    };

    sortCategories(rootCategories);
    return rootCategories as Category[];
  }

  // ==========================================================================
  // WRITE Operations
  // ==========================================================================

  /**
   * Create a new category
   * @param data Category data
   * @returns Created category
   */
  async create(data: CreateCategoryInput): Promise<Category> {
    // Generate slug if not provided
    const slug = data.slug || await this.generateSlug(data.name, data.parent_id);

    // Check for duplicate slug
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new DuplicateSlugError(slug);
    }

    // Validate parent exists
    if (data.parent_id) {
      const parent = await this.getById(data.parent_id);
      if (!parent) {
        throw new CategoryNotFoundError(data.parent_id);
      }
    }

    // Insert category
    const keywordsJson = JSON.stringify(data.keywords || []);
    const result: DbResult<CategoryRow> = await this.db.query<CategoryRow>(
      `INSERT INTO categories
       (name, slug, keywords, description, cat_description, parent_id, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        slug,
        keywordsJson,
        data.description || null,
        data.cat_description || null,
        data.parent_id || null,
        data.sort_order || 0,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create category', new Error('No insert ID returned'));
    }

    const created = await this.getById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create category', new Error('Failed to retrieve created category'));
    }

    return created;
  }

  /**
   * Update a category
   * @param id Category ID
   * @param data Update data
   * @returns Updated category
   */
  async update(id: number, data: UpdateCategoryInput): Promise<Category> {
    // Check category exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new CategoryNotFoundError(id);
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateSlugError(data.slug);
      }
    }

    // Validate hierarchy if parent is being changed
    if (data.parent_id !== undefined && data.parent_id !== existing.parent_id) {
      if (data.parent_id !== null) {
        const isValid = await this.validateHierarchy(data.parent_id, id);
        if (!isValid) {
          throw new InvalidHierarchyError(
            'Cannot set parent: would create circular reference',
            { categoryId: id, newParentId: data.parent_id }
          );
        }
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }

    if (data.slug !== undefined) {
      updates.push('slug = ?');
      params.push(data.slug);
    }

    if (data.keywords !== undefined) {
      updates.push('keywords = ?');
      params.push(JSON.stringify(data.keywords));
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }

    if (data.cat_description !== undefined) {
      updates.push('cat_description = ?');
      params.push(data.cat_description);
    }

    if (data.parent_id !== undefined) {
      updates.push('parent_id = ?');
      params.push(data.parent_id);
    }

    if (data.sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(data.sort_order);
    }

    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing; // No changes
    }

    params.push(id);

    await this.db.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError('update category', new Error('Failed to retrieve updated category'));
    }

    return updated;
  }

  /**
   * Delete a category
   * @param id Category ID
   * @param orphanHandling How to handle child categories: 'reassign' (default) or 'delete'
   * @returns Deletion result with affected children count
   */
  async delete(
    id: number,
    orphanHandling: 'reassign' | 'delete' = 'reassign'
  ): Promise<{ affected_children: number }> {
    const category = await this.getById(id);
    if (!category) {
      throw new CategoryNotFoundError(id);
    }

    // Get children
    const children = await this.getChildren(id);
    let affected_children = children.length;

    // Use transaction to ensure consistency
    await this.db.transaction(async (client) => {
      if (orphanHandling === 'delete') {
        // Cascade delete: Delete all descendants recursively
        const descendantIds = await this.getAllDescendantIds(id);
        affected_children = descendantIds.length;
        if (descendantIds.length > 0) {
          await client.query(
            `DELETE FROM categories WHERE id IN (${descendantIds.map(() => '?').join(',')})`,
            descendantIds
          );
        }
      } else {
        // Reassign children to category's parent (or become root if no parent)
        if (children.length > 0) {
          await client.query(
            'UPDATE categories SET parent_id = ? WHERE parent_id = ?',
            [category.parent_id || null, id]
          );
        }
      }

      // Delete the category itself
      await client.query('DELETE FROM categories WHERE id = ?', [id]);
    });

    return { affected_children };
  }

  /**
   * Reorder categories within a parent
   * @param parentId Parent category ID (null for root)
   * @param childIds Array of child IDs in desired order
   */
  async reorder(parentId: number | null, childIds: number[]): Promise<void> {
    // Verify all children belong to the parent
    const children = await this.getAll({ parentId: parentId });
    const childIdSet = new Set(children.map(c => c.id));

    for (const id of childIds) {
      if (!childIdSet.has(id)) {
        throw BizError.badRequest(
          `Category ${id} is not a child of ${parentId || 'root'}`,
          { categoryId: id, parentId }
        );
      }
    }

    // Update sort order
    await this.db.transaction(async (client) => {
      for (let i = 0; i < childIds.length; i++) {
        await client.query(
          'UPDATE categories SET sort_order = ? WHERE id = ?',
          [i, childIds[i]]
        );
      }
    });
  }

  // ==========================================================================
  // UTILITY Operations
  // ==========================================================================

  /**
   * Generate URL-safe slug from name
   * @param name Category name
   * @param parentId Optional parent ID for uniqueness check
   * @returns URL-safe slug
   */
  async generateSlug(name: string, parentId?: number | null): Promise<string> {
    // Convert to lowercase and replace spaces/special chars with hyphens
    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    // Ensure uniqueness
    let counter = 1;
    let uniqueSlug = slug;

    while (true) {
      const existing = await this.getBySlug(uniqueSlug);
      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;

      // Safety check to prevent infinite loop
      if (counter > 1000) {
        throw BizError.internalServerError(
          'CategoryService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  /**
   * Validate that setting parentId as parent of childId won't create circular reference
   * @param parentId Proposed parent ID
   * @param childId Child category ID
   * @returns True if valid, false if would create circular reference
   */
  async validateHierarchy(parentId: number, childId: number): Promise<boolean> {
    // Cannot be parent of itself
    if (parentId === childId) {
      return false;
    }

    // Check if parentId is a descendant of childId
    let currentId: number | null = parentId;
    const visited = new Set<number>();

    while (currentId !== null) {
      if (currentId === childId) {
        return false; // Circular reference detected
      }

      if (visited.has(currentId)) {
        // Already has circular reference in hierarchy
        return false;
      }

      visited.add(currentId);

      const category = await this.getById(currentId);
      if (!category) {
        break;
      }

      currentId = category.parent_id || null;
    }

    return true;
  }

  /**
   * Move category to a new parent
   * @param id Category ID
   * @param newParentId New parent ID (null for root)
   */
  async moveToParent(id: number, newParentId: number | null): Promise<void> {
    const category = await this.getById(id);
    if (!category) {
      throw new CategoryNotFoundError(id);
    }

    // Validate new parent exists
    if (newParentId !== null) {
      const newParent = await this.getById(newParentId);
      if (!newParent) {
        throw new CategoryNotFoundError(newParentId);
      }

      // Validate hierarchy
      const isValid = await this.validateHierarchy(newParentId, id);
      if (!isValid) {
        throw new InvalidHierarchyError(
          'Cannot move category: would create circular reference',
          { categoryId: id, newParentId }
        );
      }
    }

    // Update parent
    await this.db.query(
      'UPDATE categories SET parent_id = ? WHERE id = ?',
      [newParentId, id]
    );
  }

  // ==========================================================================
  // PHASE 3: Batch Operations
  // ==========================================================================

  /**
   * Bulk update multiple categories
   * PHASE 3: NEW - Batch operations
   *
   * @param ids - Array of category IDs to update
   * @param updates - Updates to apply (partial updates supported)
   * @returns Result with updated categories and failed IDs
   */
  async bulkUpdate(
    ids: number[],
    updates: {
      parent_id?: number | null;
      is_active?: boolean;
      keywords_add?: string[];
      keywords_remove?: string[];
    }
  ): Promise<{
    updated: Category[];
    failed: Array<{ id: number; error: string }>;
  }> {
    const updated: Category[] = [];
    const failed: Array<{ id: number; error: string }> = [];

    for (const id of ids) {
      try {
        // Get current category
        const current = await this.getById(id);
        if (!current) {
          failed.push({ id, error: 'Category not found' });
          continue;
        }

        // Build update data
        const updateData: UpdateCategoryInput = {};

        // Parent ID update
        if (updates.parent_id !== undefined) {
          updateData.parent_id = updates.parent_id === 0 ? null : updates.parent_id;
        }

        // Active status update
        if (updates.is_active !== undefined) {
          updateData.is_active = updates.is_active;
        }

        // Keywords add/remove
        if (updates.keywords_add || updates.keywords_remove) {
          let keywords = current.keywords || [];

          // Add new keywords
          if (updates.keywords_add && updates.keywords_add.length > 0) {
            keywords = [...keywords, ...updates.keywords_add.filter(k => !keywords.includes(k))];
          }

          // Remove keywords
          if (updates.keywords_remove && updates.keywords_remove.length > 0) {
            keywords = keywords.filter(k => !updates.keywords_remove!.includes(k));
          }

          updateData.keywords = keywords;
        }

        // Execute update
        const category = await this.update(id, updateData);
        updated.push(category);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ id, error: errorMessage });
      }
    }

    return { updated, failed };
  }

  /**
   * Bulk delete multiple categories
   * PHASE 3: NEW - Batch operations
   *
   * @param ids - Array of category IDs to delete
   * @param orphanHandling - How to handle child categories
   * @returns Result with deletion statistics
   */
  async bulkDelete(
    ids: number[],
    orphanHandling: 'delete' | 'reassign'
  ): Promise<{
    deleted: number;
    affected_children: number;
    failed: number[];
  }> {
    let deleted = 0;
    let affected_children = 0;
    const failed: number[] = [];

    for (const id of ids) {
      try {
        // Get category and children
        const category = await this.getById(id);
        if (!category) {
          failed.push(id);
          continue;
        }

        const children = await this.getChildren(id);
        affected_children += children.length;

        // Use transaction for atomic operation
        await this.db.transaction(async (client) => {
          if (orphanHandling === 'delete') {
            // Cascade delete: Delete all children recursively
            // First, collect all descendant IDs
            const descendantIds = await this.getAllDescendantIds(id);
            if (descendantIds.length > 0) {
              await client.query(
                `DELETE FROM categories WHERE id IN (${descendantIds.map(() => '?').join(',')})`,
                descendantIds
              );
            }
          } else {
            // Reassign: Move children to category's parent
            if (children.length > 0) {
              await client.query(
                'UPDATE categories SET parent_id = ? WHERE parent_id = ?',
                [category.parent_id || null, id]
              );
            }
          }

          // Delete the category itself
          await client.query('DELETE FROM categories WHERE id = ?', [id]);
        });

        deleted++;
      } catch (error) {
        failed.push(id);
      }
    }

    return { deleted, affected_children, failed };
  }

  /**
   * Get all descendant IDs of a category (recursive)
   * Helper method for cascade delete
   */
  private async getAllDescendantIds(parentId: number): Promise<number[]> {
    const descendants: number[] = [];
    const children = await this.getChildren(parentId);

    for (const child of children) {
      descendants.push(child.id);
      const childDescendants = await this.getAllDescendantIds(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  // ==========================================================================
  // PHASE 5: Import/Export Operations
  // ==========================================================================

  /**
   * Export categories for data portability
   * PHASE 5: NEW - Import/Export functionality
   *
   * @param ids - Optional array of category IDs to export (exports all if not provided)
   * @param options - Export options (includeInactive, hierarchical)
   * @returns Array of categories ready for export
   */
  async exportCategories(
    ids?: number[],
    options?: { includeInactive?: boolean; hierarchical?: boolean }
  ): Promise<Category[]> {
    const includeInactive = options?.includeInactive ?? true;

    if (ids && ids.length > 0) {
      // Export specific categories
      const placeholders = ids.map(() => '?').join(',');
      const sql = `
        SELECT * FROM categories
        WHERE id IN (${placeholders})
        ${!includeInactive ? 'AND is_active = 1' : ''}
        ORDER BY sort_order ASC, name ASC
      `;

      const result: DbResult<CategoryRow> = await this.db.query<CategoryRow>(sql, ids);
      return result.rows.map(this.mapRowToCategory);
    } else {
      // Export all categories
      const filters: CategoryFilters = {};
      if (!includeInactive) {
        filters.isActive = true;
      }

      const all = await this.getAll(filters);

      // Return hierarchical or flat based on options
      if (options?.hierarchical) {
        return this.buildTree(all);
      } else {
        return all;
      }
    }
  }

  /**
   * Validate import data and detect conflicts
   * PHASE 5: NEW - Import preview functionality
   *
   * @param categories - Categories to validate
   * @returns Validation result with conflicts and errors
   */
  async validateImport(
    categories: Array<{
      importId?: number;
      name: string;
      slug?: string;
      description?: string | null;
      cat_description?: string | null;
      keywords?: string[] | null;
      parent_id?: number | null;
      sort_order?: number;
      is_active?: boolean;
    }>
  ): Promise<{
    total: number;
    valid: number;
    conflicts: Array<{ slug: string; existingId: number; existingName: string; importName: string; importRow: number }>;
    errors: Array<{ row: number; field: string; message: string }>;
  }> {
    const errors: Array<{ row: number; field: string; message: string }> = [];
    const conflicts: Array<{ slug: string; existingId: number; existingName: string; importName: string; importRow: number }> = [];

    // Get all existing categories
    const existing = await this.getAll();
    const existingSlugs = new Map(existing.map(cat => [cat.slug, cat]));

    // Validate each category
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const rowNumber = i + 1;

      if (!cat) continue;

      // Required: name
      if (!cat.name || cat.name.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'name',
          message: 'Name is required'
        });
      }

      // Generate slug if not provided
      const slug = cat.slug || await this.generateSlug(cat.name);

      // Check for conflicts
      const existingCat = existingSlugs.get(slug);
      if (existingCat) {
        conflicts.push({
          slug,
          existingId: existingCat.id,
          existingName: existingCat.name,
          importName: cat.name,
          importRow: rowNumber
        });
      }
    }

    return {
      total: categories.length,
      valid: categories.length - errors.length,
      conflicts,
      errors
    };
  }

  /**
   * Import categories with conflict resolution
   * PHASE 5: NEW - Import execution functionality
   *
   * @param categories - Categories to import
   * @param conflictResolution - How to handle slug conflicts (skip, overwrite, rename)
   * @returns Import result summary
   */
  async importCategories(
    categories: Array<{
      importId?: number;
      name: string;
      slug?: string;
      description?: string | null;
      cat_description?: string | null;
      keywords?: string[] | null;
      parent_id?: number | null;
      sort_order?: number;
      is_active?: boolean;
    }>,
    conflictResolution: 'skip' | 'overwrite' | 'rename'
  ): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    renamed: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    if (categories.length > 100) {
      throw BizError.badRequest(
        'Maximum 100 categories per import. Split your file into smaller batches.',
        { count: categories.length }
      );
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let renamed = 0;
    const errors: Array<{ row: number; field: string; message: string }> = [];

    // Get all existing categories
    const existing = await this.getAll();
    const existingSlugs = new Map(existing.map(cat => [cat.slug, cat]));

    // Use transaction for atomic operation
    await this.db.transaction(async (client) => {
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const rowNumber = i + 1;

        if (!cat) continue;

        try {
          // Generate slug if not provided
          let slug = cat.slug || await this.generateSlug(cat.name);

          // Check for conflict
          const existingCat = existingSlugs.get(slug);

          if (existingCat) {
            if (conflictResolution === 'skip') {
              // Skip conflicting category
              skipped++;
              continue;
            } else if (conflictResolution === 'overwrite') {
              // Update existing category
              await client.query(
                `UPDATE categories
                 SET name = ?, description = ?, cat_description = ?, keywords = ?,
                     parent_id = ?, sort_order = ?, is_active = ?
                 WHERE id = ?`,
                [
                  cat.name,
                  cat.description || null,
                  cat.cat_description || null,
                  JSON.stringify(cat.keywords || []),
                  cat.parent_id || null,
                  cat.sort_order ?? 0,
                  cat.is_active !== false ? 1 : 0,
                  existingCat.id
                ]
              );
              updated++;
              continue;
            } else if (conflictResolution === 'rename') {
              // Generate unique slug with suffix
              let counter = 1;
              let uniqueSlug = `${slug}-${counter}`;
              while (existingSlugs.has(uniqueSlug)) {
                counter++;
                uniqueSlug = `${slug}-${counter}`;
                if (counter > 100) {
                  throw new Error('Failed to generate unique slug after 100 attempts');
                }
              }
              slug = uniqueSlug;
              renamed++;
            }
          }

          // Insert new category
          const keywordsJson = JSON.stringify(cat.keywords || []);
          await client.query(
            `INSERT INTO categories
             (name, slug, keywords, description, cat_description, parent_id, sort_order, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cat.name,
              slug,
              keywordsJson,
              cat.description || null,
              cat.cat_description || null,
              cat.parent_id || null,
              cat.sort_order ?? 0,
              cat.is_active !== false ? 1 : 0
            ]
          );
          imported++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ row: rowNumber, field: 'general', message: errorMessage });
        }
      }
    });

    return { imported, updated, skipped, renamed, errors };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Map database row to Category interface
   * Uses safeJsonParse for keywords field (MariaDB auto-parses JSON)
   *
   * @param row - Typed CategoryRow from database
   * @returns Category - Application-level Category object
   */
  private mapRowToCategory(row: CategoryRow): Category {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      keywords: safeJsonParse(row.keywords, []),
      description: row.description || undefined,
      cat_description: row.cat_description || undefined,
      parent_id: row.parent_id || null,
      sort_order: row.display_order, // Note: database column is display_order
      is_active: Boolean(row.is_active),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at || row.created_at) // Fallback if updated_at is null
    };
  }
}

// ============================================================================
// Service Factory
// ============================================================================

let categoryServiceInstance: CategoryService | null = null;

/**
 * Get CategoryService singleton instance
 * Creates instance with DatabaseService dependency
 */
export function getCategoryService(): CategoryService {
  if (!categoryServiceInstance) {
    // Import getDatabaseService here to avoid circular dependencies
    const { getDatabaseService } = require('./DatabaseService');
    const db = getDatabaseService();
    categoryServiceInstance = new CategoryService(db);
  }
  return categoryServiceInstance;
}
