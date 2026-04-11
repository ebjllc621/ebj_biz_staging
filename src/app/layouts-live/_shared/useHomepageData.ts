/**
 * useHomepageData - Shared hook for layouts-live variant preview pages
 *
 * Centralizes the /api/homepage/public fetch so each variant page only
 * deals with its own visual treatment. Underscored directory (_shared)
 * is excluded from Next.js App Router routing.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicHomeData } from '@features/homepage/types';

export interface HomepageDataState {
  data: PublicHomeData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useHomepageData(): HomepageDataState {
  const [data, setData] = useState<PublicHomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/homepage/public', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load homepage data');
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
