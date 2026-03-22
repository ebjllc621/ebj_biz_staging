/**
 * CSV Export Utility - Generate flat CSV export with proper escaping
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { Category } from '@core/services/CategoryService';

/**
 * Generate CSV export from categories
 * Flat structure with parent_id references (not nested)
 *
 * @param categories - Array of categories to export (flat)
 * @returns CSV string with UTF-8 BOM for Excel compatibility
 */
export function generateCSVExport(categories: Category[]): string {
  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';

  // Define columns in desired order
  const columns: Array<{ key: keyof Category; header: string }> = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    { key: 'description', header: 'Description' },
    { key: 'cat_description', header: 'Alternative Description' },
    { key: 'keywords', header: 'Keywords' },
    { key: 'parent_id', header: 'Parent ID' },
    { key: 'sort_order', header: 'Sort Order' },
    { key: 'is_active', header: 'Active' },
    { key: 'created_at', header: 'Created At' },
    { key: 'updated_at', header: 'Updated At' }
  ];

  // Header row
  const headerRow = columns.map(col => escapeCSVValue(col.header)).join(',');

  // Data rows
  const dataRows = categories.map(category =>
    columns.map(col => {
      const value = category[col.key];

      // Handle different value types
      if (value === null || value === undefined) {
        return '';
      }

      if (col.key === 'keywords') {
        // Keywords array to comma-separated string
        const keywords = value as string[];
        return escapeCSVValue(keywords.join(', '));
      }

      if (col.key === 'created_at' || col.key === 'updated_at') {
        // Handle both Date objects and string dates (MariaDB returns strings)
        if (value instanceof Date) {
          return escapeCSVValue(value.toISOString());
        }
        // Already a string from database
        return escapeCSVValue(String(value));
      }

      if (col.key === 'is_active') {
        // Boolean to string
        return value ? 'TRUE' : 'FALSE';
      }

      // Default: convert to string
      return escapeCSVValue(String(value));
    }).join(',')
  );

  return BOM + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Escape CSV value according to RFC 4180
 * Handles quotes, commas, and newlines
 *
 * @param value - Value to escape
 * @returns Escaped value
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    // Wrap in quotes and escape internal quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
