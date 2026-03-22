/**
 * ListingFunnelChart - Engagement Funnel Visualization for Listings
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 2A - Analytics Enhancement
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2A_BRAIN_PLAN.md
 *
 * Displays: Impressions → Page Views → Engagements → Conversions → Follows
 * with conversion rates between each stage.
 *
 * Replicates JobFunnelChart pattern with listing-specific stages (5 stages, not 7).
 */
'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';

export interface ListingFunnelStage {
  stage: string;
  count: number;
  conversion_rate: number | null;
}

export interface ListingFunnelChartProps {
  data: {
    stages: ListingFunnelStage[];
    overall_conversion_rate: number;
  } | null;
  isLoading?: boolean;
}

// 5 colors for listing funnel stages
const FUNNEL_COLORS = ['#ed6437', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

// Map API stage keys to display labels
function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    impression: 'Impressions',
    page_view: 'Page Views',
    engagement: 'Engagements',
    conversion: 'Conversions',
    follow: 'Follows'
  };
  return labels[stage] ?? stage.charAt(0).toUpperCase() + stage.slice(1).replace(/_/g, ' ');
}

export function ListingFunnelChart({ data, isLoading }: ListingFunnelChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Funnel</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-[350px] bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.stages.every(s => s.count === 0)) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Funnel</h3>
        <div className="h-[200px] flex flex-col items-center justify-center text-gray-500">
          <p className="text-base font-medium">No funnel data yet.</p>
          <p className="text-sm mt-1">As your listing gets traffic, funnel data will appear here.</p>
        </div>
      </div>
    );
  }

  const funnelData = data.stages.map(s => ({
    stage: getStageLabel(s.stage),
    value: s.count,
    rate: s.conversion_rate
  }));

  // Extract conversion rates for the summary cards
  const viewRateStage = data.stages.find(s => s.stage === 'page_view');
  const engRateStage = data.stages.find(s => s.stage === 'engagement');
  const convRateStage = data.stages.find(s => s.stage === 'conversion');
  const followRateStage = data.stages.find(s => s.stage === 'follow');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Funnel</h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={funnelData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
          <YAxis dataKey="stage" type="category" stroke="#6b7280" width={110} style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const entry = payload[0].payload as { stage: string; value: number; rate: number | null };
              const value = payload[0].value ?? 0;
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="font-medium text-gray-900">{entry.stage}</p>
                  <p className="text-sm text-gray-600">
                    Count: {value}
                    {entry.rate !== null ? ` (${entry.rate.toFixed(1)}% conversion)` : ''}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {funnelData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
            ))}
            <LabelList dataKey="value" position="right" fill="#374151" style={{ fontSize: '12px' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion Rate Summary Cards */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ConversionRateCard
          label="View Rate"
          rate={viewRateStage?.conversion_rate ?? null}
        />
        <ConversionRateCard
          label="Engagement Rate"
          rate={engRateStage?.conversion_rate ?? null}
        />
        <ConversionRateCard
          label="Conversion Rate"
          rate={convRateStage?.conversion_rate ?? null}
        />
        <ConversionRateCard
          label="Follow Rate"
          rate={followRateStage?.conversion_rate ?? null}
        />
      </div>
    </div>
  );
}

function ConversionRateCard({ label, rate }: { label: string; rate: number | null }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">
        {rate !== null ? `${rate.toFixed(1)}%` : '—'}
      </p>
    </div>
  );
}

export default ListingFunnelChart;
