/**
 * useOfferBundle - Hook for bundle detail and claiming
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { OfferBundle, Offer } from '@features/offers/types';

interface UseOfferBundleOptions {
  slug: string;
  autoLoad?: boolean;
}

interface UseOfferBundleReturn {
  bundle: OfferBundle | null;
  offers: Offer[];
  loading: boolean;
  error: string | null;
  claiming: boolean;
  claimed: boolean;
  claimedOfferIds: number[];
  fetchBundle: () => Promise<void>;
  claimBundle: () => Promise<number[]>;
}

export function useOfferBundle({
  slug,
  autoLoad = true,
}: UseOfferBundleOptions): UseOfferBundleReturn {
  const [bundle, setBundle] = useState<OfferBundle | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimedOfferIds, setClaimedOfferIds] = useState<number[]>([]);

  const fetchBundle = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bundles/${slug}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Bundle not found');
        }
        throw new Error('Failed to fetch bundle');
      }

      const data = await response.json();
      setBundle(data.bundle);
      setOffers(data.offers || []);
      setClaimedOfferIds(data.claimedOfferIds || []);
      setClaimed(data.userHasClaimed || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const claimBundle = useCallback(async (): Promise<number[]> => {
    setClaiming(true);
    setError(null);

    try {
      const response = await fetch(`/api/bundles/${slug}/claim`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to claim bundle');
      }

      const data = await response.json();
      setClaimed(true);
      setClaimedOfferIds(data.claimIds || []);
      return data.claimIds || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return [];
    } finally {
      setClaiming(false);
    }
  }, [slug]);

  useEffect(() => {
    if (autoLoad && slug) {
      fetchBundle();
    }
  }, [autoLoad, slug, fetchBundle]);

  return {
    bundle,
    offers,
    loading,
    error,
    claiming,
    claimed,
    claimedOfferIds,
    fetchBundle,
    claimBundle,
  };
}
