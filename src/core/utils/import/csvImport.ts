/**
 * CSV Import Utility - Parse CSV import files
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { ImportCategoryInput, CSVParseOptions } from '@core/types/import-export';

/**
 * Parse CSV import content
 * Auto-detects delimiter and handles quoted values with embedded delimiters
 *
 * @param content - CSV file content as string
 * @param options - Optional parsing options
 * @returns Array of import category inputs
 * @throws Error if CSV is malformed
 */
export function parseCSVImport(
  content: string,
  options?: CSVParseOptions
): ImportCategoryInput[] {
  const delimiter = options?.delimiter ?? detectDelimiter(content);
  const hasHeader = options?.hasHeader ?? true;

  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const firstLine = lines[0];
  if (!firstLine) {
    throw new Error('CSV file has no content');
  }

  const headers = hasHeader
    ? parseCSVLine(firstLine, delimiter)
    : generateDefaultHeaders();

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, i) => {
      row[header] = values[i] ?? '';
    });

    // Map CSV columns to ImportCategoryInput
    const idValue = row.id || row.ID;
    const nameValue = row.name || row.Name;
    const slugValue = row.slug || row.Slug;
    const descValue = row.description || row.Description;
    const catDescValue = row.cat_description || row['Alternative Description'];
    const keywordsValue = row.keywords || row.Keywords;
    const parentIdValue = row.parent_id || row['Parent ID'];
    const sortOrderValue = row.sort_order || row['Sort Order'];
    const isActiveValue = row.is_active || row.Active;

    return {
      importId: idValue ? parseInt(idValue, 10) : undefined,
      name: nameValue || '',
      slug: slugValue || undefined,
      description: descValue || null,
      cat_description: catDescValue || null,
      keywords: keywordsValue
        ? keywordsValue.split(',').map(k => k.trim()).filter(k => k)
        : null,
      parent_id: parentIdValue
        ? parseInt(parentIdValue, 10)
        : null,
      sort_order: sortOrderValue
        ? parseInt(sortOrderValue, 10)
        : 0,
      is_active: isActiveValue
        ? isActiveValue.toLowerCase() === 'true'
        : true
    };
  });
}

/**
 * Auto-detect CSV delimiter
 * Counts occurrences of common delimiters in first line
 *
 * @param content - CSV content
 * @returns Detected delimiter
 */
function detectDelimiter(content: string): ',' | ';' | '\t' {
  const firstLine = content.split(/\r?\n/)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };

  for (const char of firstLine) {
    if (char === ',') counts[',']++;
    else if (char === ';') counts[';']++;
    else if (char === '\t') counts['\t']++;
  }

  // Return delimiter with highest count
  const entries = Object.entries(counts) as Array<[',', number] | [';', number] | ['\t', number]>;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? ',';
}

/**
 * Parse single CSV line with proper handling of quoted values
 * Handles quotes, embedded delimiters, and escaped quotes
 *
 * @param line - CSV line to parse
 * @param delimiter - Column delimiter
 * @returns Array of values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote ("") -> single quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of value
      values.push(current);
      current = '';
    } else {
      // Regular character
      current += char;
    }
  }

  // Add last value
  values.push(current);

  return values;
}

/**
 * Generate default headers if CSV has no header row
 *
 * @returns Default column headers
 */
function generateDefaultHeaders(): string[] {
  return [
    'id',
    'name',
    'slug',
    'description',
    'cat_description',
    'keywords',
    'parent_id',
    'sort_order',
    'is_active'
  ];
}
