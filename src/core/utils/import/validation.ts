/**
 * Import Validation Utility - Validate import data
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { ImportCategoryInput, ImportError, ImportConflict } from '@core/types/import-export';
import { Category } from '@core/services/CategoryService';

/**
 * Validate category import data
 * Checks required fields and data types
 *
 * @param categories - Categories to validate
 * @returns Array of validation errors
 */
export function validateCategoryImport(
  categories: ImportCategoryInput[]
): ImportError[] {
  const errors: ImportError[] = [];

  categories.forEach((cat, index) => {
    const rowNumber = index + 1;

    // Required: name
    if (!cat.name || cat.name.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Name is required'
      });
    }

    // Validate parent_id is a number if provided
    if (cat.parent_id !== null && cat.parent_id !== undefined) {
      if (typeof cat.parent_id !== 'number' || isNaN(cat.parent_id)) {
        errors.push({
          row: rowNumber,
          field: 'parent_id',
          message: 'Parent ID must be a number'
        });
      }
    }

    // Validate sort_order is a number if provided
    if (cat.sort_order !== undefined) {
      if (typeof cat.sort_order !== 'number' || isNaN(cat.sort_order)) {
        errors.push({
          row: rowNumber,
          field: 'sort_order',
          message: 'Sort order must be a number'
        });
      }
    }
  });

  // Check for circular references
  const circularErrors = detectCircularReferences(categories);
  errors.push(...circularErrors);

  return errors;
}

/**
 * Detect slug conflicts with existing categories
 *
 * @param importCategories - Categories to import
 * @param existingCategories - Existing categories in database
 * @returns Array of conflicts
 */
export function detectConflicts(
  importCategories: ImportCategoryInput[],
  existingCategories: Category[]
): ImportConflict[] {
  const conflicts: ImportConflict[] = [];
  const existingSlugs = new Map(existingCategories.map(cat => [cat.slug, cat]));

  importCategories.forEach((importCat, index) => {
    const slug = importCat.slug || generateSlugFromName(importCat.name);
    const existing = existingSlugs.get(slug);

    if (existing) {
      conflicts.push({
        slug,
        existingId: existing.id,
        existingName: existing.name,
        importName: importCat.name,
        importRow: index + 1
      });
    }
  });

  return conflicts;
}

/**
 * Detect circular references in import data
 * Checks if any category references itself in parent chain
 *
 * @param categories - Categories to check
 * @returns Array of circular reference errors
 */
function detectCircularReferences(
  categories: ImportCategoryInput[]
): ImportError[] {
  const errors: ImportError[] = [];
  const categoryMap = new Map(categories.map((cat, i) => [cat.importId ?? i, cat]));

  categories.forEach((cat, index) => {
    if (!cat.parent_id) return; // Root category, no circular reference possible

    const visited = new Set<number>();
    let currentId: number | null = cat.parent_id;

    while (currentId !== null) {
      if (visited.has(currentId)) {
        // Circular reference detected
        errors.push({
          row: index + 1,
          field: 'parent_id',
          message: 'Circular reference detected in category hierarchy'
        });
        break;
      }

      visited.add(currentId);

      const parent = categoryMap.get(currentId);
      if (!parent) {
        // Parent not found in import data (may exist in database)
        break;
      }

      currentId = parent.parent_id ?? null;
    }
  });

  return errors;
}

/**
 * Generate slug from category name
 * Helper function for conflict detection
 *
 * @param name - Category name
 * @returns URL-safe slug
 */
function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
