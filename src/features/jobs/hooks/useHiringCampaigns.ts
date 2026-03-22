/**
 * useHiringCampaigns Hook
 *
 * Hook for managing hiring campaign data and operations
 *
 * GOVERNANCE COMPLIANCE:
 * - Hook pattern with useState, useEffect, useCallback
 * - fetchWithCsrf for mutations
 * - Import aliases: @core/, @features/
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/core/services/HiringCampaignService.ts - Campaign service pattern
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { HiringCampaign, CreateHiringCampaignInput, UpdateHiringCampaignInput } from '@features/jobs/types';

interface UseHiringCampaignsResult {
  campaigns: HiringCampaign[];
  loading: boolean;
  error: string | null;
  createCampaign: (data: CreateHiringCampaignInput) => Promise<HiringCampaign | null>;
  updateCampaign: (campaignId: number, data: UpdateHiringCampaignInput) => Promise<HiringCampaign | null>;
  deleteCampaign: (campaignId: number) => Promise<boolean>;
  pauseCampaign: (campaignId: number) => Promise<boolean>;
  refreshCampaigns: () => Promise<void>;
}

/**
 * Hook for managing hiring campaigns
 * @param listingId - Listing ID to fetch campaigns for
 */
export function useHiringCampaigns(listingId: number | null): UseHiringCampaignsResult {
  const [campaigns, setCampaigns] = useState<HiringCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/jobs/campaigns`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load campaigns');
      }

      const result = await response.json();
      setCampaigns(result.data?.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Failed to fetch hiring campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = useCallback(
    async (data: CreateHiringCampaignInput): Promise<HiringCampaign | null> => {
      if (!listingId) {
        throw new Error('Listing ID is required to create campaign');
      }

      try {
        const response = await fetchWithCsrf(`/api/listings/${listingId}/jobs/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create campaign');
        }

        const result = await response.json();
        const newCampaign = result.data?.campaign || null;

        if (newCampaign) {
          setCampaigns((prev) => [...prev, newCampaign]);
        }

        return newCampaign;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      }
    },
    [listingId]
  );

  const updateCampaign = useCallback(
    async (campaignId: number, data: UpdateHiringCampaignInput): Promise<HiringCampaign | null> => {
      if (!listingId) {
        throw new Error('Listing ID is required to update campaign');
      }

      try {
        const response = await fetchWithCsrf(`/api/listings/${listingId}/jobs/campaigns/${campaignId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update campaign');
        }

        const result = await response.json();
        const updatedCampaign = result.data?.campaign || null;

        if (updatedCampaign) {
          setCampaigns((prev) =>
            prev.map((c) => (c.id === campaignId ? updatedCampaign : c))
          );
        }

        return updatedCampaign;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      }
    },
    [listingId]
  );

  const deleteCampaign = useCallback(
    async (campaignId: number): Promise<boolean> => {
      if (!listingId) {
        throw new Error('Listing ID is required to delete campaign');
      }

      try {
        const response = await fetchWithCsrf(`/api/listings/${listingId}/jobs/campaigns/${campaignId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete campaign');
        }

        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      }
    },
    [listingId]
  );

  const pauseCampaign = useCallback(
    async (campaignId: number): Promise<boolean> => {
      return updateCampaign(campaignId, { status: 'paused' }).then((result) => !!result);
    },
    [updateCampaign]
  );

  const refreshCampaigns = useCallback(async () => {
    await fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    pauseCampaign,
    refreshCampaigns
  };
}
