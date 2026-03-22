/**
 * NetworkPerformancePanel - Horizontal bar chart of revenue by affiliate network
 *
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 9A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9A_AFFILIATE_MARKETER_CAMPAIGN_ANALYTICS.md
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
} from 'recharts';

export interface NetworkPerformancePanelProps {
  data: Array<{ network: string; campaigns: number; conversions: number; revenue: number }>;
}

interface TooltipPayloadItem {
  payload?: { campaigns?: number; conversions?: number; revenue?: number };
}

function NetworkTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        padding: '10px 14px',
        fontSize: '13px',
      }}
    >
      <p style={{ color: '#374151', fontWeight: 600, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#6b7280' }}>Campaigns: {d?.campaigns ?? 0}</p>
      <p style={{ color: '#6b7280' }}>Conversions: {d?.conversions ?? 0}</p>
      <p style={{ color: '#6b7280' }}>Revenue: ${(d?.revenue ?? 0).toFixed(2)}</p>
    </div>
  );
}

export function NetworkPerformancePanel({ data }: NetworkPerformancePanelProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Performance</h3>
      {data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
          No network data available.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(v: number) => `$${v}`}
            />
            <YAxis
              type="category"
              dataKey="network"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              width={90}
            />
            <Tooltip content={<NetworkTooltip />} />
            <Bar dataKey="revenue" name="Revenue" fill="#ed6437" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default NetworkPerformancePanel;
