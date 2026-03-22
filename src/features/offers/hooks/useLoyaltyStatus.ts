/**
 * useLoyaltyStatus - Hook for user loyalty status and progress
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { LoyaltyTier, BusinessLoyaltyStatus } from '@features/offers/types';

interface UseLoyaltyStatusReturn {
  overallTier: LoyaltyTier;
  totalPoints: number;
  businessStatuses: BusinessLoyaltyStatus[];
  loading: boolean;
  error: string | null;
  fetchLoyaltyStatus: () => Promise<void>;
  getProgressToNextTier: () => { current: number; required: number; percentage: number };
}

export function useLoyaltyStatus(): UseLoyaltyStatusReturn {
  const [overallTier, setOverallTier] = useState<LoyaltyTier>('bronze');
  const [totalPoints, setTotalPoints] = useState(0);
  const [businessStatuses, setBusinessStatuses] = useState<BusinessLoyaltyStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLoyaltyStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/loyalty', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch loyalty status');
      }

      const data = await response.json();
      setOverallTier(data.tier || 'bronze');
      setTotalPoints(data.totalPoints || 0);
      setBusinessStatuses(data.businessStatuses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const getProgressToNextTier = useCallback(() => {
    const tierThresholds: Record<LoyaltyTier, { min: number; next: number | null }> = {
      new: { min: 0, next: 50 },
      bronze: { min: 50, next: 100 },
      silver: { min: 100, next: 500 },
      gold: { min: 500, next: 1000 },
      platinum: { min: 1000, next: null },
    };

    const currentThreshold = tierThresholds[overallTier];
    const required = currentThreshold.next || currentThreshold.min;
    const current = totalPoints - currentThreshold.min;
    const pointsNeeded = required - currentThreshold.min;
    const percentage = currentThreshold.next
      ? Math.min(100, Math.round((current / pointsNeeded) * 100))
      : 100;

    return {
      current,
      required: pointsNeeded,
      percentage,
    };
  }, [overallTier, totalPoints]);

  useEffect(() => {
    fetchLoyaltyStatus();
  }, [fetchLoyaltyStatus]);

  return {
    overallTier,
    totalPoints,
    businessStatuses,
    loading,
    error,
    fetchLoyaltyStatus,
    getProgressToNextTier,
  };
}
