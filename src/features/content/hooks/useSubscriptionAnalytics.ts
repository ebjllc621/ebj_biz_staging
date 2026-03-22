/**
 * useSubscriptionAnalytics Hook
 *
 * Computes derived analytics from a ContentFollow array.
 * Uses useMemo to avoid recomputation on unrelated renders.
 *
 * @tier STANDARD
 * @phase Phase 8 - My Subscriptions Dashboard
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier4_Phases/PHASE_8_MY_SUBSCRIPTIONS_DASHBOARD.md
 */

'use client';

import { useMemo } from 'react';
import type { ContentFollow } from '@core/types/content-follow';
import type { SubscriptionAnalytics } from '../types/subscription-analytics';

export function useSubscriptionAnalytics(subscriptions: ContentFollow[]): SubscriptionAnalytics {
  return useMemo(() => {
    const totalActive = subscriptions.length;

    const byType: Record<string, number> = {};
    for (const sub of subscriptions) {
      byType[sub.followType] = (byType[sub.followType] ?? 0) + 1;
    }

    const byFrequency: Record<string, number> = {};
    for (const sub of subscriptions) {
      byFrequency[sub.notificationFrequency] = (byFrequency[sub.notificationFrequency] ?? 0) + 1;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = subscriptions.filter(
      (sub) => new Date(sub.createdAt) >= sevenDaysAgo
    ).length;

    return { totalActive, byType, byFrequency, recentCount };
  }, [subscriptions]);
}
