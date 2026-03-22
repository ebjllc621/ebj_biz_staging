/**
 * useColumnVisibility - Manages column visibility state with localStorage persistence
 *
 * @tier STANDARD
 * @phase Column Visibility Enhancement
 * @generated DNA v11.4.0
 *
 * GOVERNANCE:
 * - SSR-safe localStorage (window check)
 * - Error handling with graceful degradation
 * - Typed column visibility state
 * - Pattern from src/core/utils/searchHistory.ts
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Column visibility state - maps column keys to visibility
 */
export interface ColumnVisibilityState {
  [columnKey: string]: boolean; // true = visible, false = hidden
}

/**
 * Options for useColumnVisibility hook
 */
export interface UseColumnVisibilityOptions {
  /** Unique table identifier for localStorage key */
  tableId: string;
  /** All available column keys */
  allColumnKeys: string[];
  /** Column keys hidden by default */
  defaultHidden?: string[];
}

/**
 * Return type for useColumnVisibility hook
 */
export interface UseColumnVisibilityReturn {
  /** Current visibility state */
  visibility: ColumnVisibilityState;
  /** Array of currently hidden column keys */
  hiddenColumns: string[];
  /** Array of currently visible column keys */
  visibleColumns: string[];
  /** Hide a specific column */
  hideColumn: (_key: string) => void;
  /** Show a specific column */
  showColumn: (_key: string) => void;
  /** Toggle column visibility */
  toggleColumn: (_key: string) => void;
  /** Reset to default visibility */
  resetToDefaults: () => void;
  /** Check if any columns are hidden */
  hasHiddenColumns: boolean;
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Create localStorage key for table column visibility
 */
function createStorageKey(tableId: string): string {
  return `admin_table_columns_${tableId}`;
}

/**
 * Get visibility state from localStorage (SSR-safe)
 */
function getStoredVisibility(tableId: string): ColumnVisibilityState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(createStorageKey(tableId));
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load column visibility:', error);
    return null;
  }
}

/**
 * Save visibility state to localStorage (SSR-safe)
 */
function saveVisibility(tableId: string, visibility: ColumnVisibilityState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(createStorageKey(tableId), JSON.stringify(visibility));
  } catch (error) {
    console.warn('Failed to save column visibility:', error);
    // Graceful degradation - continue without saving
  }
}

/**
 * Clear visibility state from localStorage (SSR-safe)
 */
function clearStoredVisibility(tableId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(createStorageKey(tableId));
  } catch (error) {
    console.warn('Failed to clear column visibility:', error);
  }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Build initial visibility state from defaults
 */
function buildInitialState(
  allColumnKeys: string[],
  defaultHidden: string[] = []
): ColumnVisibilityState {
  const state: ColumnVisibilityState = {};

  for (const key of allColumnKeys) {
    state[key] = !defaultHidden.includes(key);
  }

  return state;
}

/**
 * useColumnVisibility - Hook for managing column visibility with persistence
 *
 * @example
 * const {
 *   visibility,
 *   hiddenColumns,
 *   hideColumn,
 *   showColumn,
 *   resetToDefaults,
 *   hasHiddenColumns
 * } = useColumnVisibility({
 *   tableId: 'admin-listings',
 *   allColumnKeys: ['id', 'name', 'status', 'created_at'],
 *   defaultHidden: ['created_at']
 * });
 */
export function useColumnVisibility({
  tableId,
  allColumnKeys,
  defaultHidden = []
}: UseColumnVisibilityOptions): UseColumnVisibilityReturn {
  // Build default state
  const defaultState = useMemo(
    () => buildInitialState(allColumnKeys, defaultHidden),
    [allColumnKeys, defaultHidden]
  );

  // Initialize state - will be hydrated from localStorage in useEffect
  const [visibility, setVisibility] = useState<ColumnVisibilityState>(defaultState);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (SSR-safe)
  useEffect(() => {
    const stored = getStoredVisibility(tableId);

    if (stored) {
      // Merge stored state with current columns (handles new columns)
      const merged: ColumnVisibilityState = { ...defaultState };

      for (const key of allColumnKeys) {
        if (key in stored && typeof stored[key] === 'boolean') {
          merged[key] = stored[key];
        }
      }

      setVisibility(merged);
    }

    setIsHydrated(true);
  }, [tableId, allColumnKeys, defaultState]);

  // Persist to localStorage whenever visibility changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveVisibility(tableId, visibility);
    }
  }, [tableId, visibility, isHydrated]);

  // Hide a column
  const hideColumn = useCallback((key: string) => {
    setVisibility(prev => ({
      ...prev,
      [key]: false
    }));
  }, []);

  // Show a column
  const showColumn = useCallback((key: string) => {
    setVisibility(prev => ({
      ...prev,
      [key]: true
    }));
  }, []);

  // Toggle column visibility
  const toggleColumn = useCallback((key: string) => {
    setVisibility(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setVisibility(defaultState);
    clearStoredVisibility(tableId);
  }, [defaultState, tableId]);

  // Compute derived values
  const hiddenColumns = useMemo(
    () => allColumnKeys.filter(key => visibility[key] === false),
    [allColumnKeys, visibility]
  );

  const visibleColumns = useMemo(
    () => allColumnKeys.filter(key => visibility[key] !== false),
    [allColumnKeys, visibility]
  );

  const hasHiddenColumns = hiddenColumns.length > 0;

  return {
    visibility,
    hiddenColumns,
    visibleColumns,
    hideColumn,
    showColumn,
    toggleColumn,
    resetToDefaults,
    hasHiddenColumns
  };
}

// ============================================================================
// STANDALONE UTILITIES (for use outside React)
// ============================================================================

/**
 * Get stored column visibility for a table (non-hook utility)
 */
export function getColumnVisibility(tableId: string): ColumnVisibilityState | null {
  return getStoredVisibility(tableId);
}

/**
 * Clear stored column visibility for a table (non-hook utility)
 */
export function clearColumnVisibility(tableId: string): void {
  clearStoredVisibility(tableId);
}
