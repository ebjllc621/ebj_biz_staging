/**
 * useCampaignData - Fetch campaign content for listings page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @authority Build Map v2.1 ENHANCED
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OfferCardData, EventCardData, ListingCardData } from '@features/homepage/types';

interface CampaignDataState {
  offers: OfferCardData[];
  events: EventCardData[];
  featuredListings: ListingCardData[];
  isLoading: boolean;
  error: string | null;
}

interface UseCampaignDataOptions {
  /** Category slug to filter offers/events by listing category */
  category?: string;
}

export function useCampaignData(options: UseCampaignDataOptions = {}) {
  const { category } = options;

  const [state, setState] = useState<CampaignDataState>({
    offers: [],
    events: [],
    featuredListings: [],
    isLoading: true,
    error: null
  });

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Build URL with optional category filter
      const params = new URLSearchParams();
      if (category) {
        params.set('category', category);
      }
      const queryString = params.toString();
      const url = `/api/homepage/public${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load campaign data');
      }

      const result = await response.json();

      setState({
        offers: result.data?.active_offers ?? [],
        events: result.data?.upcoming_events ?? [],
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
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData
  };
}
