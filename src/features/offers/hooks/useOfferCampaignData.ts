/**
 * useOfferCampaignData - Fetch campaign content for offers page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 7 - Campaign Section
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/phases/PHASE_7_BRAIN_PLAN.md
 *
 * @see src/features/events/hooks/useEventCampaignData.ts - Canonical pattern
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EventCardData, ListingCardData } from '@/features/homepage/types';

interface CampaignDataState {
  events: EventCardData[];
  featuredListings: ListingCardData[];
  isLoading: boolean;
  error: string | null;
}

export function useOfferCampaignData() {
  const [state, setState] = useState<CampaignDataState>({
    events: [],
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData
  };
}
