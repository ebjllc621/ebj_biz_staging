/**
 * useCategorySubscription - Hook for category subscription state management
 *
 * @tier STANDARD
 * @phase Listings Phase 3A - Category Subscriptions & Follower Broadcast
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3A_BRAIN_PLAN.md
 * @reference src/features/offers/hooks/useOfferFollow.ts
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// Types
// ============================================================================

type NotificationFrequency = 'realtime' | 'daily' | 'weekly';

interface UseCategorySubscriptionReturn {
  isSubscribed: boolean;
  frequency: NotificationFrequency;
  isLoading: boolean;
  error: string | null;
  toggleSubscription: () => Promise<void>;
  updateFrequency: (freq: NotificationFrequency) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing category subscription state
 *
 * @param categoryId Category ID (or null if no category selected)
 * @returns Subscription state and actions
 */
export function useCategorySubscription(
  categoryId: number | null
): UseCategorySubscriptionReturn {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [frequency, setFrequency] = useState<NotificationFrequency>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (categoryId === null) {
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/subscriptions/categories/${categoryId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.status === 401) {
        // Not authenticated — not subscribed
        setIsSubscribed(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to check subscription status');
      }

      const data = await response.json();
      const subscription = data.data?.subscription ?? null;
      setIsSubscribed(!!subscription);
      if (subscription?.notification_frequency) {
        setFrequency(subscription.notification_frequency as NotificationFrequency);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check subscription status';
      setError(message);
      ErrorService.capture('[useCategorySubscription] checkSubscriptionStatus failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  // Initial load
  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  // Toggle subscribe/unsubscribe
  const toggleSubscription = useCallback(async () => {
    if (categoryId === null) return;

    try {
      setIsLoading(true);
      setError(null);

      if (isSubscribed) {
        // Unsubscribe
        const response = await fetchWithCsrf('/api/subscriptions/categories', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId })
        });

        if (!response.ok) {
          throw new Error('Failed to unsubscribe');
        }

        setIsSubscribed(false);
      } else {
        // Subscribe
        const response = await fetchWithCsrf('/api/subscriptions/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId, frequency })
        });

        if (!response.ok) {
          throw new Error('Failed to subscribe');
        }

        setIsSubscribed(true);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle subscription';
      setError(message);
      ErrorService.capture('[useCategorySubscription] toggleSubscription failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSubscribed, categoryId, frequency]);

  // Update frequency
  const updateFrequency = useCallback(async (newFrequency: NotificationFrequency) => {
    if (categoryId === null) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithCsrf(`/api/subscriptions/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: newFrequency })
      });

      if (!response.ok) {
        throw new Error('Failed to update frequency');
      }

      setFrequency(newFrequency);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update frequency';
      setError(message);
      ErrorService.capture('[useCategorySubscription] updateFrequency failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  return {
    isSubscribed,
    frequency,
    isLoading,
    error,
    toggleSubscription,
    updateFrequency
  };
}

export default useCategorySubscription;
