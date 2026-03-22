/**
 * JSON Utility Functions
 *
 * Safe JSON parsing and stringification utilities
 *
 * @governance Build Map v2.1 ENHANCED - Utility layer
 */

/**
 * Safely parse JSON string
 * Returns null if parsing fails
 *
 * @param jsonString JSON string to parse
 * @returns Parsed object or null
 */
export function safeJsonParse<T = unknown>(jsonString: string | null | undefined): T | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

/**
 * Safely stringify object to JSON
 * Returns null if stringification fails
 *
 * @param obj Object to stringify
 * @returns JSON string or null
 */
export function safeJsonStringify(obj: unknown): string | null {
  try {
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}
