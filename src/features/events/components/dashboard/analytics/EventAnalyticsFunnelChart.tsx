/**
 * EventAnalyticsFunnelChart - Horizontal Bar Chart for Event Analytics Funnel
 *
 * @tier SIMPLE
 * @phase Phase 4 - Event Owner Analytics Dashboard
 * @authority docs/pages/layouts/events/build/3-10-26/phases/PHASE_4_EVENT_OWNER_ANALYTICS.md
 *
 * Displays 5 funnel metrics: impressions, page_views, saves, shares, rsvps
 * Orange theme (#ed6437) with gradient intensity
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
import type { EventAnalyticsFunnel } from '@features/events/types';

export interface EventAnalyticsFunnelChartProps {
  funnel: EventAnalyticsFunnel;
}

// Gradient intensity from darkest (impressions) to lightest (rsvps)
const FUNNEL_COLORS = ['#c94e22', '#d9572b', '#ed6437', '#f07e56', '#f59272'];

export function EventAnalyticsFunnelChart({ funnel }: EventAnalyticsFunnelChartProps) {
  const hasData =
    funnel.impressions > 0 ||
    funnel.page_views > 0 ||
    funnel.saves > 0 ||
    funnel.shares > 0 ||
    funnel.rsvps > 0;

  const chartData = [
    { label: 'Impressions', value: funnel.impressions },
    { label: 'Page Views', value: funnel.page_views },
    { label: 'Saves', value: funnel.saves },
    { label: 'Shares', value: funnel.shares },
    { label: 'RSVPs', value: funnel.rsvps }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Analytics Funnel</h3>
      <p className="text-sm text-gray-500 mb-4">All-time engagement funnel for this event</p>

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
                formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), 'Count']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index] ?? '#ed6437'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Conversion rates below chart */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">View Rate</p>
              <p className="text-sm font-semibold text-gray-800">
                {funnel.conversion_rates.view_rate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Save Rate</p>
              <p className="text-sm font-semibold text-gray-800">
                {funnel.conversion_rates.save_rate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">RSVP Rate</p>
              <p className="text-sm font-semibold text-gray-800">
                {funnel.conversion_rates.rsvp_rate.toFixed(1)}%
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default EventAnalyticsFunnelChart;
