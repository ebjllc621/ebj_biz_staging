/**
 * useListingSubscription - Manage Listing Subscription and Add-ons
 *
 * @description Subscription tier management and add-on operations
 * @component Hook
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Provides:
 * - Current subscription details
 * - Available plans and add-ons
 * - Upgrade/downgrade tier
 * - Add/remove add-ons
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type {
  SubscriptionPlan,
  AddonSuite,
  ListingSubscription,
  ListingSubscriptionAddon
} from '@core/types/subscription';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionData {
  subscription: ListingSubscription | null;
  availablePlans: SubscriptionPlan[];
  availableAddons: AddonSuite[];
  activeAddons: ListingSubscriptionAddon[];
}

export interface UseListingSubscriptionResult {
  /** Subscription data */
  data: SubscriptionData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh subscription data */
  refreshSubscription: () => Promise<void>;
  /** Upgrade to new plan */
  upgradePlan: (newPlanId: number) => Promise<ListingSubscription>;
  /** Add add-on to subscription */
  addAddon: (addonId: number) => Promise<ListingSubscriptionAddon>;
  /** Remove add-on from subscription */
  removeAddon: (addonId: number) => Promise<void>;
  /** Action in progress */
  actionLoading: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useListingSubscription - Manage listing subscription and add-ons
 *
 * @param listingId - The listing ID to manage subscription for
 * @returns Subscription data and management functions
 *
 * @example
 * ```tsx
 * const { data, upgradePlan, addAddon } = useListingSubscription(listingId);
 *
 * // Upgrade to premium plan
 * await upgradePlan(premiumPlanId);
 *
 * // Add creator suite
 * await addAddon(creatorSuiteId);
 * ```
 */
export function useListingSubscription(
  listingId: number | null
): UseListingSubscriptionResult {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!listingId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/subscription`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.status}`);
      }

      const result = await response.json();
      const subscriptionData = result.data;

      if (!subscriptionData) {
        throw new Error('Subscription data not found');
      }

      setData(subscriptionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  // Fetch on mount and when listingId changes
  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  const upgradePlan = useCallback(async (newPlanId: number): Promise<ListingSubscription> => {
    if (!listingId) {
      throw new Error('Listing ID is required');
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/subscription/upgrade`,
        {
          method: 'POST',
          body: JSON.stringify({ newPlanId })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upgrade plan');
      }

      const result = await response.json();
      const updatedSubscription = result.data;

      // Optimistic update
      if (data) {
        setData({
          ...data,
          subscription: updatedSubscription
        });
      }

      return updatedSubscription;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade plan');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [listingId, data]);

  const addAddon = useCallback(async (addonId: number): Promise<ListingSubscriptionAddon> => {
    if (!listingId) {
      throw new Error('Listing ID is required');
    }

    if (!data?.subscription) {
      throw new Error('No active subscription found');
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/subscription/addons`,
        {
          method: 'POST',
          body: JSON.stringify({ addonId })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add add-on');
      }

      const result = await response.json();
      const newAddon = result.data;

      // Optimistic update
      if (data) {
        setData({
          ...data,
          activeAddons: [...data.activeAddons, newAddon]
        });
      }

      return newAddon;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add add-on');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [listingId, data]);

  const removeAddon = useCallback(async (addonId: number): Promise<void> => {
    if (!listingId) {
      throw new Error('Listing ID is required');
    }

    if (!data?.subscription) {
      throw new Error('No active subscription found');
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/subscription/addons/${addonId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove add-on');
      }

      // Optimistic update
      if (data) {
        setData({
          ...data,
          activeAddons: data.activeAddons.filter((addon) => addon.addon_suite_id !== addonId)
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove add-on');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [listingId, data]);

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  return {
    data,
    isLoading,
    error,
    refreshSubscription,
    upgradePlan,
    addAddon,
    removeAddon,
    actionLoading
  };
}

export default useListingSubscription;
