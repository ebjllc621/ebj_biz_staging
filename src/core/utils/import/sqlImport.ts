/**
 * SQL Import Utility - Parse SQL INSERT statements
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { ImportCategoryInput } from '@core/types/import-export';

/**
 * Parse SQL import content
 * Extracts data from INSERT statements (ignores other SQL commands)
 *
 * @param content - SQL file content as string
 * @returns Array of import category inputs
 * @throws Error if SQL is malformed
 */
export function parseSQLImport(content: string): ImportCategoryInput[] {
  const insertRegex = /INSERT INTO\s+\w+\s*\((.*?)\)\s*VALUES\s*\((.*?)\);/gi;
  const matches = Array.from(content.matchAll(insertRegex));

  if (matches.length === 0) {
    throw new Error('No INSERT statements found in SQL file');
  }

  const categories: ImportCategoryInput[] = [];

  for (const match of matches) {
    const columnsStr = match[1];
    const valuesStr = match[2];

    if (!columnsStr || !valuesStr) continue;

    // Parse column names
    const columns = columnsStr.split(',').map(col => col.trim());

    // Parse values
    const values = parseValuesClause(valuesStr);

    if (columns.length !== values.length) {
      throw new Error('Column count does not match value count in INSERT statement');
    }

    // Map columns to values
    const row: Record<string, string | null> = {};
    columns.forEach((col, index) => {
      row[col] = values[index] ?? null;
    });

    // Convert to ImportCategoryInput
    categories.push({
      importId: row.id ? parseInt(row.id, 10) : undefined,
      name: row.name || '',
      slug: row.slug || undefined,
      description: row.description || null,
      cat_description: row.cat_description || null,
      keywords: row.keywords ? JSON.parse(row.keywords) : null,
      parent_id: row.parent_id && row.parent_id !== 'NULL'
        ? parseInt(row.parent_id, 10)
        : null,
      sort_order: row.sort_order ? parseInt(row.sort_order, 10) : 0,
      is_active: row.is_active === '1' || row.is_active === 'TRUE'
    });
  }

  return categories;
}

/**
 * Parse VALUES clause from INSERT statement
 * Handles quoted strings, NULLs, and numbers
 *
 * @param valuesStr - VALUES clause content
 * @returns Array of value strings
 */
function parseValuesClause(valuesStr: string): (string | null)[] {
  const values: (string | null)[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar: string | null = null;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (!inQuotes && (char === "'" || char === '"')) {
      // Start of quoted string
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar) {
      // Check if escaped quote
      if (valuesStr[i + 1] === quoteChar) {
        // Escaped quote -> include one quote
        current += quoteChar;
        i++; // Skip next quote
      } else {
        // End of quoted string
        inQuotes = false;
        quoteChar = null;
      }
    } else if (!inQuotes && char === ',') {
      // End of value
      values.push(normalizeValue(current.trim()));
      current = '';
    } else {
      // Regular character
      current += char;
    }
  }

  // Add last value
  if (current.trim()) {
    values.push(normalizeValue(current.trim()));
  }

  return values;
}

/**
 * Normalize SQL value
 * Handles NULL, quoted strings, and numbers
 *
 * @param value - Raw SQL value
 * @returns Normalized value or null
 */
function normalizeValue(value: string): string | null {
  if (value.toUpperCase() === 'NULL') {
    return null;
  }

  // Remove surrounding quotes
  if ((value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }

  return value;
}
