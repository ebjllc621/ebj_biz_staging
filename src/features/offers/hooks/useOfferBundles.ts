/**
 * useOfferBundles - Hook for listing bundles management
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { OfferBundle, BundleType } from '@features/offers/types';

interface UseOfferBundlesOptions {
  listingId?: number;
  autoLoad?: boolean;
}

interface CreateBundleData {
  name: string;
  description?: string;
  bundle_type: BundleType;
  offer_ids: number[];
  expires_at?: string;
}

interface UseOfferBundlesReturn {
  bundles: OfferBundle[];
  loading: boolean;
  error: string | null;
  fetchBundles: () => Promise<void>;
  createBundle: (data: CreateBundleData) => Promise<OfferBundle | null>;
  updateBundle: (id: number, data: Partial<CreateBundleData>) => Promise<boolean>;
  deleteBundle: (id: number) => Promise<boolean>;
}

export function useOfferBundles({
  listingId,
  autoLoad = true,
}: UseOfferBundlesOptions = {}): UseOfferBundlesReturn {
  const [bundles, setBundles] = useState<OfferBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = listingId
        ? `/api/listings/${listingId}/bundles`
        : '/api/bundles';

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bundles');
      }

      const data = await response.json();
      setBundles(data.bundles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  const createBundle = useCallback(async (
    data: CreateBundleData
  ): Promise<OfferBundle | null> => {
    if (!listingId) {
      setError('Listing ID required to create bundle');
      return null;
    }

    try {
      const response = await fetch(`/api/listings/${listingId}/bundles`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create bundle');
      }

      const result = await response.json();
      await fetchBundles();
      return result.bundle;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [listingId, fetchBundles]);

  const updateBundle = useCallback(async (
    id: number,
    data: Partial<CreateBundleData>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/bundles/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update bundle');
      }

      await fetchBundles();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchBundles]);

  const deleteBundle = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/bundles/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete bundle');
      }

      await fetchBundles();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchBundles]);

  useEffect(() => {
    if (autoLoad) {
      fetchBundles();
    }
  }, [autoLoad, fetchBundles]);

  return {
    bundles,
    loading,
    error,
    fetchBundles,
    createBundle,
    updateBundle,
    deleteBundle,
  };
}
