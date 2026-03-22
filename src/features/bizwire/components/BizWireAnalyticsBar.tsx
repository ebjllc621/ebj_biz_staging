/**
 * BizWireAnalyticsBar - Quick stats bar for listing managers
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.9
 * @tier SIMPLE
 */

'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Mail, BarChart2, Clock } from 'lucide-react';
import type { BizWireAnalyticsSummary } from '../types';

interface BizWireAnalyticsBarProps {
  listingId: number;
}

export function BizWireAnalyticsBar({ listingId }: BizWireAnalyticsBarProps) {
  const [analytics, setAnalytics] = useState<BizWireAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!listingId) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/listings/${listingId}/bizwire/analytics`, {
          credentials: 'include'
        });
        const json = await response.json();
        if (json.success) {
          setAnalytics(json.data as BizWireAnalyticsSummary);
        }
      } catch {
        // Silent fail — analytics is supplementary
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [listingId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-6 bg-white border border-gray-200 rounded-lg px-4 py-2.5 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 w-24 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const stats = [
    { icon: MessageSquare, label: 'Total', value: analytics.total_messages, color: 'text-blue-600' },
    { icon: Mail, label: 'Unread', value: analytics.unread_messages, color: 'text-orange-600' },
    { icon: BarChart2, label: 'Threads', value: analytics.total_threads, color: 'text-purple-600' },
    {
      icon: Clock,
      label: 'Avg Response',
      value: analytics.avg_response_time_hours > 0 ? `${analytics.avg_response_time_hours.toFixed(1)}h` : 'N/A',
      color: 'text-green-600'
    }
  ];

  return (
    <div className="flex items-center gap-6 bg-white border border-gray-200 rounded-lg px-4 py-2.5 overflow-x-auto">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-1.5 flex-shrink-0">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs text-gray-500">{label}</span>
          <span className="text-sm font-semibold text-gray-900">{value}</span>
        </div>
      ))}
      {analytics.response_rate > 0 && (
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
          <span className="text-xs text-gray-500">Response Rate</span>
          <span className="text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
            {Math.round(analytics.response_rate)}%
          </span>
        </div>
      )}
    </div>
  );
}
