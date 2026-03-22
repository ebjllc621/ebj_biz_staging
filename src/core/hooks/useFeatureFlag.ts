/**
 * useFeatureFlag Hook - Client-Side Feature Flag Evaluation
 *
 * @authority PHASE_6.1_BRAIN_PLAN.md - Section 5
 * @pattern React 18 hooks with Next.js 14 App Router
 * @governance Credentials: 'include' for all requests
 *
 * PURPOSE:
 * - Evaluate feature flags on client side
 * - Cache flag states locally
 * - Integrate with useAuth for user context
 *
 * USAGE:
 * ```tsx
 * const { enabled, loading } = useFeatureFlag('premium_dark_mode');
 * if (enabled) {
 *   return <DarkModeUI />;
 * }
 * ```
 *
 * GOVERNANCE:
 * - All API calls include credentials for session cookies
 * - Cached results with configurable TTL
 * - Fail-safe: unknown flags return false
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseFeatureFlagOptions {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
  /** Force refresh on mount (default: false) */
  forceRefresh?: boolean;
}

export interface UseFeatureFlagReturn {
  /** Whether the feature is enabled */
  enabled: boolean;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Refresh the flag status */
  refresh: () => Promise<void>;
}

// ============================================================================
// GLOBAL CACHE
// ============================================================================

interface CacheEntry {
  enabled: boolean;
  timestamp: number;
}

const flagCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// useFeatureFlag HOOK IMPLEMENTATION
// ============================================================================

/**
 * useFeatureFlag Hook - Evaluate feature flags with caching
 *
 * @param flagKey Feature flag key to evaluate
 * @param options Hook options
 * @returns Feature flag state and actions
 *
 * @example
 * ```tsx
 * function PremiumFeature() {
 *   const { enabled, loading } = useFeatureFlag('premium_dark_mode');
 *
 *   if (loading) return <Spinner />;
 *   if (!enabled) return null;
 *
 *   return <DarkModeToggle />;
 * }
 * ```
 */
export function useFeatureFlag(
  flagKey: string,
  options: UseFeatureFlagOptions = {}
): UseFeatureFlagReturn {
  const { user } = useAuth();
  const { cacheTTL = DEFAULT_CACHE_TTL, forceRefresh = false } = options;

  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FETCH FLAG STATUS
  // ============================================================================

  const fetchFlagStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = flagCache.get(flagKey);
        if (cached && Date.now() - cached.timestamp < cacheTTL) {
          setEnabled(cached.enabled);
          setLoading(false);
          return;
        }
      }

      // Build query parameters
      const params = new URLSearchParams({ flag: flagKey });
      if (user?.id) {
        params.append('userId', String(user.id));
      }
      if (user?.role) {
        params.append('tier', user.role);
      }

      // Fetch from API
      const response = await fetch(`/api/feature-flags/check?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const flagEnabled = data.data?.enabled ?? false;

        setEnabled(flagEnabled);

        // Update cache
        flagCache.set(flagKey, {
          enabled: flagEnabled,
          timestamp: Date.now()
        });
      } else {
        // Fail closed: disable feature on error
        setEnabled(false);
        setError('Failed to fetch feature flag status');
      }
    } catch (err) {
      // Fail closed: disable feature on error
      setEnabled(false);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [flagKey, user, cacheTTL, forceRefresh]);

  // ============================================================================
  // INITIAL FETCH
  // ============================================================================

  useEffect(() => {
    fetchFlagStatus();
  }, [fetchFlagStatus]);

  // ============================================================================
  // REFRESH FUNCTION
  // ============================================================================

  const refresh = useCallback(async () => {
    // Clear cache for this flag
    flagCache.delete(flagKey);
    await fetchFlagStatus();
  }, [flagKey, fetchFlagStatus]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    enabled,
    loading,
    error,
    refresh
  };
}

// ============================================================================
// BATCH FLAG EVALUATION
// ============================================================================

/**
 * useFeatureFlags Hook - Evaluate multiple feature flags at once
 *
 * @param flagKeys Array of flag keys to evaluate
 * @returns Map of flag key to enabled status
 *
 * @example
 * ```tsx
 * const flags = useFeatureFlags(['dark_mode', 'beta_analytics']);
 * if (flags.dark_mode) {
 *   // Enable dark mode
 * }
 * ```
 */
export function useFeatureFlags(flagKeys: string[]): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const { user } = useAuth();

  useEffect(() => {
    const fetchFlags = async () => {
      const results: Record<string, boolean> = {};

      for (const flagKey of flagKeys) {
        // Check cache
        const cached = flagCache.get(flagKey);
        if (cached && Date.now() - cached.timestamp < DEFAULT_CACHE_TTL) {
          results[flagKey] = cached.enabled;
          continue;
        }

        // Fetch from API
        try {
          const params = new URLSearchParams({ flag: flagKey });
          if (user?.id) {
            params.append('userId', String(user.id));
          }
          if (user?.role) {
            params.append('tier', user.role);
          }

          const response = await fetch(`/api/feature-flags/check?${params.toString()}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            const enabled = data.data?.enabled ?? false;
            results[flagKey] = enabled;

            // Update cache
            flagCache.set(flagKey, {
              enabled,
              timestamp: Date.now()
            });
          } else {
            results[flagKey] = false;
          }
        } catch {
          results[flagKey] = false;
        }
      }

      setFlags(results);
    };

    fetchFlags();
  }, [flagKeys.join(','), user?.id, user?.role]);

  return flags;
}

// Default export
export default useFeatureFlag;
