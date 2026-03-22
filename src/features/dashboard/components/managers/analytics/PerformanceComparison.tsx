/**
 * PerformanceComparison - Listing vs Category Average Benchmarking
 *
 * @description Side-by-side bar charts comparing listing metrics to category averages
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 5B - Advanced Analytics
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5B_BRAIN_PLAN.md
 * @reference src/features/dashboard/components/managers/analytics/SourcesChart.tsx
 *
 * USAGE:
 * Rendered in AnalyticsManager after CrossFeatureEngagementPanel.
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface ComparisonData {
  listingMetrics: { views: number; engagements: number; conversions: number };
  categoryMetrics: { views: number; engagements: number; conversions: number; listingCount: number };
  categoryName: string;
}

interface PerformanceComparisonProps {
  listingId: number;
}

function PerformanceComparisonContent({ listingId }: PerformanceComparisonProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/listings/${listingId}/analytics/comparison`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load comparison data');
      const result = await res.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void fetchComparison();
  }, [fetchComparison]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error || 'No comparison data available'}</span>
        </div>
      </div>
    );
  }

  const chartData = [
    {
      metric: 'Views',
      'Your Listing': data.listingMetrics.views,
      'Category Avg': data.categoryMetrics.views,
    },
    {
      metric: 'Engagements',
      'Your Listing': data.listingMetrics.engagements,
      'Category Avg': data.categoryMetrics.engagements,
    },
    {
      metric: 'Conversions',
      'Your Listing': data.listingMetrics.conversions,
      'Category Avg': data.categoryMetrics.conversions,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-[#ed6437]" />
        <h3 className="text-lg font-semibold text-gray-900">Performance Comparison</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Your listing vs. {data.categoryName} average ({data.categoryMetrics.listingCount} listings) — Last 30 days
      </p>

      {chartData.every(d => d['Your Listing'] === 0 && d['Category Avg'] === 0) ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
          No analytics data available for the last 30 days
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="metric" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Bar dataKey="Your Listing" fill="#ed6437" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Category Avg" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function PerformanceComparison(props: PerformanceComparisonProps) {
  return (
    <ErrorBoundary componentName="PerformanceComparison">
      <PerformanceComparisonContent {...props} />
    </ErrorBoundary>
  );
}
