/**
 * useABTest - Hook for A/B test management
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ABTestConfig, ABTestResults } from '@features/offers/types';

interface UseABTestOptions {
  offerId: number;
  autoLoad?: boolean;
}

interface UseABTestReturn {
  results: ABTestResults | null;
  loading: boolean;
  error: string | null;
  hasActiveTest: boolean;
  fetchResults: () => Promise<void>;
  createTest: (config: ABTestConfig) => Promise<boolean>;
  stopTest: () => Promise<boolean>;
  declareWinner: (winner: 'a' | 'b') => Promise<boolean>;
}

export function useABTest({
  offerId,
  autoLoad = true,
}: UseABTestOptions): UseABTestReturn {
  const [results, setResults] = useState<ABTestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${offerId}/ab-test`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          setResults(null);
          return;
        }
        throw new Error('Failed to fetch A/B test results');
      }

      const data = await response.json();
      setResults(data.results || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  const createTest = useCallback(async (config: ABTestConfig): Promise<boolean> => {
    try {
      const response = await fetch(`/api/offers/${offerId}/ab-test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create A/B test');
      }

      await fetchResults();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [offerId, fetchResults]);

  const stopTest = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/offers/${offerId}/ab-test`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop A/B test');
      }

      await fetchResults();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [offerId, fetchResults]);

  const declareWinner = useCallback(async (winner: 'a' | 'b'): Promise<boolean> => {
    try {
      const response = await fetch(`/api/offers/${offerId}/ab-test`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'declare_winner', winner }),
      });

      if (!response.ok) {
        throw new Error('Failed to declare winner');
      }

      await fetchResults();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [offerId, fetchResults]);

  useEffect(() => {
    if (autoLoad && offerId) {
      fetchResults();
    }
  }, [autoLoad, offerId, fetchResults]);

  return {
    results,
    loading,
    error,
    hasActiveTest: results !== null,
    fetchResults,
    createTest,
    stopTest,
    declareWinner,
  };
}
