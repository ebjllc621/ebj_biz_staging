/**
 * useOfferDetail - Hook for fetching and managing offer detail data
 *
 * @tier STANDARD
 * @phase Offers Phase 1 - Core CRUD & Display
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_1_CORE_CRUD_BRAIN_PLAN.md
 */

import { useState, useEffect, useCallback } from 'react';
import type { OfferWithListing } from '@features/offers/types';

interface UseOfferDetailOptions {
  /** Offer slug or ID */
  identifier: string | number;
  /** Initial offer data (for SSR hydration) */
  initialOffer?: OfferWithListing | null;
  /** Whether to fetch on mount (default: true if no initialOffer) */
  fetchOnMount?: boolean;
}

interface UseOfferDetailReturn {
  /** Offer data */
  offer: OfferWithListing | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refetch offer data */
  refetch: () => Promise<void>;
  /** Whether the offer is active (not expired, not sold out) */
  isActive: boolean;
  /** Whether the offer is expired */
  isExpired: boolean;
  /** Whether the offer is sold out */
  isSoldOut: boolean;
  /** Formatted savings display string */
  savingsDisplay: string;
}

/**
 * Hook for fetching and managing offer detail data
 *
 * @example
 * ```tsx
 * const { offer, isLoading, isActive, savingsDisplay } = useOfferDetail({
 *   identifier: slug,
 *   initialOffer: serverOffer
 * });
 * ```
 */
export function useOfferDetail({
  identifier,
  initialOffer = null,
  fetchOnMount = !initialOffer
}: UseOfferDetailOptions): UseOfferDetailReturn {
  const [offer, setOffer] = useState<OfferWithListing | null>(initialOffer);
  const [isLoading, setIsLoading] = useState(!initialOffer && fetchOnMount);
  const [error, setError] = useState<string | null>(null);

  const fetchOffer = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Determine endpoint based on identifier type
      const endpoint = typeof identifier === 'number'
        ? `/api/offers/${identifier}`
        : `/api/offers/by-slug/${identifier}`;

      const response = await fetch(endpoint, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Offer not found');
        }
        throw new Error('Failed to fetch offer');
      }

      const data = await response.json();
      const offerData = data.data?.offer || data.data;
      setOffer(offerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offer');
    } finally {
      setIsLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchOffer();
    }
  }, [fetchOnMount, fetchOffer]);

  // Computed properties
  const isExpired = offer ? new Date() > new Date(offer.end_date) : false;
  const isSoldOut = offer ? (offer.quantity_remaining !== null && offer.quantity_remaining <= 0) : false;
  const isActive = offer ? (offer.status === 'active' && !isExpired && !isSoldOut) : false;

  const savingsDisplay = (() => {
    if (!offer) return '';

    if (offer.discount_percentage) {
      return `${offer.discount_percentage}% OFF`;
    }

    if (offer.original_price && offer.sale_price) {
      return `Save $${(Number(offer.original_price) - Number(offer.sale_price)).toFixed(2)}`;
    }

    return 'Special Offer';
  })();

  return {
    offer,
    isLoading,
    error,
    refetch: fetchOffer,
    isActive,
    isExpired,
    isSoldOut,
    savingsDisplay
  };
}

export default useOfferDetail;
