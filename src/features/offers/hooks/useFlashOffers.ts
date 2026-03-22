/**
 * useFlashOffers - Hook for flash offer management
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Offer, FlashOfferConfig } from '@features/offers/types';

interface UseFlashOffersOptions {
  autoLoad?: boolean;
}

interface UseFlashOffersReturn {
  flashOffers: Offer[];
  loading: boolean;
  error: string | null;
  fetchFlashOffers: () => Promise<void>;
  createFlashOffer: (listingId: number, config: FlashOfferConfig) => Promise<Offer | null>;
  endFlashOffer: (offerId: number) => Promise<boolean>;
  extendFlashOffer: (offerId: number, additionalMinutes: number) => Promise<boolean>;
}

export function useFlashOffers({
  autoLoad = false,
}: UseFlashOffersOptions = {}): UseFlashOffersReturn {
  const [flashOffers, setFlashOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlashOffers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/offers/flash', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch flash offers');
      }

      const data = await response.json();
      setFlashOffers(data.offers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const createFlashOffer = useCallback(async (
    listingId: number,
    config: FlashOfferConfig
  ): Promise<Offer | null> => {
    try {
      const response = await fetch(`/api/listings/${listingId}/offers/flash`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create flash offer');
      }

      const data = await response.json();
      await fetchFlashOffers();
      return data.offer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchFlashOffers]);

  const endFlashOffer = useCallback(async (offerId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_flash: false, flash_expires_at: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to end flash offer');
      }

      await fetchFlashOffers();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchFlashOffers]);

  const extendFlashOffer = useCallback(async (
    offerId: number,
    additionalMinutes: number
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extend_flash_minutes: additionalMinutes }),
      });

      if (!response.ok) {
        throw new Error('Failed to extend flash offer');
      }

      await fetchFlashOffers();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchFlashOffers]);

  useEffect(() => {
    if (autoLoad) {
      fetchFlashOffers();
    }
  }, [autoLoad, fetchFlashOffers]);

  return {
    flashOffers,
    loading,
    error,
    fetchFlashOffers,
    createFlashOffer,
    endFlashOffer,
    extendFlashOffer,
  };
}
