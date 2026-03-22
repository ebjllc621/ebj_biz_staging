/**
 * Search History Utilities
 *
 * Provides localStorage-based search history management for admin pages.
 *
 * @tier STANDARD
 * @phase Phase 6 - Enhanced Search Functionality
 * @generated DNA v11.4.0
 *
 * GOVERNANCE:
 * - SSR-safe (checks for browser environment)
 * - Error handling with graceful degradation
 * - Max 5 entries to prevent localStorage bloat
 * - No PII storage (only search queries)
 */

import type { SearchMode } from './search';

/**
 * Search history entry structure
 */
export interface SearchHistoryEntry {
  query: string;
  mode: SearchMode | string;
  timestamp: number;
}

/**
 * localStorage key for search history
 */
const SEARCH_HISTORY_KEY = 'admin_categories_search_history';

/**
 * Maximum number of history entries to store
 */
const MAX_HISTORY_ITEMS = 5;

/**
 * Get search history from localStorage
 *
 * @returns Array of search history entries (newest first)
 *
 * @example
 * const history = getSearchHistory();
 * // [{ query: "coffee", mode: "all", timestamp: 1706540000000 }, ...]
 */
export function getSearchHistory(): SearchHistoryEntry[] {
  // SSR safety check
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load search history:', error);
    return [];
  }
}

/**
 * Save search to history
 *
 * Deduplicates entries (moves to top if repeated) and maintains max limit.
 *
 * @param query - Search query string
 * @param mode - Search mode used
 *
 * @example
 * saveSearchToHistory("coffee", "all");
 * saveSearchToHistory("#123", "id");
 */
export function saveSearchToHistory(query: string, mode: SearchMode): void {
  // SSR safety check
  if (typeof window === 'undefined' || !query.trim()) {
    return;
  }

  try {
    const history = getSearchHistory();

    // Remove duplicate if exists (deduplication)
    const filtered = history.filter(h => h.query !== query);

    // Add to front, limit to max entries
    const updated: SearchHistoryEntry[] = [
      { query, mode, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save search history:', error);
    // Graceful degradation - continue without saving
  }
}

/**
 * Clear all search history
 *
 * @example
 * clearSearchHistory();
 */
export function clearSearchHistory(): void {
  // SSR safety check
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.warn('Failed to clear search history:', error);
  }
}

// ============================================================================
// ENTITY-SPECIFIC SEARCH HISTORY UTILITIES
// ============================================================================

/**
 * Create entity-specific localStorage key
 * @param entityType - Entity type for namespacing
 */
export function createSearchHistoryKey(entityType: string): string {
  return `admin_${entityType}_search_history`;
}

/**
 * Get search history for specific entity type
 */
export function getEntitySearchHistory(entityType: string): SearchHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(createSearchHistoryKey(entityType));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load search history:', error);
    return [];
  }
}

/**
 * Save search to entity-specific history
 */
export function saveEntitySearchToHistory(
  entityType: string,
  query: string,
  mode: SearchMode | string
): void {
  if (typeof window === 'undefined' || !query.trim()) return;

  try {
    const history = getEntitySearchHistory(entityType);
    const filtered = history.filter(h => h.query !== query);
    const updated: SearchHistoryEntry[] = [
      { query, mode, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(createSearchHistoryKey(entityType), JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save search history:', error);
  }
}

/**
 * Clear entity-specific search history
 */
export function clearEntitySearchHistory(entityType: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(createSearchHistoryKey(entityType));
  } catch (error) {
    console.warn('Failed to clear search history:', error);
  }
}
