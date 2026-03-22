/**
 * EventSharesChart - Vertical Bar Chart for Share Platform Breakdown
 *
 * @tier SIMPLE
 * @phase Phase 4 - Event Owner Analytics Dashboard
 * @authority docs/pages/layouts/events/build/3-10-26/phases/PHASE_4_EVENT_OWNER_ANALYTICS.md
 *
 * Displays share count per platform with click-through rate in tooltip
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
import type { EventSharePlatformData } from '@features/events/types';

export interface EventSharesChartProps {
  shares: EventSharePlatformData[];
}

const PLATFORM_COLORS = ['#ed6437', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: EventSharePlatformData & { label: string };
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm"
      style={{ minWidth: 140 }}
    >
      <p className="font-semibold text-gray-900 mb-1 capitalize">{label}</p>
      <p className="text-gray-600">Shares: <span className="font-medium text-gray-900">{data.shares.toLocaleString()}</span></p>
      <p className="text-gray-600">Clicks: <span className="font-medium text-gray-900">{data.clicks.toLocaleString()}</span></p>
      <p className="text-gray-600">CTR: <span className="font-medium text-gray-900">{(data.clickRate * 100).toFixed(1)}%</span></p>
    </div>
  );
}

export function EventSharesChart({ shares }: EventSharesChartProps) {
  const hasData = shares.length > 0 && shares.some(s => s.shares > 0);

  // Capitalize platform names for display
  const chartData = shares
    .filter(s => s.shares > 0)
    .map(s => ({
      ...s,
      label: s.platform.charAt(0).toUpperCase() + s.platform.slice(1)
    }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Shares by Platform</h3>
      <p className="text-sm text-gray-500 mb-4">All-time share distribution across platforms</p>

      {!hasData ? (
        <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">
          No shares recorded yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 60, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="shares" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length] ?? '#ed6437'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default EventSharesChart;
