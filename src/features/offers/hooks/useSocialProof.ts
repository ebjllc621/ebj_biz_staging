/**
 * useSocialProof - Hook for social proof data (trending, connections)
 *
 * @hook Client Hook
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

interface SocialProofData {
  isTrending: boolean;
  trendingRank?: number;
  recentClaimsCount: number;
  connectionsClaimed: number;
  connectionNames: string[];
  totalClaims: number;
}

interface UseSocialProofOptions {
  offerId: number;
  autoLoad?: boolean;
}

interface UseSocialProofReturn {
  data: SocialProofData | null;
  loading: boolean;
  error: string | null;
  fetchSocialProof: () => Promise<void>;
}

export function useSocialProof({
  offerId,
  autoLoad = true,
}: UseSocialProofOptions): UseSocialProofReturn {
  const [data, setData] = useState<SocialProofData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSocialProof = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${offerId}/social-proof`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch social proof data');
      }

      const result = await response.json();
      setData({
        isTrending: result.isTrending || false,
        trendingRank: result.trendingRank,
        recentClaimsCount: result.recentClaimsCount || 0,
        connectionsClaimed: result.connectionsClaimed || 0,
        connectionNames: result.connectionNames || [],
        totalClaims: result.totalClaims || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (autoLoad && offerId) {
      fetchSocialProof();
    }
  }, [autoLoad, offerId, fetchSocialProof]);

  return {
    data,
    loading,
    error,
    fetchSocialProof,
  };
}
