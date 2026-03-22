/**
 * useGeoFence - Hook for geo-fence trigger management
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { GeoFenceTrigger } from '@features/offers/types';

interface UseGeoFenceOptions {
  offerId: number;
  autoLoad?: boolean;
}

interface UseGeoFenceReturn {
  triggers: GeoFenceTrigger[];
  loading: boolean;
  error: string | null;
  fetchTriggers: () => Promise<void>;
  createTrigger: (data: Omit<GeoFenceTrigger, 'id' | 'offer_id' | 'created_at'>) => Promise<GeoFenceTrigger | null>;
  deleteTrigger: (triggerId: number) => Promise<boolean>;
  updateTrigger: (triggerId: number, data: Partial<GeoFenceTrigger>) => Promise<boolean>;
}

export function useGeoFence({
  offerId,
  autoLoad = true,
}: UseGeoFenceOptions): UseGeoFenceReturn {
  const [triggers, setTriggers] = useState<GeoFenceTrigger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTriggers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${offerId}/geo-trigger`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch geo-fence triggers');
      }

      const data = await response.json();
      setTriggers(data.triggers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  const createTrigger = useCallback(async (
    data: Omit<GeoFenceTrigger, 'id' | 'offer_id' | 'created_at'>
  ): Promise<GeoFenceTrigger | null> => {
    try {
      const response = await fetch(`/api/offers/${offerId}/geo-trigger`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create geo-fence trigger');
      }

      const result = await response.json();
      await fetchTriggers();
      return result.trigger;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [offerId, fetchTriggers]);

  const deleteTrigger = useCallback(async (triggerId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/offers/${offerId}/geo-trigger/${triggerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete geo-fence trigger');
      }

      await fetchTriggers();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [offerId, fetchTriggers]);

  const updateTrigger = useCallback(async (
    triggerId: number,
    data: Partial<GeoFenceTrigger>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/offers/${offerId}/geo-trigger/${triggerId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update geo-fence trigger');
      }

      await fetchTriggers();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [offerId, fetchTriggers]);

  useEffect(() => {
    if (autoLoad && offerId) {
      fetchTriggers();
    }
  }, [autoLoad, offerId, fetchTriggers]);

  return {
    triggers,
    loading,
    error,
    fetchTriggers,
    createTrigger,
    deleteTrigger,
    updateTrigger,
  };
}
