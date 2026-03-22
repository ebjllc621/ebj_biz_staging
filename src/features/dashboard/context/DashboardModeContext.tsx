/**
 * DashboardModeContext - Dashboard Mode State Context Provider
 *
 * @description Provides global dashboard mode state through React Context
 * @component Client Component (uses hooks, manages state)
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 1 - Dual-Section Sidebar Foundation
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_1_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use createContext + Provider pattern
 * - MUST throw error if used outside Provider
 * - MUST provide stable context value (prevent re-renders)
 * - Accordion behavior: expanding one section collapses the other
 *
 * USAGE:
 * 1. Wrap dashboard with <DashboardModeProvider> in DashboardLayout
 * 2. Use useDashboardMode() hook in any child component
 * 3. Mode state automatically syncs across all components
 */
'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DashboardMode = 'personal' | 'listing-manager';
export type DashboardSection = 'personal' | 'listing-manager';

/**
 * DashboardModeContextValue - Context value shape
 *
 * Holds dashboard mode state and methods accessible throughout component tree.
 */
export interface DashboardModeContextValue {
  /** Current active mode */
  mode: DashboardMode;
  /** Whether Personal section is expanded */
  personalExpanded: boolean;
  /** Whether Listing Manager section is expanded */
  listingManagerExpanded: boolean;
  /** Set the active mode */
  setMode: (mode: DashboardMode) => void;
  /** Toggle Personal section */
  togglePersonalSection: () => void;
  /** Toggle Listing Manager section */
  toggleListingManagerSection: () => void;
  /** Expand a specific section (and collapse the other) */
  expandSection: (section: DashboardSection) => void;
  /** Active theme class name for CSS variable switching */
  themeClass: '' | 'theme-listing-manager';
  /** Whether currently in listing manager mode */
  isListingManagerMode: boolean;
}

export interface DashboardModeProviderProps {
  /** Component tree to provide context to */
  children: ReactNode;
  /** Initial mode (defaults to 'personal') */
  initialMode?: DashboardMode;
}

// ============================================================================
// CONTEXT
// ============================================================================

/**
 * DashboardModeContext - React Context for dashboard mode state
 *
 * Initialized with undefined to force usage within Provider.
 */
const DashboardModeContext = createContext<DashboardModeContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * DashboardModeProvider - Context Provider Component
 *
 * Creates single source of truth for dashboard mode state.
 * MUST wrap dashboard component tree at layout level.
 *
 * @param children - Component tree to provide context to
 * @param initialMode - Initial mode ('personal' or 'listing-manager')
 * @returns Provider wrapping children with dashboard mode state
 *
 * @example
 * ```tsx
 * <DashboardModeProvider initialMode="personal">
 *   <DashboardSidebar />
 *   <DashboardContent />
 * </DashboardModeProvider>
 * ```
 */
export function DashboardModeProvider({
  children,
  initialMode = 'personal'
}: DashboardModeProviderProps) {
  // ============================================================================
  // STATE
  // ============================================================================

  const [mode, setModeState] = useState<DashboardMode>(initialMode);
  // Initialize expanded states based on initial mode
  // If listing-manager mode: Listing Manager expanded, Personal collapsed
  // If personal mode: Personal expanded, Listing Manager collapsed
  const [personalExpanded, setPersonalExpanded] = useState(initialMode !== 'listing-manager');
  const [listingManagerExpanded, setListingManagerExpanded] = useState(initialMode === 'listing-manager');

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * setMode - Set the active mode
   */
  const setMode = useCallback((newMode: DashboardMode) => {
    setModeState(newMode);
  }, []);

  /**
   * togglePersonalSection - Toggle Personal section
   * Accordion behavior: one section must always be expanded
   * - Expanding Personal collapses Listing Manager
   * - Collapsing Personal expands Listing Manager
   */
  const togglePersonalSection = useCallback(() => {
    setPersonalExpanded(prev => {
      const newExpanded = !prev;
      if (newExpanded) {
        // Expanding Personal: collapse Listing Manager
        setListingManagerExpanded(false);
      } else {
        // Collapsing Personal: expand Listing Manager (prevent both closed)
        setListingManagerExpanded(true);
      }
      return newExpanded;
    });
  }, []);

  /**
   * toggleListingManagerSection - Toggle Listing Manager section
   * Accordion behavior: one section must always be expanded
   * - Expanding Listing Manager collapses Personal
   * - Collapsing Listing Manager expands Personal
   */
  const toggleListingManagerSection = useCallback(() => {
    setListingManagerExpanded(prev => {
      const newExpanded = !prev;
      if (newExpanded) {
        // Expanding Listing Manager: collapse Personal
        setPersonalExpanded(false);
      } else {
        // Collapsing Listing Manager: expand Personal (prevent both closed)
        setPersonalExpanded(true);
      }
      return newExpanded;
    });
  }, []);

  /**
   * expandSection - Expand a specific section (and collapse the other)
   */
  const expandSection = useCallback((section: DashboardSection) => {
    if (section === 'personal') {
      setPersonalExpanded(true);
      setListingManagerExpanded(false);
    } else {
      setListingManagerExpanded(true);
      setPersonalExpanded(false);
    }
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<DashboardModeContextValue>(() => ({
    mode,
    personalExpanded,
    listingManagerExpanded,
    setMode,
    togglePersonalSection,
    toggleListingManagerSection,
    expandSection,
    // Theme-related computed properties
    themeClass: mode === 'listing-manager' ? 'theme-listing-manager' : '',
    isListingManagerMode: mode === 'listing-manager'
  }), [
    mode,
    personalExpanded,
    listingManagerExpanded,
    setMode,
    togglePersonalSection,
    toggleListingManagerSection,
    expandSection
  ]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DashboardModeContext.Provider value={contextValue}>
      {children}
    </DashboardModeContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useDashboardMode - Access Dashboard Mode Context
 *
 * Hook to access dashboard mode state and methods from any component.
 * MUST be used within DashboardModeProvider or will throw error.
 *
 * @returns Dashboard mode state and methods
 * @throws Error if used outside DashboardModeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mode, expandSection } = useDashboardMode();
 *   // ... use mode state
 * }
 * ```
 */
export function useDashboardMode(): DashboardModeContextValue {
  const context = useContext(DashboardModeContext);

  if (context === undefined) {
    throw new Error(
      'useDashboardMode must be used within a DashboardModeProvider. ' +
      'Ensure <DashboardModeProvider> wraps your component tree in DashboardLayout.tsx'
    );
  }

  return context;
}
