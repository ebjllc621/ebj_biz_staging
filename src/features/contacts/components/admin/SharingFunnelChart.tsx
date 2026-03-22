/**
 * SharingFunnelChart - Conversion funnel visualization
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: STANDARD (requires ErrorBoundary wrapper)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - NO direct database access
 *
 * Funnel: Sent → Viewed → Rated → Helpful → Thanked
 *
 * @tier STANDARD
 * @phase Phase 10 - Analytics & Admin Dashboard
 * @authority docs/components/connections/userrecommendations/phases/PHASE_10_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import React from 'react';
import { ArrowRight, Eye, Star, ThumbsUp, MessageSquare, Send } from 'lucide-react';

interface FunnelStage {
  icon: React.ReactNode;
  label: string;
  value: number;
  rate?: number;
  color: string;
}

interface SharingFunnelChartProps {
  data: {
    sent: number;
    viewed: number;
    rated: number;
    helpful: number;
    thanked: number;
  };
  conversionRates: {
    view_rate: number;
    rating_rate: number;
    helpful_rate: number;
    thank_rate: number;
  };
}

export function SharingFunnelChart({ data, conversionRates }: SharingFunnelChartProps) {
  const stages: FunnelStage[] = [
    {
      icon: <Send className="w-5 h-5" />,
      label: 'Sent',
      value: data.sent,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      icon: <Eye className="w-5 h-5" />,
      label: 'Viewed',
      value: data.viewed,
      rate: conversionRates.view_rate,
      color: 'bg-green-50 text-green-600'
    },
    {
      icon: <Star className="w-5 h-5" />,
      label: 'Rated',
      value: data.rated,
      rate: conversionRates.rating_rate,
      color: 'bg-purple-50 text-purple-600'
    },
    {
      icon: <ThumbsUp className="w-5 h-5" />,
      label: 'Helpful',
      value: data.helpful,
      rate: conversionRates.helpful_rate,
      color: 'bg-orange-50 text-orange-600'
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: 'Thanked',
      value: data.thanked,
      rate: conversionRates.thank_rate,
      color: 'bg-pink-50 text-pink-600'
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h2>

      {/* Desktop view */}
      <div className="hidden lg:flex items-center justify-between gap-2">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.label}>
            <div className="flex-1 text-center min-w-[100px]">
              <div className={`inline-flex items-center justify-center p-3 rounded-lg mb-2 ${stage.color}`}>
                {stage.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stage.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">{stage.label}</div>
              {stage.rate !== undefined && (
                <div className={`text-xs font-medium mt-1 ${stage.rate >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                  {stage.rate.toFixed(1)}%
                </div>
              )}
            </div>
            {index < stages.length - 1 && (
              <div className="text-gray-300">
                <ArrowRight className="w-5 h-5" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile view */}
      <div className="lg:hidden space-y-3">
        {stages.map((stage, index) => (
          <div key={stage.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stage.color}`}>
                {stage.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{stage.label}</div>
                {stage.rate !== undefined && (
                  <div className="text-xs text-gray-500">{stage.rate.toFixed(1)}% conversion</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">{stage.value.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall conversion */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        <span className="text-sm text-gray-600">Overall Conversion (Sent → Thanked): </span>
        <span className="text-lg font-semibold text-[#ed6437]">
          {data.sent > 0 ? ((data.thanked / data.sent) * 100).toFixed(2) : 0}%
        </span>
      </div>
    </div>
  );
}
