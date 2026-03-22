/**
 * ABTestResultsTable - A/B test results comparison table
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: STANDARD (requires ErrorBoundary wrapper)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - NO direct database access
 *
 * @tier STANDARD
 * @phase Phase 10 - Analytics & Admin Dashboard
 * @authority docs/components/connections/userrecommendations/phases/PHASE_10_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { FlaskConical, TrendingUp, Users } from 'lucide-react';
import { ErrorService } from '@core/services/ErrorService';

interface ABTestResult {
  test_id: string;
  feature_flag_key: string;
  variant_id: string;
  variant_name: string;
  metrics: {
    total_users: number;
    total_recommendations: number;
    avg_quality_score: number;
    helpful_rate: number;
    thank_rate: number;
    engagement_score: number;
    // Phase 10.1: Statistical significance
    p_value?: number;
    z_score?: number;
    significant?: boolean;
    confidence_interval?: {
      lower: number;
      upper: number;
      confidence_level: number;
    };
    lift_percentage?: number;
    min_sample_reached?: boolean;
  };
}

export function ABTestResultsTable() {
  const [results, setResults] = useState<ABTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/sharing/ab-tests', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load A/B test results');
      }

      const data = await response.json();
      setResults(data.data?.tests || data.tests || []);
    } catch (err) {
      ErrorService.capture('[ABTestResultsTable] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <FlaskConical className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">No A/B tests running</p>
          <p className="text-sm text-gray-500 mt-1">
            Configure feature flags to enable A/B testing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical className="w-5 h-5 text-purple-600" />
        <h2 className="text-lg font-semibold text-gray-900">A/B Test Performance</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Variant</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Users</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Recommendations</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Helpful Rate</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Thank Rate</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Quality Score</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">P-Value</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.variant_id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{result.variant_name}</span>
                    {result.variant_id === 'control' && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        Control
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      {result.metrics.total_users.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="text-right py-3 px-4 text-gray-700">
                  {result.metrics.total_recommendations.toLocaleString()}
                </td>
                <td className="text-right py-3 px-4">
                  <span className={`font-medium ${
                    result.metrics.helpful_rate > 60 ? 'text-green-600' : 'text-gray-700'
                  }`}>
                    {result.metrics.helpful_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="text-right py-3 px-4">
                  <span className={`font-medium ${
                    result.metrics.thank_rate > 20 ? 'text-green-600' : 'text-gray-700'
                  }`}>
                    {result.metrics.thank_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="text-right py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-medium text-gray-900">
                      {result.metrics.avg_quality_score.toFixed(1)}
                    </span>
                    <span className="text-gray-400">/100</span>
                  </div>
                </td>
                <td className="text-right py-3 px-4">
                  {result.metrics.p_value !== undefined ? (
                    <span className={result.metrics.p_value < 0.05 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                      {result.metrics.p_value.toFixed(3)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="text-right py-3 px-4">
                  {result.metrics.significant ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      Significant
                    </span>
                  ) : result.metrics.min_sample_reached ? (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      Not Significant
                    </span>
                  ) : result.metrics.min_sample_reached === false ? (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                      Need More Data
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Statistical Significance:</strong> Results show p-values and 95% confidence intervals.
            A p-value &lt; 0.05 indicates statistical significance.
            Minimum 30 samples per variant required.
          </div>
        </div>
      </div>
    </div>
  );
}
