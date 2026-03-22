/**
 * JobSharesChart - Social Share Performance Visualization
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Analytics Dashboard
 *
 * Displays share counts and click-through rates by social platform
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
import { Facebook, Twitter, Linkedin, Mail, Link2, MessageCircle, Send } from 'lucide-react';
import type { SharePlatformData, SharePlatform } from '@features/jobs/types';

interface JobSharesChartProps {
  data: SharePlatformData[];
}

const PLATFORM_COLORS: Record<SharePlatform, string> = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  email: '#6B7280',
  copy_link: '#ed6437',
  whatsapp: '#25D366',
  sms: '#9333EA',
  instagram: '#E4405F',
  nextdoor: '#00B246'
};

const PLATFORM_ICONS: Partial<Record<SharePlatform, React.ReactNode>> = {
  facebook: <Facebook className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  copy_link: <Link2 className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  sms: <Send className="w-4 h-4" />
};

function formatPlatformName(platform: string): string {
  return platform.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function JobSharesChart({ data }: JobSharesChartProps) {
  const totalShares = data.reduce((sum, d) => sum + d.shares, 0);
  const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
  const overallClickRate = totalShares > 0 ? (totalClicks / totalShares) * 100 : 0;

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Share Performance</h3>
        <div className="h-[200px] flex items-center justify-center text-gray-500">
          <p>No share data yet. Share your job posting to see metrics here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Social Share Performance</h3>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{totalShares}</span> shares ·
          <span className="font-medium ml-1">{totalClicks}</span> clicks ·
          <span className="font-medium ml-1">{overallClickRate.toFixed(1)}%</span> CTR
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="platform"
            stroke="#6b7280"
            tickFormatter={formatPlatformName}
          />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload[0]) return null;
              const value = payload[0].value ?? 0;
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="font-medium text-gray-900">{formatPlatformName(String(label))}</p>
                  <p className="text-sm text-gray-600">Shares: {value}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="shares" name="Shares" radius={[8, 8, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] || '#6B7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Platform breakdown */}
      <div className="mt-4 space-y-2">
        {data.map(item => (
          <div key={item.platform} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span style={{ color: PLATFORM_COLORS[item.platform] }}>
                {PLATFORM_ICONS[item.platform] || <Link2 className="w-4 h-4" />}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {formatPlatformName(item.platform)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {item.shares} shares · {item.clicks} clicks ·
              <span className="font-medium ml-1">{item.clickRate.toFixed(1)}% CTR</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JobSharesChart;
