/**
 * CampaignAnalyticsSummaryCards - KPI Summary Cards for Campaign Analytics
 *
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 9A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9A_AFFILIATE_MARKETER_CAMPAIGN_ANALYTICS.md
 *
 * Displays 7 campaign KPI cards: Impressions, Clicks, Conversions, Revenue,
 * Avg Conversion Rate, Avg ROI, Active Campaigns
 * Replicates ProfileAnalyticsSummaryCards pattern exactly
 */
'use client';

import React from 'react';
import { Eye, MousePointer, Target, DollarSign, TrendingUp, BarChart3, FolderOpen } from 'lucide-react';
import { ListingStatCard } from '@features/dashboard/components/ListingStatCard';
import type { CampaignAnalyticsData } from '@features/content/hooks/useCampaignAnalyticsDashboard';

export interface CampaignAnalyticsSummaryCardsProps {
  data: CampaignAnalyticsData;
}

export function CampaignAnalyticsSummaryCards({ data }: CampaignAnalyticsSummaryCardsProps) {
  const { campaignKpis } = data;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {/* Impressions */}
      <ListingStatCard
        title="Impressions"
        value={campaignKpis.totalImpressions}
        icon={Eye}
        variant="blue"
        subtitle="total views"
      />

      {/* Clicks */}
      <ListingStatCard
        title="Clicks"
        value={campaignKpis.totalClicks}
        icon={MousePointer}
        variant="green"
        subtitle="link clicks"
      />

      {/* Conversions */}
      <ListingStatCard
        title="Conversions"
        value={campaignKpis.totalConversions}
        icon={Target}
        variant="orange"
        subtitle="total conversions"
      />

      {/* Revenue */}
      <ListingStatCard
        title="Revenue"
        value={campaignKpis.totalRevenue}
        icon={DollarSign}
        variant="purple"
        subtitle="total earned"
        decimals={2}
      />

      {/* Avg Conversion Rate */}
      <ListingStatCard
        title="Conv. Rate"
        value={campaignKpis.avgConversionRate}
        icon={TrendingUp}
        variant="blue"
        subtitle="click to conversion"
        decimals={2}
      />

      {/* Avg ROI */}
      <ListingStatCard
        title="Avg ROI"
        value={campaignKpis.avgROI}
        icon={BarChart3}
        variant="green"
        subtitle="per click"
        decimals={2}
      />

      {/* Active Campaigns */}
      <ListingStatCard
        title="Campaigns"
        value={campaignKpis.activeCampaigns}
        icon={FolderOpen}
        variant="orange"
        subtitle="in period"
      />
    </div>
  );
}

export default CampaignAnalyticsSummaryCards;
