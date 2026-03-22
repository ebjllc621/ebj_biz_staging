/**
 * ListingContext - Listing Selection State Context Provider
 *
 * @description Provides listing selection state through React Context with data fetching
 * @component Client Component (uses hooks, manages state, fetches data)
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 5 - Listing Selector & Context
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_5_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use createContext + Provider pattern
 * - MUST throw error if used outside Provider
 * - MUST provide stable context value (prevent re-renders)
 * - localStorage persistence for selected listing (SSR-safe)
 * - credentials: 'include' for authenticated requests
 * - useCallback for handlers, useMemo for computed values
 *
 * USAGE:
 * 1. Wrap dashboard with <ListingContextProvider> in listings/layout.tsx
 * 2. Use useListingContext() hook in components requiring listing (throws if outside provider)
 * 3. Use useListingContextOptional() hook in components gracefully handling no listing
 * 4. Selection state automatically syncs across all components
 */
'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserListingResponse {
  id: number;
  name: string;
  slug: string;
  tier: string;
  status: string;
  approved: string;
  logo_url: string | null;
  last_update: string;
  completeness_percent: number;
  claimed: boolean;
}

/**
 * ListingContextValue - Context value shape
 *
 * Holds listing selection state, loaded listings, and methods accessible throughout component tree.
 */
export interface ListingContextValue {
  /** All user listings */
  userListings: UserListingResponse[];
  /** Currently selected listing (null if none selected or loading) */
  selectedListing: UserListingResponse | null;
  /** Selected listing ID (null if none selected) */
  selectedListingId: number | null;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Error state for fetch failures */
  error: string | null;
  /** Set the selected listing ID */
  // eslint-disable-next-line no-unused-vars
  setSelectedListingId: (id: number | null) => void;
  /** Refresh listings from API */
  refreshListings: () => Promise<void>;
  /** Computed: whether user has any listings */
  hasListings: boolean;
  /** Computed: whether user has multiple listings */
  hasMultipleListings: boolean;
}

export interface ListingContextProviderProps {
  /** Component tree to provide context to */
  children: ReactNode;
}

// ============================================================================
// CONTEXT
// ============================================================================

/**
 * ListingContext - React Context for listing selection state
 *
 * Initialized with undefined to force usage within Provider.
 */
const ListingContext = createContext<ListingContextValue | undefined>(undefined);

// ============================================================================
// LOCALSTORAGE CONSTANTS
// ============================================================================

const STORAGE_KEY = 'bk_selected_listing_id';

/**
 * getStoredListingId - Get stored listing ID from localStorage (SSR-safe)
 */
function getStoredListingId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * setStoredListingId - Store listing ID in localStorage (SSR-safe)
 */
function setStoredListingId(id: number | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, id.toString());
    }
  } catch {
    // Silently fail if localStorage is not available
  }
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * ListingContextProvider - Context Provider Component
 *
 * Creates single source of truth for listing selection state with data fetching.
 * MUST wrap listing-dependent component tree at layout level.
 *
 * @param children - Component tree to provide context to
 * @returns Provider wrapping children with listing selection state
 *
 * @example
 * ```tsx
 * <ListingContextProvider>
 *   <ListingDashboard />
 * </ListingContextProvider>
 * ```
 */
export function ListingContextProvider({
  children
}: ListingContextProviderProps) {
  // ============================================================================
  // STATE
  // ============================================================================

  const [userListings, setUserListings] = useState<UserListingResponse[]>([]);
  const [selectedListingId, setSelectedListingIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FETCH LISTINGS
  // ============================================================================

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/listings/mine', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch listings: ${response.status}`);
      }

      const result = await response.json();
      const listings = result.data?.listings ?? [];

      setUserListings(listings);

      // Auto-select listing based on stored ID or default to first
      const storedId = getStoredListingId();
      if (storedId && listings.some((l: UserListingResponse) => l.id === storedId)) {
        setSelectedListingIdState(storedId);
      } else if (listings.length > 0) {
        const firstId = listings[0]?.id ?? null;
        setSelectedListingIdState(firstId);
        if (firstId !== null) {
          setStoredListingId(firstId);
        }
      } else {
        setSelectedListingIdState(null);
        setStoredListingId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
      setUserListings([]);
      setSelectedListingIdState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial load
  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * setSelectedListingId - Set the selected listing ID
   */
  const setSelectedListingId = useCallback((id: number | null) => {
    setSelectedListingIdState(id);
    setStoredListingId(id);
  }, []);

  /**
   * refreshListings - Refresh listings from API
   */
  const refreshListings = useCallback(async () => {
    await fetchListings();
  }, [fetchListings]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const selectedListing = useMemo(() => {
    if (selectedListingId === null) return null;
    return userListings.find(l => l.id === selectedListingId) ?? null;
  }, [selectedListingId, userListings]);

  const hasListings = useMemo(() => userListings.length > 0, [userListings]);
  const hasMultipleListings = useMemo(() => userListings.length > 1, [userListings]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ListingContextValue>(() => ({
    userListings,
    selectedListing,
    selectedListingId,
    isLoading,
    error,
    setSelectedListingId,
    refreshListings,
    hasListings,
    hasMultipleListings
  }), [
    userListings,
    selectedListing,
    selectedListingId,
    isLoading,
    error,
    setSelectedListingId,
    refreshListings,
    hasListings,
    hasMultipleListings
  ]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ListingContext.Provider value={contextValue}>
      {children}
    </ListingContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * useListingContext - Access Listing Context (REQUIRED)
 *
 * Hook to access listing selection state and methods from any component.
 * MUST be used within ListingContextProvider or will throw error.
 *
 * @returns Listing selection state and methods
 * @throws Error if used outside ListingContextProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { selectedListing, setSelectedListingId } = useListingContext();
 *   // ... use listing state
 * }
 * ```
 */
export function useListingContext(): ListingContextValue {
  const context = useContext(ListingContext);

  if (context === undefined) {
    throw new Error(
      'useListingContext must be used within a ListingContextProvider. ' +
      'Ensure <ListingContextProvider> wraps your component tree in listings/layout.tsx'
    );
  }

  return context;
}

/**
 * useListingContextOptional - Access Listing Context (OPTIONAL)
 *
 * Hook to access listing selection state when provider may not be present.
 * Returns null if used outside ListingContextProvider.
 *
 * @returns Listing selection state and methods, or null if outside provider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const listingContext = useListingContextOptional();
 *   if (!listingContext) {
 *     return <div>No listing context available</div>;
 *   }
 *   // ... use listing state
 * }
 * ```
 */
export function useListingContextOptional(): ListingContextValue | null {
  const context = useContext(ListingContext);
  return context ?? null;
}
