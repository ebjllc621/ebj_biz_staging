/**
 * ProfileAnalyticsSummaryCards - KPI Summary Cards for Profile Analytics
 *
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 8C
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_8C_PROFILE_ANALYTICS_SEO_PREVIEW.md
 *
 * Displays key metrics: profile views, contact requests, response rate, avg rating
 * Replicates ContentAnalyticsSummaryCards pattern exactly
 */
'use client';

import React from 'react';
import { Eye, Mail, Activity, Star, Share2 } from 'lucide-react';
import { ListingStatCard } from '@features/dashboard/components/ListingStatCard';
import type { ProfileAnalyticsData } from '@features/content/hooks/useProfileAnalyticsDashboard';

export interface ProfileAnalyticsSummaryCardsProps {
  data: ProfileAnalyticsData;
}

export function ProfileAnalyticsSummaryCards({ data }: ProfileAnalyticsSummaryCardsProps) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile Views */}
        <ListingStatCard
          title="Profile Views"
          value={data.kpis.viewCount}
          icon={Eye}
          variant="blue"
          subtitle="all time"
        />

        {/* Contact Requests */}
        <ListingStatCard
          title="Contact Requests"
          value={data.kpis.contactCount}
          icon={Mail}
          variant="green"
          subtitle="all time"
        />

        {/* Response Rate */}
        <ListingStatCard
          title="Response Rate"
          value={data.kpis.responseRate}
          icon={Activity}
          variant="orange"
          subtitle="% of contacts replied"
          decimals={1}
        />

        {/* Average Rating */}
        <ListingStatCard
          title="Avg Rating"
          value={data.kpis.ratingAverage}
          icon={Star}
          variant="purple"
          subtitle={`${data.kpis.ratingCount} reviews`}
          decimals={1}
        />
      </div>

      {/* Recommendation count badge */}
      {data.kpis.recommendationCount > 0 && (
        <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
          <Share2 className="w-4 h-4 text-[#ed6437]" />
          <span>
            {data.kpis.recommendationCount} recommendation
            {data.kpis.recommendationCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default ProfileAnalyticsSummaryCards;
