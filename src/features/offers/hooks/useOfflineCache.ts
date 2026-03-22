/**
 * useOfflineCache - Hook for offline claim caching
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { OfflineCacheData } from '@features/offers/types';

interface UseOfflineCacheReturn {
  cachedClaims: OfflineCacheData[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  cacheClaimForOffline: (claimId: number) => Promise<boolean>;
  removeCachedClaim: (claimId: number) => void;
  validateOfflineClaim: (cacheData: OfflineCacheData) => Promise<boolean>;
  clearExpiredClaims: () => void;
  syncCachedClaims: () => Promise<void>;
}

const STORAGE_KEY = 'offlineClaims';

export function useOfflineCache(): UseOfflineCacheReturn {
  const [cachedClaims, setCachedClaims] = useState<OfflineCacheData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Load cached claims from localStorage
  const loadCachedClaims = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const claims = JSON.parse(stored) as OfflineCacheData[];
        // Filter out expired claims
        const validClaims = claims.filter((claim) => {
          const expiresAt = new Date(claim.expires_at).getTime();
          return expiresAt > Date.now();
        });
        setCachedClaims(validClaims);
        // Update storage with filtered claims
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validClaims));
      }
    } catch {
      setCachedClaims([]);
    }
  }, []);

  // Save claims to localStorage
  const saveCachedClaims = useCallback((claims: OfflineCacheData[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
      setCachedClaims(claims);
    } catch (err) {
      setError('Failed to save to local storage');
    }
  }, []);

  const cacheClaimForOffline = useCallback(async (claimId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/claims/${claimId}/offline-cache`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to cache claim for offline');
      }

      const data = await response.json();
      const cacheData = data.cacheData as OfflineCacheData;

      // Add to local storage
      const updatedClaims = [...cachedClaims, cacheData];
      saveCachedClaims(updatedClaims);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, [cachedClaims, saveCachedClaims]);

  const removeCachedClaim = useCallback((claimId: number) => {
    const updatedClaims = cachedClaims.filter((c) => c.claim_id !== claimId);
    saveCachedClaims(updatedClaims);
  }, [cachedClaims, saveCachedClaims]);

  const validateOfflineClaim = useCallback(async (
    cacheData: OfflineCacheData
  ): Promise<boolean> => {
    if (!isOnline) {
      // When offline, trust the cached data
      const expiresAt = new Date(cacheData.expires_at).getTime();
      return expiresAt > Date.now();
    }

    try {
      const response = await fetch('/api/claims/offline-validate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_id: cacheData.claim_id,
          promo_code: cacheData.promo_code,
          cached_at: cacheData.cached_at,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid || false;
    } catch {
      // If network fails, trust cache if not expired
      const expiresAt = new Date(cacheData.expires_at).getTime();
      return expiresAt > Date.now();
    }
  }, [isOnline]);

  const clearExpiredClaims = useCallback(() => {
    const validClaims = cachedClaims.filter((claim) => {
      const expiresAt = new Date(claim.expires_at).getTime();
      return expiresAt > Date.now();
    });
    saveCachedClaims(validClaims);
  }, [cachedClaims, saveCachedClaims]);

  const syncCachedClaims = useCallback(async () => {
    if (!isOnline || cachedClaims.length === 0) return;

    // Validate all cached claims against server
    const validatedClaims: OfflineCacheData[] = [];

    for (const claim of cachedClaims) {
      const isValid = await validateOfflineClaim(claim);
      if (isValid) {
        validatedClaims.push(claim);
      }
    }

    saveCachedClaims(validatedClaims);
  }, [isOnline, cachedClaims, validateOfflineClaim, saveCachedClaims]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached claims on mount
  useEffect(() => {
    loadCachedClaims();
  }, [loadCachedClaims]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncCachedClaims();
    }
  }, [isOnline, syncCachedClaims]);

  return {
    cachedClaims,
    loading,
    error,
    isOnline,
    cacheClaimForOffline,
    removeCachedClaim,
    validateOfflineClaim,
    clearExpiredClaims,
    syncCachedClaims,
  };
}
