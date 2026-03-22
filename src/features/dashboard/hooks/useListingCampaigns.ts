/**
 * useListingCampaigns - Manage Listing Marketing Campaigns
 *
 * @description CRUD operations for listing campaigns with optimistic updates
 * @component Hook
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Provides:
 * - Fetch campaigns for listing
 * - Create new campaign
 * - Update campaign
 * - Delete campaign
 * - Submit campaign for approval
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { Campaign, CampaignType } from '@core/services/CampaignService';

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignFormData {
  title: string;
  description: string;
  campaign_type: CampaignType;
  budget: number;
  daily_budget?: number;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  target_audience?: {
    categories?: number[];
    locations?: string[];
    tiers?: string[];
    engagement?: 'high' | 'medium' | 'low';
  };
  creatives?: {
    images?: string[];
    text?: string;
    cta?: string;
  };
}

export interface UseListingCampaignsResult {
  /** List of campaigns */
  campaigns: Campaign[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh campaigns */
  refreshCampaigns: () => Promise<void>;
  /** Create new campaign */
  createCampaign: (data: CampaignFormData) => Promise<Campaign>;
  /** Update existing campaign */
  updateCampaign: (campaignId: number, data: Partial<CampaignFormData>) => Promise<Campaign>;
  /** Delete campaign */
  deleteCampaign: (campaignId: number) => Promise<void>;
  /** Submit campaign for approval */
  submitForApproval: (campaignId: number) => Promise<Campaign>;
  /** Action in progress (create, update, delete, submit) */
  actionLoading: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useListingCampaigns - Manage listing campaigns
 *
 * @param listingId - The listing ID to manage campaigns for
 * @returns Campaigns data and management functions
 *
 * @example
 * ```tsx
 * const { campaigns, createCampaign, submitForApproval } = useListingCampaigns(listingId);
 *
 * // Create campaign
 * await createCampaign({
 *   title: 'Spring Sale',
 *   campaign_type: 'featured_offer',
 *   budget: 500,
 *   start_date: '2026-03-01',
 *   end_date: '2026-03-31'
 * });
 *
 * // Submit for approval
 * await submitForApproval(campaignId);
 * ```
 */
export function useListingCampaigns(listingId: number | null): UseListingCampaignsResult {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!listingId) {
      setCampaigns([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/campaigns`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.status}`);
      }

      const result = await response.json();
      const campaignsData = result.data || [];

      setCampaigns(campaignsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  // Fetch on mount and when listingId changes
  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = useCallback(async (data: CampaignFormData): Promise<Campaign> => {
    if (!listingId) {
      throw new Error('Listing ID is required');
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/campaigns`, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }

      const result = await response.json();
      const newCampaign = result.data;

      // Optimistic update
      setCampaigns((prev) => [...prev, newCampaign]);

      return newCampaign;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [listingId]);

  const updateCampaign = useCallback(async (
    campaignId: number,
    data: Partial<CampaignFormData>
  ): Promise<Campaign> => {
    if (!listingId) {
      throw new Error('Listing ID is required');
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/campaigns/${campaignId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update campaign');
      }

      const result = await response.json();
      const updatedCampaign = result.data;

      // Optimistic update
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? updatedCampaign : c))
      );

      return updatedCampaign;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [listingId]);

  const deleteCampaign = useCallback(async (campaignId: number): Promise<void> => {
    if (!listingId) {
      throw new Error('Listing ID is required');
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/campaigns/${campaignId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete campaign');
      }

      // Optimistic update
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [listingId]);

  const submitForApproval = useCallback(async (campaignId: number): Promise<Campaign> => {
    if (!listingId) {
      throw new Error('Listing ID is required');
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/campaigns/${campaignId}/submit`,
        {
          method: 'POST'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit campaign');
      }

      const result = await response.json();
      const submittedCampaign = result.data;

      // Optimistic update
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? submittedCampaign : c))
      );

      return submittedCampaign;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit campaign');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [listingId]);

  const refreshCampaigns = useCallback(async () => {
    await fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    refreshCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    submitForApproval,
    actionLoading
  };
}

export default useListingCampaigns;
