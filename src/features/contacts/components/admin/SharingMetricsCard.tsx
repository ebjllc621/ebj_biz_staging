/**
 * SharingMetricsCard - Simple metrics display card
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: SIMPLE (< 100 lines, no ErrorBoundary)
 * - Client Component: 'use client'
 * - NO direct database access
 * - Uses Lucide icons
 *
 * @tier SIMPLE
 * @phase Phase 10 - Analytics & Admin Dashboard
 * @authority docs/components/connections/userrecommendations/phases/PHASE_10_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SharingMetricsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

export function SharingMetricsCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  trend
}: SharingMetricsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600'
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>

      <div className="text-2xl font-bold text-gray-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {subValue && (
        <div className="text-xs text-gray-500">{subValue}</div>
      )}

      {trend && (
        <div className={`text-xs font-medium mt-2 ${trendColors[trend.direction]}`}>
          {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  );
}
