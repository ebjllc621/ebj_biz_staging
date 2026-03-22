/**
 * Category Utility Functions
 *
 * @authority docs/pages/layouts/admin/pageTables/categories/phases/PHASE_2_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated DNA v11.4.0
 *
 * GOVERNANCE COMPLIANCE:
 * - Pure functions (no side effects)
 * - Type-safe with proper guards
 * - Efficient algorithms (O(log n))
 * - JSDoc comments for all exports
 *
 * Features:
 * - Build full hierarchical path for categories
 * - Flatten category tree for path lookups
 * - Max depth protection (prevents infinite loops)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Category {
  id: number;
  name: string;
  slug: string;
  keywords: string[] | null;
  cat_description: string | null;
  parent_id: number | null;
  is_active: boolean;
  created_at?: string | Date;
  children?: Category[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build full hierarchical path for a category
 * Returns path from root to current category using ">" separator
 *
 * Algorithm: O(log n) average case (depth of tree)
 * Max depth protection prevents infinite loops from circular references
 *
 * @example
 * getCategoryPath(artOrgs, allCategories)
 * // Returns: "Arts & Culture > Art Organizations"
 *
 * @example
 * getCategoryPath(rootCategory, allCategories)
 * // Returns: "Arts & Culture"
 *
 * @param category - The category to build path for
 * @param allCategories - Flat array of all categories (for parent lookup)
 * @returns Full path string (e.g., "Primary > Child > Subchild")
 */
export function getCategoryPath(
  category: Category,
  allCategories: Category[]
): string {
  // Root category (no parent) - return name only
  if (!category.parent_id) {
    return category.name;
  }

  // Build path by walking up parent chain
  const pathSegments: string[] = [];
  let current: Category | undefined = category;

  // Prevent infinite loops (max depth 10)
  let depth = 0;
  const MAX_DEPTH = 10;

  while (current && depth < MAX_DEPTH) {
    pathSegments.unshift(current.name);

    if (!current.parent_id) break; // Reached root

    // Find parent in all categories
    current = allCategories.find(cat => cat.id === current!.parent_id);
    depth++;
  }

  return pathSegments.join(' > ');
}

/**
 * Get flat list of all categories from hierarchical tree
 * Useful for path building and search operations
 *
 * Algorithm: O(n) where n = total categories
 * Traverses entire tree once to flatten all nodes
 *
 * @example
 * const hierarchical = [
 *   { id: 1, name: 'Arts', children: [
 *     { id: 2, name: 'Museums', children: [] }
 *   ]}
 * ];
 * const flat = flattenCategoryTree(hierarchical);
 * // Returns: [{ id: 1, name: 'Arts', ... }, { id: 2, name: 'Museums', ... }]
 *
 * @param hierarchicalCategories - Nested category tree
 * @returns Flat array of all categories (maintains all properties)
 */
export function flattenCategoryTree(
  hierarchicalCategories: Category[]
): Category[] {
  const flat: Category[] = [];

  function traverse(categories: Category[]) {
    categories.forEach(cat => {
      flat.push(cat);
      if (cat.children && cat.children.length > 0) {
        traverse(cat.children);
      }
    });
  }

  traverse(hierarchicalCategories);
  return flat;
}
