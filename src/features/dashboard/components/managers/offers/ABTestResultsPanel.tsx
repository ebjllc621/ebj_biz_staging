/**
 * ABTestResultsPanel - Panel showing A/B test results
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import type { ABTestResults } from '@features/offers/types';

interface ABTestResultsPanelProps {
  offerId: number;
  onStop?: () => void;
  onDeclareWinner?: (winner: 'a' | 'b') => void;
}

export function ABTestResultsPanel({
  offerId,
  onStop,
  onDeclareWinner,
}: ABTestResultsPanelProps) {
  const [results, setResults] = useState<ABTestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${offerId}/ab-test`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          setResults(null);
          return;
        }
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleStop = async () => {
    setStopping(true);
    try {
      const response = await fetch(`/api/offers/${offerId}/ab-test`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'stop' }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop test');
      }

      fetchResults();
      onStop?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop');
    } finally {
      setStopping(false);
    }
  };

  const handleDeclareWinner = async (winner: 'a' | 'b') => {
    try {
      const response = await fetch(`/api/offers/${offerId}/ab-test`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'declare_winner', winner }),
      });

      if (!response.ok) {
        throw new Error('Failed to declare winner');
      }

      fetchResults();
      onDeclareWinner?.(winner);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to declare winner');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-8">
        <FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No active A/B test</p>
      </div>
    );
  }

  const { variant_a, variant_b, statistical_significance, recommended_winner } = results;
  const hasWinner = recommended_winner !== 'inconclusive';
  const isSignificant = statistical_significance >= 95;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-purple-600" />
          A/B Test Results
        </h3>
        <button
          onClick={fetchResults}
          className="p-2 text-gray-400 hover:text-purple-600 rounded-lg"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Variant Comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Variant A */}
        <div className={`p-4 rounded-xl border-2 ${
          recommended_winner === 'a' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
        }`}>
          {recommended_winner === 'a' && (
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium mb-2">
              <Trophy className="w-4 h-4" />
              Winner
            </div>
          )}
          <h4 className="font-medium text-gray-900 mb-3">Variant A</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Impressions
              </span>
              <span className="font-medium">{variant_a.impressions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Claims</span>
              <span className="font-medium">{variant_a.claims}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Conversion
              </span>
              <span className="font-medium text-purple-600">
                {(variant_a.conversion_rate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Variant B */}
        <div className={`p-4 rounded-xl border-2 ${
          recommended_winner === 'b' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
        }`}>
          {recommended_winner === 'b' && (
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium mb-2">
              <Trophy className="w-4 h-4" />
              Winner
            </div>
          )}
          <h4 className="font-medium text-gray-900 mb-3">Variant B</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Impressions
              </span>
              <span className="font-medium">{variant_b.impressions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Claims</span>
              <span className="font-medium">{variant_b.claims}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Conversion
              </span>
              <span className="font-medium text-purple-600">
                {(variant_b.conversion_rate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistical Significance */}
      <div className={`p-4 rounded-lg ${
        isSignificant ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center gap-2">
          {isSignificant ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          )}
          <span className={`font-medium ${isSignificant ? 'text-green-800' : 'text-yellow-800'}`}>
            {statistical_significance}% Statistical Significance
          </span>
        </div>
        <p className={`text-sm mt-1 ${isSignificant ? 'text-green-700' : 'text-yellow-700'}`}>
          {isSignificant
            ? 'Results are statistically significant. You can confidently declare a winner.'
            : 'More data is needed to reach statistical significance (95%).'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleStop}
          disabled={stopping}
          className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {stopping ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          Stop Test
        </button>
        {hasWinner && isSignificant && (
          <button
            onClick={() => handleDeclareWinner(recommended_winner as 'a' | 'b')}
            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Apply {recommended_winner.toUpperCase()}
          </button>
        )}
      </div>
    </div>
  );
}
