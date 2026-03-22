/**
 * JobFunnelChart - Recruitment Funnel Visualization
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Analytics Dashboard
 *
 * Displays: Impressions → Views → Saves → Applications → Hires
 * with conversion rates between each stage
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
import type { JobAnalyticsFunnel } from '@features/jobs/types';

interface JobFunnelChartProps {
  data: JobAnalyticsFunnel;
  /** Total shares count across all platforms */
  shares?: number;
  /** Total referrals/recommendations count */
  referrals?: number;
}

// 7 colors for all funnel stages including shares/referrals
const FUNNEL_COLORS = ['#ed6437', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'];

export function JobFunnelChart({ data, shares = 0, referrals = 0 }: JobFunnelChartProps) {
  const funnelData = [
    { stage: 'Impressions', value: data.impressions, rate: null },
    { stage: 'Views', value: data.page_views, rate: data.conversion_rates.view_rate },
    { stage: 'Saves', value: data.saves, rate: data.conversion_rates.save_rate },
    { stage: 'Shares', value: shares, rate: null },
    { stage: 'Referrals', value: referrals, rate: null },
    { stage: 'Applications', value: data.applications, rate: data.conversion_rates.apply_rate },
    { stage: 'Hires', value: data.hires, rate: data.conversion_rates.hire_rate }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recruitment Funnel</h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={funnelData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" />
          <YAxis dataKey="stage" type="category" stroke="#6b7280" width={100} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const data = payload[0].payload;
              const value = payload[0].value ?? 0;
              const rate = data.rate;
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="font-medium text-gray-900">{data.stage}</p>
                  <p className="text-sm text-gray-600">
                    Count: {value}{rate !== null ? ` (${rate.toFixed(1)}% conversion)` : ''}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {funnelData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index]} />
            ))}
            <LabelList dataKey="value" position="right" fill="#374151" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion Rate Summary */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ConversionRateCard label="View Rate" rate={data.conversion_rates.view_rate} />
        <ConversionRateCard label="Save Rate" rate={data.conversion_rates.save_rate} />
        <ConversionRateCard label="Apply Rate" rate={data.conversion_rates.apply_rate} />
        <ConversionRateCard label="Hire Rate" rate={data.conversion_rates.hire_rate} />
      </div>
    </div>
  );
}

function ConversionRateCard({ label, rate }: { label: string; rate: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{rate.toFixed(1)}%</p>
    </div>
  );
}

export default JobFunnelChart;
