/**
 * useEventCampaignData - Fetch campaign content for events page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @authority Build Map v2.1 ENHANCED
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OfferCardData, ListingCardData } from '@/features/homepage/types';

interface CampaignDataState {
  offers: OfferCardData[];
  featuredListings: ListingCardData[];
  isLoading: boolean;
  error: string | null;
}

export function useEventCampaignData() {
  const [state, setState] = useState<CampaignDataState>({
    offers: [],
    featuredListings: [],
    isLoading: true,
    error: null
  });

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/homepage/public', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load campaign data');
      }

      const result = await response.json();

      setState({
        offers: result.data?.active_offers ?? [],
        featuredListings: result.data?.featured_listings ?? [],
        isLoading: false,
        error: null
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'An error occurred'
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData
  };
}
