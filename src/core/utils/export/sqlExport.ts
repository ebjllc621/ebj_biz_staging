/**
 * SQL Export Utility - Generate MariaDB INSERT statements
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { Category } from '@core/services/CategoryService';

/**
 * Generate SQL export from categories
 * MariaDB-compatible INSERT statements with transaction wrapper
 *
 * @param categories - Array of categories to export (flat)
 * @param tableName - Table name (default: 'categories')
 * @returns SQL string with INSERT statements
 */
export function generateSQLExport(
  categories: Category[],
  tableName: string = 'categories'
): string {
  const columns = [
    'id',
    'name',
    'slug',
    'description',
    'cat_description',
    'keywords',
    'parent_id',
    'sort_order',
    'is_active',
    'created_at',
    'updated_at'
  ];

  const statements = categories.map(cat => {
    const values = [
      cat.id,
      escapeSQLValue(cat.name),
      escapeSQLValue(cat.slug),
      escapeSQLValue(cat.description || null),
      escapeSQLValue(cat.cat_description || null),
      escapeSQLValue(JSON.stringify(cat.keywords || [])),
      cat.parent_id ?? 'NULL',
      cat.sort_order ?? 0,
      cat.is_active ? 1 : 0,
      escapeSQLValue(formatDateForSQL(cat.created_at)),
      escapeSQLValue(formatDateForSQL(cat.updated_at))
    ];

    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
  });

  return [
    '-- Categories Export',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total: ${categories.length} categories`,
    '',
    'START TRANSACTION;',
    '',
    ...statements,
    '',
    'COMMIT;'
  ].join('\n');
}

/**
 * Format date for SQL export
 * Handles both Date objects and string dates (MariaDB returns strings)
 *
 * @param value - Date or string value
 * @returns ISO string format
 */
function formatDateForSQL(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  // Already a string from database
  return String(value);
}

/**
 * Escape SQL value for MariaDB
 * Handles NULL values and string escaping
 *
 * @param value - Value to escape
 * @returns Escaped SQL value
 */
function escapeSQLValue(value: string | number | null | undefined): string | number {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return value;
  }

  // Escape single quotes by doubling them
  return `'${String(value).replace(/'/g, "''")}'`;
}
