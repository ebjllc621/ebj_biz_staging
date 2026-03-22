/**
 * EventAnalyticsSummaryCards - 4-card summary grid for event analytics
 *
 * @tier SIMPLE
 * @phase Phase 4 - Event Owner Analytics Dashboard
 * @authority docs/pages/layouts/events/build/3-10-26/phases/PHASE_4_EVENT_OWNER_ANALYTICS.md
 *
 * Cards: Page Views, RSVPs (with conversion), Total Shares, Referrals
 * Orange accent (#ed6437) for icons
 */
'use client';

import React from 'react';
import { Eye, Users, Share2, UserPlus } from 'lucide-react';
import type { EventAnalyticsFunnel } from '@features/events/types';

export interface EventAnalyticsSummaryCardsProps {
  funnel: EventAnalyticsFunnel;
  referrals: number;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
}

function SummaryCard({ icon, label, value, subtext }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtext && (
            <p className="text-xs text-gray-400 mt-1">{subtext}</p>
          )}
        </div>
        <div className="p-2 bg-orange-50 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function EventAnalyticsSummaryCards({ funnel, referrals }: EventAnalyticsSummaryCardsProps) {
  const rsvpConversionRate = funnel.page_views > 0
    ? ((funnel.rsvps / funnel.page_views) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        icon={<Eye className="w-5 h-5" style={{ color: '#ed6437' }} />}
        label="Page Views"
        value={funnel.page_views}
      />
      <SummaryCard
        icon={<Users className="w-5 h-5" style={{ color: '#ed6437' }} />}
        label="RSVPs"
        value={funnel.rsvps}
        subtext={`${rsvpConversionRate}% conversion`}
      />
      <SummaryCard
        icon={<Share2 className="w-5 h-5" style={{ color: '#ed6437' }} />}
        label="Total Shares"
        value={funnel.shares}
      />
      <SummaryCard
        icon={<UserPlus className="w-5 h-5" style={{ color: '#ed6437' }} />}
        label="Referrals"
        value={referrals}
      />
    </div>
  );
}

export default EventAnalyticsSummaryCards;
