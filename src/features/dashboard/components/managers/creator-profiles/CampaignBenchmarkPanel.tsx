/**
 * CampaignBenchmarkPanel - Category benchmark comparison card
 *
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 9A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9A_AFFILIATE_MARKETER_CAMPAIGN_ANALYTICS.md
 */
'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface CampaignBenchmarkPanelProps {
  benchmark: {
    avgConversionRate: number;
    avgRating: number;
    avgContactCount: number;
    marketerRank: number;
    totalInCategory: number;
  };
  ownConversionRate: number;
}

interface ComparisonRowProps {
  label: string;
  ownValue: number;
  avgValue: number;
  suffix?: string;
  decimals?: number;
}

function ComparisonRow({ label, ownValue, avgValue, suffix = '', decimals = 1 }: ComparisonRowProps) {
  const diff = ownValue - avgValue;
  const isAbove = diff > 0;
  const isBelow = diff < 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">Category avg: {avgValue.toFixed(decimals)}{suffix}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-gray-900">
          {ownValue.toFixed(decimals)}{suffix}
        </span>
        {isAbove && (
          <span className="flex items-center text-green-600 text-xs font-medium">
            <ArrowUp className="w-3.5 h-3.5" />
            +{Math.abs(diff).toFixed(decimals)}{suffix}
          </span>
        )}
        {isBelow && (
          <span className="flex items-center text-red-500 text-xs font-medium">
            <ArrowDown className="w-3.5 h-3.5" />
            -{Math.abs(diff).toFixed(decimals)}{suffix}
          </span>
        )}
        {!isAbove && !isBelow && (
          <span className="flex items-center text-gray-400 text-xs">
            <Minus className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

export function CampaignBenchmarkPanel({ benchmark, ownConversionRate }: CampaignBenchmarkPanelProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Your Performance vs Category Average
      </h3>

      <div>
        <ComparisonRow
          label="Conversion Rate"
          ownValue={ownConversionRate}
          avgValue={benchmark.avgConversionRate}
          suffix="%"
          decimals={2}
        />
        <ComparisonRow
          label="Avg Rating"
          ownValue={benchmark.avgRating}
          avgValue={benchmark.avgRating}
          decimals={1}
        />
        <ComparisonRow
          label="Contact Count"
          ownValue={benchmark.avgContactCount}
          avgValue={benchmark.avgContactCount}
          decimals={0}
        />
      </div>

      {/* Rank badge */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-[#ed6437] font-bold text-base">
            #{benchmark.marketerRank}
          </span>
          <span className="text-gray-600">
            of <span className="font-semibold text-gray-900">{benchmark.totalInCategory}</span> affiliate marketers
          </span>
        </div>
      </div>
    </div>
  );
}

export default CampaignBenchmarkPanel;
