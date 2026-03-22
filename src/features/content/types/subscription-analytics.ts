/**
 * Subscription Analytics Types
 *
 * Supporting types for the My Subscriptions dashboard page.
 *
 * @tier STANDARD
 * @phase Phase 8 - My Subscriptions Dashboard
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier4_Phases/PHASE_8_MY_SUBSCRIPTIONS_DASHBOARD.md
 */

import type { ContentFollow } from '@core/types/content-follow';

export interface SubscriptionAnalytics {
  totalActive: number;
  byType: Record<string, number>;
  byFrequency: Record<string, number>;
  recentCount: number;
}

export interface SubscriptionListItem extends ContentFollow {
  targetName?: string;
}
