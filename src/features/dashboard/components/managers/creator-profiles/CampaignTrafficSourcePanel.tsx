/**
 * CampaignTrafficSourcePanel - Vertical bar chart of traffic sources
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

export interface CampaignTrafficSourcePanelProps {
  data: Array<{ source: string; count: number; percentage: number }>;
}

interface TooltipPayloadItem {
  payload?: { count?: number; percentage?: number };
}

function TrafficTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
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
      <p style={{ color: '#6b7280' }}>Count: {d?.count ?? 0}</p>
      <p style={{ color: '#6b7280' }}>Share: {d?.percentage ?? 0}%</p>
    </div>
  );
}

export function CampaignTrafficSourcePanel({ data }: CampaignTrafficSourcePanelProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
      {data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
          No traffic source data available for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="source"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<TrafficTooltip />} />
            <Bar dataKey="count" name="Count" fill="#ed6437" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default CampaignTrafficSourcePanel;
