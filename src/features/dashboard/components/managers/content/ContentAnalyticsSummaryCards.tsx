/**
 * ContentAnalyticsSummaryCards - KPI Summary Cards for Content Analytics
 *
 * @tier SIMPLE
 * @phase Content Phase 5B
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_5B_CONTENT_ANALYTICS_SEO_PREVIEW.md
 *
 * Displays key metrics: total views, engagements, comments, engagement rate
 */
'use client';

import React from 'react';
import { Eye, MousePointer, MessageCircle, Activity } from 'lucide-react';
import { ListingStatCard } from '@features/dashboard/components/ListingStatCard';

export interface ContentAnalyticsSummaryData {
  totalViews: number;
  totalEngagements: number;
  totalComments: number;
  engagementRate: number;
}

export interface ContentAnalyticsSummaryCardsProps {
  data: ContentAnalyticsSummaryData;
}

export function ContentAnalyticsSummaryCards({ data }: ContentAnalyticsSummaryCardsProps) {
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

      {/* Total Engagements */}
      <ListingStatCard
        title="Engagements"
        value={data.totalEngagements}
        icon={MousePointer}
        variant="green"
        subtitle="content interactions"
      />

      {/* Total Comments */}
      <ListingStatCard
        title="Comments"
        value={data.totalComments}
        icon={MessageCircle}
        variant="purple"
        subtitle="active comments"
      />

      {/* Engagement Rate */}
      <ListingStatCard
        title="Engagement Rate"
        value={data.engagementRate}
        icon={Activity}
        variant="orange"
        subtitle="engagements / views"
        decimals={1}
      />
    </div>
  );
}

export default ContentAnalyticsSummaryCards;
