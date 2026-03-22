/**
 * OfferDemographicsPanel - Anonymized audience demographics for offers
 *
 * @tier ADVANCED
 * @phase Offers Phase 1 - Analytics Dashboard Visualization
 */

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAnalyticsDemographics } from '@features/offers/hooks/useAnalyticsDemographics';

export interface OfferDemographicsPanelProps {
  offerId: number;
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export function OfferDemographicsPanel({ offerId }: OfferDemographicsPanelProps) {
  const { demographics, isLoading, error } = useAnalyticsDemographics(offerId);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Audience Demographics</h3>
      <p className="text-sm text-gray-500 mb-4">Anonymized claimer insights</p>

      {isLoading ? (
        <div className="h-[160px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
        </div>
      ) : error ? (
        <div className="h-[160px] flex items-center justify-center text-red-500 text-sm">
          {error}
        </div>
      ) : !demographics ? (
        <div className="h-[160px] flex items-center justify-center text-gray-500 text-sm">
          No demographics data available yet
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="Total Claimers"
              value={demographics.totalClaimers.toLocaleString()}
            />
            <StatCard
              label="New Users"
              value={`${demographics.newVsReturning.newUserPercentage.toFixed(1)}%`}
            />
            <StatCard
              label="Repeat Claimers"
              value={demographics.claimFrequency.repeatClaimers.toLocaleString()}
            />
            <StatCard
              label="Avg Claims/User"
              value={demographics.claimFrequency.averageClaimsPerUser.toFixed(1)}
            />
            <StatCard
              label="High Engagement"
              value={demographics.engagementLevel.highEngagement.toLocaleString()}
            />
            <StatCard
              label="Medium Engagement"
              value={demographics.engagementLevel.mediumEngagement.toLocaleString()}
            />
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Demographics are anonymized and aggregated
          </p>
        </>
      )}
    </div>
  );
}

export default OfferDemographicsPanel;
