/**
 * JSON Import Utility - Parse JSON import files
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { ImportCategoryInput } from '@core/types/import-export';

/**
 * Parse JSON import content
 * Supports both hierarchical (nested children) and flat (parent_id) formats
 *
 * @param content - JSON file content as string
 * @returns Array of import category inputs
 * @throws Error if JSON is malformed
 */
export function parseJSONImport(content: string): ImportCategoryInput[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('JSON must be an array of categories');
  }

  // Flatten if hierarchical (nested children)
  const flattened = flattenHierarchical(parsed);

  // Map to ImportCategoryInput format
  return flattened.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Invalid category at index ${index}: must be an object`);
    }

    const cat = item as Record<string, unknown>;

    return {
      importId: typeof cat.id === 'number' ? cat.id : undefined,
      name: String(cat.name || ''),
      slug: cat.slug ? String(cat.slug) : undefined,
      description: cat.description ? String(cat.description) : null,
      cat_description: cat.cat_description ? String(cat.cat_description) : null,
      keywords: Array.isArray(cat.keywords)
        ? cat.keywords.map(k => String(k))
        : null,
      parent_id: typeof cat.parent_id === 'number' ? cat.parent_id : null,
      sort_order: typeof cat.sort_order === 'number' ? cat.sort_order : 0,
      is_active: typeof cat.is_active === 'boolean' ? cat.is_active : true
    };
  });
}

/**
 * Flatten hierarchical JSON structure
 * Recursively extracts all categories from nested children
 *
 * @param categories - Potentially hierarchical category array
 * @returns Flat array of categories
 */
function flattenHierarchical(categories: unknown[]): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  function traverse(items: unknown[]) {
    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;

      const cat = item as Record<string, unknown>;

      // Add category (without children property)
      const { children, ...flatCat } = cat;
      result.push(flatCat);

      // Recursively traverse children
      if (Array.isArray(children) && children.length > 0) {
        traverse(children);
      }
    }
  }

  traverse(categories);
  return result;
}
