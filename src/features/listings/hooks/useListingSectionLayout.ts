import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ListingSectionLayout, mergeWithDefaultListingLayout } from '@features/listings/types/listing-section-layout';

interface UseListingSectionLayoutOptions {
  listingId: number;
  /** Initial layout from server-side data (eliminates layout flash) */
  initialLayout?: ListingSectionLayout | null;
  /** Auto-load from API (default: true, but skipped if initialLayout provided) */
  autoLoad?: boolean;
}

interface UseListingSectionLayoutReturn {
  layout: ListingSectionLayout | null;
  isLoading: boolean;
  error: string | null;
  updateLayout: (layout: ListingSectionLayout) => Promise<void>;
  resetLayout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage listing section layout preferences
 * Fetches, updates, and resets layout configuration
 *
 * @param initialLayout - Initial layout from server (prevents layout flash)
 * @param autoLoad - Whether to fetch from API (skipped if initialLayout provided)
 */
export function useListingSectionLayout({
  listingId,
  initialLayout,
  autoLoad = true
}: UseListingSectionLayoutOptions): UseListingSectionLayoutReturn {
  // Merge initial layout with defaults immediately (no flash)
  const mergedInitialLayout = useMemo(() => {
    return initialLayout ? mergeWithDefaultListingLayout(initialLayout) : null;
  }, [initialLayout]);

  const [layout, setLayout] = useState<ListingSectionLayout | null>(mergedInitialLayout);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch layout from API
   */
  const fetchLayout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/layout`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch layout');
      }

      const data = await response.json();

      // Parse layout if it comes as string (mariadb behavior)
      let parsedLayout = data.data?.layout || data.layout;

      if (typeof parsedLayout === 'string') {
        try {
          parsedLayout = JSON.parse(parsedLayout);
        } catch (parseError) {
          console.error('Failed to parse layout JSON:', parseError);
          parsedLayout = null;
        }
      }

      // Merge with default layout to ensure all features are present
      const mergedLayout = mergeWithDefaultListingLayout(parsedLayout);
      setLayout(mergedLayout);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch layout';
      setError(errorMessage);
      console.error('Error fetching listing layout:', err);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  /**
   * Update layout via API
   */
  const updateLayout = useCallback(async (newLayout: ListingSectionLayout) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ layout: newLayout })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update layout');
      }

      const data = await response.json();

      // Parse layout if it comes as string
      let parsedLayout = data.data?.layout || data.layout;

      if (typeof parsedLayout === 'string') {
        try {
          parsedLayout = JSON.parse(parsedLayout);
        } catch (parseError) {
          console.error('Failed to parse layout JSON:', parseError);
          parsedLayout = newLayout;
        }
      }

      setLayout(parsedLayout);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update layout';
      setError(errorMessage);
      console.error('Error updating listing layout:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  /**
   * Reset layout to default via API
   */
  const resetLayout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reset: true })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to reset layout');
      }

      const data = await response.json();

      // Parse layout if it comes as string
      let parsedLayout = data.data?.layout || data.layout;

      if (typeof parsedLayout === 'string') {
        try {
          parsedLayout = JSON.parse(parsedLayout);
        } catch (parseError) {
          console.error('Failed to parse layout JSON:', parseError);
          parsedLayout = null;
        }
      }

      const mergedLayout = mergeWithDefaultListingLayout(parsedLayout);
      setLayout(mergedLayout);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset layout';
      setError(errorMessage);
      console.error('Error resetting listing layout:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  /**
   * Refresh layout (re-fetch from API)
   */
  const refresh = useCallback(async () => {
    await fetchLayout();
  }, [fetchLayout]);

  // Auto-load on mount if enabled AND no initial layout provided
  // If initialLayout was provided, we already have the data - no need to fetch
  useEffect(() => {
    if (autoLoad && !initialLayout) {
      fetchLayout();
    }
  }, [autoLoad, fetchLayout, initialLayout]);

  return {
    layout,
    isLoading,
    error,
    updateLayout,
    resetLayout,
    refresh
  };
}
