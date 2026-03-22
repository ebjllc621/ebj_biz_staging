/**
 * OrganizerAnalyticsSummaryCards - 4-card summary grid for organizer analytics
 *
 * Cards: Co-Host Acceptance Rate, Exhibitor CTR, Service Fulfillment Rate, Organizer Score
 * Follows EventAnalyticsSummaryCards layout pattern exactly.
 *
 * @tier SIMPLE
 * @phase Phase 6D - Organizer Analytics
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import React from 'react';
import { Users, Store, Wrench, Trophy } from 'lucide-react';
import type { OrganizerAnalyticsData } from '@features/events/types';

export interface OrganizerAnalyticsSummaryCardsProps {
  analytics: OrganizerAnalyticsData;
}

interface OrganizerStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  bgClass: string;
  borderClass: string;
}

function OrganizerStatCard({ icon, label, value, subtext, bgClass, borderClass }: OrganizerStatCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${bgClass} ${borderClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-500 mt-1 truncate">{subtext}</p>
          )}
        </div>
        <div className="ml-3 flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function OrganizerAnalyticsSummaryCards({ analytics }: OrganizerAnalyticsSummaryCardsProps) {
  const { co_hosts, exhibitors, service_requests, organizer_score } = analytics;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Co-Host Acceptance Rate */}
      <OrganizerStatCard
        icon={<Users className="w-5 h-5 text-blue-600" />}
        label="Co-Host Acceptance"
        value={`${co_hosts.acceptance_rate.toFixed(1)}%`}
        subtext={`${co_hosts.active} active / ${co_hosts.total} total`}
        bgClass="bg-blue-50"
        borderClass="border-blue-200"
      />

      {/* Exhibitor CTR */}
      <OrganizerStatCard
        icon={<Store className="w-5 h-5 text-purple-600" />}
        label="Exhibitor CTR"
        value={`${exhibitors.click_through_rate.toFixed(1)}%`}
        subtext={`${exhibitors.total_clicks.toLocaleString()} clicks / ${exhibitors.total_impressions.toLocaleString()} impressions`}
        bgClass="bg-purple-50"
        borderClass="border-purple-200"
      />

      {/* Service Fulfillment Rate */}
      <OrganizerStatCard
        icon={<Wrench className="w-5 h-5 text-green-600" />}
        label="Service Fulfillment"
        value={`${service_requests.fulfillment_rate.toFixed(1)}%`}
        subtext={`${service_requests.fulfilled} fulfilled / ${service_requests.total - service_requests.cancelled - service_requests.draft} actionable`}
        bgClass="bg-green-50"
        borderClass="border-green-200"
      />

      {/* Organizer Score */}
      <OrganizerStatCard
        icon={<Trophy className="w-5 h-5" style={{ color: '#ed6437' }} />}
        label="Organizer Score"
        value={`${organizer_score}/100`}
        subtext="Weighted composite score"
        bgClass="bg-orange-50"
        borderClass="border-orange-200"
      />
    </div>
  );
}

export default OrganizerAnalyticsSummaryCards;
