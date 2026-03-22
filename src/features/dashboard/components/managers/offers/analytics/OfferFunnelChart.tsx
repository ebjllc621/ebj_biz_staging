/**
 * OfferFunnelChart - Analytics funnel visualization for offers
 *
 * @tier ADVANCED
 * @phase Offers Phase 1 - Analytics Dashboard Visualization
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
  Cell
} from 'recharts';
import type { AnalyticsFunnel } from '@features/offers/types';

export interface OfferFunnelChartProps {
  funnel: AnalyticsFunnel;
}

const FUNNEL_COLORS = ['#c94e22', '#d9572b', '#ed6437', '#f07e56', '#f59272'];

export function OfferFunnelChart({ funnel }: OfferFunnelChartProps) {
  const hasData =
    funnel.stages.impressions > 0 ||
    funnel.stages.pageViews > 0 ||
    funnel.stages.engagements > 0 ||
    funnel.stages.claims > 0 ||
    funnel.stages.redemptions > 0;

  const chartData = [
    { label: 'Impressions', value: funnel.stages.impressions },
    { label: 'Page Views', value: funnel.stages.pageViews },
    { label: 'Engagements', value: funnel.stages.engagements },
    { label: 'Claims', value: funnel.stages.claims },
    { label: 'Redemptions', value: funnel.stages.redemptions }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Analytics Funnel</h3>
      <p className="text-sm text-gray-500 mb-4">All-time engagement funnel for this offer</p>
      {!hasData ? (
        <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">
          No analytics data recorded yet
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
                formatter={(value: number | undefined) => [
                  (value ?? 0).toLocaleString(),
                  'Count'
                ]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index] ?? '#ed6437'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">View Rate</p>
              <p className="text-sm font-semibold text-gray-800">
                {funnel.conversionRates.impressionToView.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Claim Rate</p>
              <p className="text-sm font-semibold text-gray-800">
                {funnel.conversionRates.viewToClaim.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Redemption Rate</p>
              <p className="text-sm font-semibold text-gray-800">
                {funnel.conversionRates.claimToRedemption.toFixed(1)}%
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OfferFunnelChart;
