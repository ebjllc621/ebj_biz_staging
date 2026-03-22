/**
 * Search Utility Functions
 *
 * Provides search mode detection, query parsing, and text processing utilities
 * for enhanced search functionality across admin pages.
 *
 * @tier STANDARD
 * @phase Phase 6 - Enhanced Search Functionality
 * @generated DNA v11.4.0
 *
 * GOVERNANCE:
 * - TypeScript strict mode compliant
 * - No external dependencies
 * - Reusable across admin pages
 */

/**
 * Search mode type definition
 */
export type SearchMode = 'all' | 'id' | 'name' | 'slug' | 'keyword';

/**
 * Detect search mode from query string
 *
 * @param query - Search query string
 * @returns Detected search mode
 *
 * @example
 * detectSearchMode("#123") // 'id'
 * detectSearchMode("123") // 'id'
 * detectSearchMode("keyword:food") // 'keyword'
 * detectSearchMode("coffee") // 'all'
 */
export function detectSearchMode(query: string): SearchMode {
  const trimmed = query.trim();

  // ID mode: starts with "#" or is pure number
  if (trimmed.startsWith('#') || /^\d+$/.test(trimmed)) {
    return 'id';
  }

  // Keyword mode: starts with "keyword:" prefix (case-insensitive)
  if (trimmed.toLowerCase().startsWith('keyword:')) {
    return 'keyword';
  }

  // Default: search all fields (name + slug)
  return 'all';
}

/**
 * Parse numeric ID from query string
 *
 * @param query - Query string (e.g., "#123" or "123")
 * @returns Parsed ID number or null if invalid
 *
 * @example
 * parseIdFromQuery("#123") // 123
 * parseIdFromQuery("123") // 123
 * parseIdFromQuery("abc") // null
 */
export function parseIdFromQuery(query: string): number | null {
  const cleaned = query.replace(/^#/, '').trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse keyword from "keyword:" prefixed query
 *
 * @param query - Query string (e.g., "keyword:food")
 * @returns Extracted keyword text
 *
 * @example
 * parseKeywordFromQuery("keyword:food") // "food"
 * parseKeywordFromQuery("keyword: restaurant ") // "restaurant"
 */
export function parseKeywordFromQuery(query: string): string {
  return query.replace(/^keyword:/i, '').trim();
}

/**
 * Escape special regex characters for safe RegExp construction
 *
 * Prevents regex injection and ensures literal matching of special characters
 * like +, *, ?, $, etc.
 *
 * @param string - String to escape
 * @returns Escaped string safe for RegExp
 *
 * @example
 * escapeRegex("C++") // "C\\+\\+"
 * escapeRegex("cost $100") // "cost \\$100"
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// USER-SPECIFIC SEARCH UTILITIES
// ============================================================================

/**
 * User search mode type
 */
export type UserSearchMode = 'all' | 'id' | 'email' | 'username';

/**
 * Detect search mode for user searches
 *
 * @param query - Search query string
 * @returns Detected user search mode
 *
 * @example
 * detectUserSearchMode("#123") // 'id'
 * detectUserSearchMode("123") // 'id'
 * detectUserSearchMode("john@example.com") // 'email'
 * detectUserSearchMode("@john") // 'username'
 * detectUserSearchMode("john") // 'all'
 */
export function detectUserSearchMode(query: string): UserSearchMode {
  const trimmed = query.trim();

  // ID mode: starts with "#" or is pure number
  if (trimmed.startsWith('#') || /^\d+$/.test(trimmed)) {
    return 'id';
  }

  // Email mode: contains "@" and looks like email
  if (trimmed.includes('@') && trimmed.length > 1) {
    // If starts with @, it's username search
    if (trimmed.startsWith('@')) {
      return 'username';
    }
    return 'email';
  }

  // Default: search all fields
  return 'all';
}

// ============================================================================
// LISTING-SPECIFIC SEARCH UTILITIES
// ============================================================================

/**
 * Listing search mode type
 */
export type ListingSearchMode = 'all' | 'id' | 'name' | 'owner';

/**
 * Detect search mode for listing searches
 *
 * @param query - Search query string
 * @returns Detected listing search mode
 *
 * @example
 * detectListingSearchMode("#123") // 'id'
 * detectListingSearchMode("123") // 'id'
 * detectListingSearchMode("owner:john") // 'owner'
 * detectListingSearchMode("Coffee Shop") // 'all'
 */
export function detectListingSearchMode(query: string): ListingSearchMode {
  const trimmed = query.trim();

  // ID mode: starts with "#" or is pure number
  if (trimmed.startsWith('#') || /^\d+$/.test(trimmed)) {
    return 'id';
  }

  // Owner mode: starts with "owner:" prefix (case-insensitive)
  if (trimmed.toLowerCase().startsWith('owner:')) {
    return 'owner';
  }

  // Name mode: starts with "name:" prefix (case-insensitive)
  if (trimmed.toLowerCase().startsWith('name:')) {
    return 'name';
  }

  // Default: search all fields
  return 'all';
}

/**
 * Parse owner name from "owner:" prefixed query
 */
export function parseOwnerFromQuery(query: string): string {
  return query.replace(/^owner:/i, '').trim();
}

/**
 * Parse listing name from "name:" prefixed query
 */
export function parseNameFromQuery(query: string): string {
  return query.replace(/^name:/i, '').trim();
}
