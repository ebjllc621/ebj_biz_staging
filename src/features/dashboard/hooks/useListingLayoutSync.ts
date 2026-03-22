/**
 * useListingLayoutSync - Cross-Page Layout Synchronization Hook
 *
 * @description Bridges ListingContext with layout API to provide layout state to dashboard components
 * @hook ADVANCED Tier
 * @phase Phase 6 - Dashboard Synchronization
 * @authority docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_6_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use fetchWithCsrf for PUT mutations
 * - MUST use credentials: 'include' for GET requests
 * - MUST implement optimistic updates with rollback on failure
 * - MUST use useMemo for visibilityMap derivation
 * - MUST use useCallback for all handlers
 * - Handles JSON parsing (mariadb returns strings)
 *
 * USAGE:
 * ```tsx
 * const {
 *   visibilityMap,
 *   isFeatureVisible,
 *   isFeatureLocked,
 *   toggleFeatureVisibility
 * } = useListingLayoutSync({
 *   listingId: selectedListingId,
 *   listingTier: selectedListing.tier,
 *   autoLoad: true
 * });
 * ```
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import {
  ListingSectionLayout,
  FeatureId,
  SectionId,
  ListingTier,
  FEATURE_METADATA,
  isFeatureAvailable,
  mergeWithDefaultListingLayout
} from '@features/listings/types/listing-section-layout';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FeatureVisibilityState {
  featureId: FeatureId;
  visible: boolean;
  locked: boolean;
  requiredTier?: ListingTier;
  sectionId: SectionId;
}

export interface UseListingLayoutSyncOptions {
  /** Listing ID to sync */
  listingId: number | null;
  /** Current listing tier */
  listingTier?: ListingTier;
  /** Auto-refresh on mount */
  autoLoad?: boolean;
  /** Refresh interval in ms (0 = disabled) */
  refreshInterval?: number;
}

export interface UseListingLayoutSyncReturn {
  /** Full layout state */
  layout: ListingSectionLayout | null;
  /** Map of feature visibility by feature ID */
  visibilityMap: Map<FeatureId, FeatureVisibilityState>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Check if a feature is visible */
  // eslint-disable-next-line no-unused-vars
  isFeatureVisible: (targetFeatureId: FeatureId) => boolean;
  /** Check if a feature is locked */
  // eslint-disable-next-line no-unused-vars
  isFeatureLocked: (targetFeatureId: FeatureId) => boolean;
  /** Toggle feature visibility */
  // eslint-disable-next-line no-unused-vars
  toggleFeatureVisibility: (targetFeatureId: FeatureId) => Promise<void>;
  /** Refresh layout from API */
  refreshLayout: () => Promise<void>;
  /** Last sync timestamp */
  lastSyncAt: Date | null;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useListingLayoutSync - Cross-page layout synchronization hook
 *
 * Provides layout state and visibility controls for dashboard components.
 * Automatically syncs with listing details page layout changes.
 *
 * @param options - Hook options
 * @returns Layout state and control methods
 *
 * @example
 * ```tsx
 * const { isFeatureVisible, toggleFeatureVisibility } = useListingLayoutSync({
 *   listingId: 123,
 *   listingTier: 'professional',
 *   autoLoad: true
 * });
 * ```
 */
export function useListingLayoutSync({
  listingId,
  listingTier = 'essentials',
  autoLoad = true,
  refreshInterval = 0
}: UseListingLayoutSyncOptions): UseListingLayoutSyncReturn {
  const [layout, setLayout] = useState<ListingSectionLayout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  /**
   * Fetch layout from API
   */
  const fetchLayout = useCallback(async () => {
    if (!listingId) {
      setLayout(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/layout`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch layout');
      }

      const data = await response.json();
      let parsedLayout = data.data?.layout || data.layout;

      // Handle mariadb JSON string behavior
      if (typeof parsedLayout === 'string') {
        parsedLayout = JSON.parse(parsedLayout);
      }

      const mergedLayout = mergeWithDefaultListingLayout(parsedLayout);
      setLayout(mergedLayout);
      setLastSyncAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync layout');
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  /**
   * Build visibility map from layout
   */
  const visibilityMap = useMemo(() => {
    const map = new Map<FeatureId, FeatureVisibilityState>();

    if (!layout) return map;

    for (const section of layout.sections) {
      for (const feature of section.features) {
        const metadata = FEATURE_METADATA[feature.id];
        const locked = !isFeatureAvailable(feature.id, listingTier);

        map.set(feature.id, {
          featureId: feature.id,
          visible: feature.visible && !locked,
          locked,
          requiredTier: metadata?.minTier,
          sectionId: section.id
        });
      }
    }

    return map;
  }, [layout, listingTier]);

  /**
   * Check if a feature is visible
   */
  const isFeatureVisible = useCallback((targetFeatureId: FeatureId): boolean => {
    const state = visibilityMap.get(targetFeatureId);
    return state?.visible ?? false;
  }, [visibilityMap]);

  /**
   * Check if a feature is locked
   */
  const isFeatureLocked = useCallback((targetFeatureId: FeatureId): boolean => {
    const state = visibilityMap.get(targetFeatureId);
    return state?.locked ?? false;
  }, [visibilityMap]);

  /**
   * Toggle feature visibility (optimistic update)
   */
  const toggleFeatureVisibility = useCallback(async (targetFeatureId: FeatureId) => {
    if (!layout || !listingId) return;

    // Find and toggle feature
    const newSections = layout.sections.map(section => ({
      ...section,
      features: section.features.map(feature =>
        feature.id === targetFeatureId
          ? { ...feature, visible: !feature.visible }
          : feature
      )
    }));

    const newLayout: ListingSectionLayout = {
      ...layout,
      sections: newSections,
      updatedAt: new Date().toISOString()
    };

    // Optimistic update
    const previousLayout = layout;
    setLayout(newLayout);

    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: newLayout })
      });

      if (!response.ok) {
        throw new Error('Failed to update layout');
      }

      setLastSyncAt(new Date());
    } catch (err) {
      // Rollback on failure
      setLayout(previousLayout);
      setError(err instanceof Error ? err.message : 'Failed to toggle feature');
      throw err;
    }
  }, [layout, listingId]);

  /**
   * Refresh layout (alias for fetchLayout)
   */
  const refreshLayout = useCallback(async () => {
    await fetchLayout();
  }, [fetchLayout]);

  // Auto-load on mount and listing change
  useEffect(() => {
    if (autoLoad && listingId) {
      void fetchLayout();
    }
  }, [autoLoad, listingId, fetchLayout]);

  // Optional polling for real-time sync
  useEffect(() => {
    if (refreshInterval <= 0 || !listingId) return;

    const interval = setInterval(() => {
      void fetchLayout();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, listingId, fetchLayout]);

  return {
    layout,
    visibilityMap,
    isLoading,
    error,
    isFeatureVisible,
    isFeatureLocked,
    toggleFeatureVisibility,
    refreshLayout,
    lastSyncAt
  };
}

export default useListingLayoutSync;
