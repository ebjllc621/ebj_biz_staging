/**
 * GroupAnalyticsSummaryCards
 * Displays 4 key analytics stat cards for a connection group.
 *
 * @tier SIMPLE
 * @phase Phase 4A - Group Analytics
 * @generated ComponentBuilder
 */

'use client';

import React from 'react';
import { Users, MessageCircle, BadgeCheck, TrendingUp } from 'lucide-react';
import type { GroupAnalytics } from '@features/connections/types/groups';

interface GroupAnalyticsSummaryCardsProps {
  analytics: GroupAnalytics;
}

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

export function GroupAnalyticsSummaryCards({ analytics }: GroupAnalyticsSummaryCardsProps) {
  const cards: StatCard[] = [
    {
      label: 'Members',
      value: analytics.memberCount,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Messages',
      value: analytics.totalMessages,
      icon: MessageCircle,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      label: 'Recommendations',
      value: analytics.totalRecommendations,
      icon: BadgeCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      label: 'Engagement Score',
      value: `${analytics.engagementScore}/100`,
      icon: TrendingUp,
      color: analytics.engagementScore >= 70 ? 'text-emerald-600' : analytics.engagementScore >= 30 ? 'text-yellow-600' : 'text-red-600',
      bg: analytics.engagementScore >= 70 ? 'bg-emerald-50' : analytics.engagementScore >= 30 ? 'bg-yellow-50' : 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3"
          >
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
