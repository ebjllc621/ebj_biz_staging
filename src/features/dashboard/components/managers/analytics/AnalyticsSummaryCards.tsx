/**
 * AnalyticsSummaryCards - KPI Summary Cards for Analytics
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Displays key metrics: total views, clicks, conversions, engagement rate
 */
'use client';

import React from 'react';
import { Eye, MousePointer, TrendingUp, Activity } from 'lucide-react';
import { ListingStatCard } from '@features/dashboard/components/ListingStatCard';

export interface AnalyticsSummaryData {
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
  engagementRate: number;
}

export interface AnalyticsSummaryCardsProps {
  /** Summary data */
  data: AnalyticsSummaryData;
}

export function AnalyticsSummaryCards({ data }: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Views */}
      <ListingStatCard
        title="Total Views"
        value={data.totalViews}
        icon={Eye}
        variant="blue"
        subtitle="in selected period"
      />

      {/* Total Clicks */}
      <ListingStatCard
        title="Total Clicks"
        value={data.totalClicks}
        icon={MousePointer}
        variant="green"
        subtitle="on listing actions"
      />

      {/* Total Conversions */}
      <ListingStatCard
        title="Conversions"
        value={data.totalConversions}
        icon={TrendingUp}
        variant="purple"
        subtitle="bookmarks, contacts"
      />

      {/* Engagement Rate */}
      <ListingStatCard
        title="Engagement Rate"
        value={data.engagementRate}
        icon={Activity}
        variant="orange"
        subtitle="click-through rate"
        decimals={1}
      />
    </div>
  );
}

export default AnalyticsSummaryCards;
