/**
 * BigInt Conversion Utilities
 *
 * MariaDB COUNT() queries return BigInt values which cannot be JSON serialized.
 * These utilities safely convert BigInt to Number for JSON responses.
 *
 * @authority docs/dna/database-package-canonical.md - mariadb driver returns BigInt for COUNT()
 */

/**
 * Convert BigInt to Number safely
 * Throws if the BigInt value exceeds Number.MAX_SAFE_INTEGER
 *
 * @param value - BigInt or Number value
 * @returns Number value
 */
export function bigIntToNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  // Check if BigInt exceeds safe integer range
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new Error(`BigInt value ${value} exceeds Number.MAX_SAFE_INTEGER`);
  }

  return Number(value);
}

/**
 * Convert object with BigInt values to Numbers
 * Recursively processes nested objects
 *
 * @param obj - Object potentially containing BigInt values
 * @returns Object with BigInt values converted to Numbers
 */
export function convertBigIntsToNumbers<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return bigIntToNumber(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntsToNumbers) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigIntsToNumbers(value);
    }
    return result;
  }

  return obj;
}

/**
 * Safely parse JSON that may already be parsed by mariadb
 *
 * MariaDB auto-parses JSON columns, so calling JSON.parse() on already-parsed
 * data throws an error. This function checks if the value is already an object/array.
 *
 * @param value - String or already-parsed value
 * @param fallback - Default value if null/undefined
 * @returns Parsed value or fallback
 *
 * @example
 * ```typescript
 * // Works with both string JSON and pre-parsed objects
 * const tags = safeJsonParse(row.tags, []);
 * ```
 *
 * @authority docs/pages/layouts/trouble/1-24-26/SYSREP_BIGINT_PATTERN_ANALYSIS.md
 */
export function safeJsonParse<T>(value: string | T | null | undefined, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  // Already parsed by mariadb - return as-is
  if (typeof value === 'object') {
    return value as T;
  }

  // String value - parse it
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return fallback;
}
