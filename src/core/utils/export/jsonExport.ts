/**
 * JSON Export Utility - Generate hierarchical JSON export
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { Category } from '@core/services/CategoryService';

/**
 * Generate JSON export from categories
 * Supports both hierarchical (nested children) and flat (parent_id) formats
 *
 * @param categories - Array of categories to export
 * @param hierarchical - Whether to use nested structure (default: true)
 * @returns Formatted JSON string
 */
export function generateJSONExport(
  categories: Category[],
  hierarchical: boolean = true
): string {
  const data = hierarchical
    ? categories // Already hierarchical from getHierarchy()
    : categories.map(cat => {
        // Flat format - remove children property
        const { ...flatCat } = cat;
        return flatCat;
      });

  return JSON.stringify(data, null, 2);
}
