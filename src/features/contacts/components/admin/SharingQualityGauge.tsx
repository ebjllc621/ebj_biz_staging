/**
 * SharingQualityGauge - Visual quality score gauge component
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: SIMPLE (< 100 lines, no ErrorBoundary)
 * - Client Component: 'use client'
 * - NO direct database access
 *
 * Quality Score Tiers:
 * - Excellent: 80-100 (green)
 * - Good: 60-79 (blue)
 * - Fair: 40-59 (yellow)
 * - Poor: 0-39 (red)
 *
 * @tier SIMPLE
 * @phase Phase 10 - Analytics & Admin Dashboard
 * @authority docs/components/connections/userrecommendations/phases/PHASE_10_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import React from 'react';

interface SharingQualityGaugeProps {
  score: number; // 0-100
  label?: string;
  showBreakdown?: boolean;
  breakdown?: {
    helpful_component: number;
    engagement_component: number;
    spam_component: number;
  };
}

export function SharingQualityGauge({
  score,
  label = 'Quality Score',
  showBreakdown = false,
  breakdown
}: SharingQualityGaugeProps) {
  // Determine tier and color
  const getTier = (score: number): { tier: string; color: string } => {
    if (score >= 80) return { tier: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { tier: 'Good', color: 'text-blue-600' };
    if (score >= 40) return { tier: 'Fair', color: 'text-yellow-600' };
    return { tier: 'Poor', color: 'text-red-600' };
  };

  const { tier, color } = getTier(score);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-600 mb-4">{label}</h3>

      {/* Circular gauge */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke={color.replace('text-', '#')}
              strokeWidth="8"
              strokeDasharray={`${(score / 100) * 351.86} 351.86`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${color}`}>{Math.round(score)}</span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
        </div>
      </div>

      <div className="text-center mb-4">
        <span className={`text-lg font-semibold ${color}`}>{tier}</span>
      </div>

      {/* Component breakdown */}
      {showBreakdown && breakdown && (
        <div className="space-y-2 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Helpful Rate</span>
            <span className="font-medium">{breakdown.helpful_component}/50</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Engagement</span>
            <span className="font-medium">{breakdown.engagement_component}/30</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Spam Score</span>
            <span className="font-medium">{breakdown.spam_component}/20</span>
          </div>
        </div>
      )}
    </div>
  );
}
